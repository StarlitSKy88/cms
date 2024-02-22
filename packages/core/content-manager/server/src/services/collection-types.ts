import { omit } from 'lodash/fp';
import { contentTypes, sanitize, errors } from '@strapi/utils';
import type { LoadedStrapi as Strapi, Common, Schema, Documents } from '@strapi/types';
import { getService } from '../utils';
import {
  getDeepPopulate,
  getDeepPopulateDraftCount,
  isWebhooksPopulateRelationsEnabled,
} from './utils/populate';
import { sumDraftCounts } from './utils/draft';
import { ALLOWED_WEBHOOK_EVENTS } from '../constants';

const { ApplicationError } = errors;
const { ENTRY_PUBLISH, ENTRY_UNPUBLISH } = ALLOWED_WEBHOOK_EVENTS;
const { PUBLISHED_AT_ATTRIBUTE } = contentTypes.constants;
const omitPublishedAtField = omit(PUBLISHED_AT_ATTRIBUTE);

type DocService = Documents.CollectionTypeInstance;
type DocServiceParams<TAction extends keyof DocService> = Parameters<DocService[TAction]>;
export type Document = Documents.Result<Common.UID.SingleType>;

const emitEvent = async (uid: Common.UID.ContentType, event: string, document: Document) => {
  const modelDef = strapi.getModel(uid);
  const sanitizedDocument = await sanitize.sanitizers.defaultSanitizeOutput(modelDef, document);

  strapi.eventHub.emit(event, {
    model: modelDef.modelName,
    entry: sanitizedDocument,
  });
};

const buildDeepPopulate = (uid: Common.UID.CollectionType) => {
  // User can configure to populate relations, so downstream services can use them.
  // They will be transformed into counts later if this is set to true.

  return getService('populate-builder')(uid)
    .populateDeep(Infinity)
    .countRelationsIf(!isWebhooksPopulateRelationsEnabled())
    .build();
};

const collectionTypes = ({ strapi }: { strapi: Strapi }) => {
  const docService = strapi.documents<Schema.CollectionType>;

  return {
    async find(opts: DocServiceParams<'findMany'>[0], uid: Common.UID.CollectionType) {
      const params = { ...opts, populate: getDeepPopulate(uid) } as typeof opts;
      return docService(uid).findMany(params);
    },

    async findPage(opts: DocServiceParams<'findMany'>[0], uid: Common.UID.CollectionType) {
      // Pagination
      const page = Number(opts?.page) || 1;
      const pageSize = Number(opts?.pageSize) || 10;

      const [documents, total = 0] = await Promise.all([
        docService(uid).findMany(opts),
        docService(uid).count(opts),
      ]);

      return {
        results: documents,
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total! / pageSize),
          total,
        },
      };
    },

    async findOne(id: string, uid: Common.UID.CollectionType, opts = {}) {
      return docService(uid).findOne(id, opts);
    },

    async create(uid: Common.UID.CollectionType, opts: DocServiceParams<'create'>[0] = {} as any) {
      const populate = opts.populate ?? (await buildDeepPopulate(uid));
      const params = { ...opts, status: 'draft' as const, populate };

      const document = await docService(uid).create(params);

      // if (isWebhooksPopulateRelationsEnabled()) {
      //   return getDeepRelationsCount(document, uid);
      // }

      return document;
    },

    async update(
      document: Document,
      uid: Common.UID.CollectionType,
      opts: DocServiceParams<'update'>[1] = {} as any
    ) {
      const publishData = omitPublishedAtField(opts.data || {});
      const populate = opts.populate ?? (await buildDeepPopulate(uid));
      const params = { ...opts, data: publishData, populate, status: 'draft' };

      const updatedDocument = await docService(uid).update(document.id as string, params);

      // if (isWebhooksPopulateRelationsEnabled()) {
      //   return getDeepRelationsCount(updatedDocument, uid);
      // }

      return updatedDocument;
    },

    async clone(
      document: Document,
      body: Partial<Documents.Params.Data.Input<Common.UID.CollectionType>>,
      uid: Common.UID.CollectionType
    ) {
      const populate = await buildDeepPopulate(uid);
      const params = {
        data: {
          ...body,
          [PUBLISHED_AT_ATTRIBUTE]: null,
        },
        populate,
      };

      // @ts-expect-error - change entity to document
      const result = await docService(uid).clone(document.id, params);

      const clonedEntity = result?.versions.at(0);
      // If relations were populated, relations count will be returned instead of the array of relations.
      // if (clonedEntity && isWebhooksPopulateRelationsEnabled()) {
      //   return getDeepRelationsCount(clonedEntity, uid);
      // }

      return clonedEntity;
    },

    /**
     *  Check if a document exists
     */
    async exists(uid: Common.UID.CollectionType, id?: string) {
      // Collection type
      if (id) {
        const count = await strapi.query(uid).count({ where: { documentId: id } });
        return count > 0;
      }

      // Single type
      const count = await strapi.query(uid).count();
      return count > 0;
    },

    async delete(
      document: Document,
      uid: Common.UID.CollectionType,
      opts: DocServiceParams<'delete'>[1] = {} as any
    ) {
      const populate = await buildDeepPopulate(uid);

      // @ts-expect-error - change entity to document
      await docService(uid).delete(document.id, { ...opts, populate });

      // If relations were populated, relations count will be returned instead of the array of relations.
      // if (deletedDocument && isWebhooksPopulateRelationsEnabled()) {
      //   return getDeepRelationsCount(deletedEntity, uid);
      // }

      // TODO: Return all deleted versions?
      return {};
    },

    // FIXME: handle relations
    deleteMany(
      opts: Parameters<typeof strapi.entityService.deleteMany>[1],
      uid: Common.UID.CollectionType
    ) {
      return strapi.entityService.deleteMany(uid, opts);
    },

    async publish(
      document: Document,
      uid: Common.UID.CollectionType,
      opts: DocServiceParams<'publish'>[1] = {} as any
    ) {
      const populate = await buildDeepPopulate(uid);
      const params = { ...opts, populate };

      const { versions: publishedDocuments } = await docService(uid).publish(
        document.id as string,
        params
      );

      // TODO: What if we publish many versions at once?
      const publishedDocument = publishedDocuments.at(0);

      // If relations were populated, relations count will be returned instead of the array of relations.
      // if (publishedDocument && isWebhooksPopulateRelationsEnabled()) {
      //   return getDeepRelationsCount(publishedDocument, uid);
      // }

      return publishedDocument;
    },

    async publishMany(entities: Document[], uid: Common.UID.ContentType) {
      if (!entities.length) {
        return null;
      }

      // Validate entities before publishing, throw if invalid
      await Promise.all(
        entities.map((document: Document) => {
          return strapi.entityValidator.validateEntityCreation(
            strapi.getModel(uid),
            document,
            undefined,
            // @ts-expect-error - FIXME: entity here is unnecessary
            document
          );
        })
      );

      // Only publish entities without a published_at date
      const entitiesToPublish = entities
        .filter((doc: Document) => !doc[PUBLISHED_AT_ATTRIBUTE])
        .map((doc: Document) => doc.id);

      const filters = { id: { $in: entitiesToPublish } };
      const data = { [PUBLISHED_AT_ATTRIBUTE]: new Date() };
      const populate = await buildDeepPopulate(uid);

      // Everything is valid, publish
      const publishedEntitiesCount = await strapi.db.query(uid).updateMany({
        where: filters,
        data,
      });
      // Get the updated entities since updateMany only returns the count
      const publishedEntities = await strapi.entityService.findMany(uid, { filters, populate });
      // Emit the publish event for all updated entities
      await Promise.all(
        publishedEntities!.map((doc: Document) => emitEvent(uid, ENTRY_PUBLISH, doc))
      );

      // Return the number of published entities
      return publishedEntitiesCount;
    },

    async unpublishMany(documents: Document[], uid: Common.UID.CollectionType) {
      if (!documents.length) {
        return null;
      }

      // Only unpublish entities with a published_at date
      const entitiesToUnpublish = documents
        .filter((doc: Document) => doc[PUBLISHED_AT_ATTRIBUTE])
        .map((doc: Document) => doc.id);

      const filters = { id: { $in: entitiesToUnpublish } };
      const data = { [PUBLISHED_AT_ATTRIBUTE]: null };
      const populate = await buildDeepPopulate(uid);

      // No need to validate, unpublish
      const unpublishedEntitiesCount = await strapi.query(uid).updateMany({
        where: filters,
        data,
      });
      // Get the updated entities since updateMany only returns the count
      const unpublishedEntities = await strapi.entityService.findMany(uid, { filters, populate });
      // Emit the unpublish event for all updated entities
      await Promise.all(
        unpublishedEntities!.map((doc: Document) => emitEvent(uid, ENTRY_UNPUBLISH, doc))
      );

      // Return the number of unpublished entities
      return unpublishedEntitiesCount;
    },

    async unpublish(
      document: Document,
      uid: Common.UID.CollectionType,
      opts: DocServiceParams<'unpublish'>[1] = {} as any
    ) {
      const populate = await buildDeepPopulate(uid);
      const params = { ...opts, populate };

      await strapi
        .documents(uid)
        // @ts-expect-error - Change entity to document
        .unpublish(document.id, params);

      // If relations were populated, relations count will be returned instead of the array of relations.
      // if (unpublishedDocument && isWebhooksPopulateRelationsEnabled()) {
      //   return getDeepRelationsCount(mappedEntity, uid);
      // }

      return {};
    },

    async discard(
      document: Document,
      uid: Common.UID.CollectionType,
      opts: DocServiceParams<'discardDraft'>[1] = {} as any
    ) {
      const populate = await buildDeepPopulate(uid);
      const params = { ...opts, populate };

      const { versions: discardedDocuments } = await docService(uid).discardDraft(
        document.id as string,
        params
      );

      // We only discard one document at a time
      const discardedDocument = discardedDocuments.at(0);

      // If relations were populated, relations count will be returned instead of the array of relations.
      // if (discardedDocument && isWebhooksPopulateRelationsEnabled()) {
      //   return getDeepRelationsCount(discardedDocument, uid);
      // }

      return discardedDocument;
    },

    async countDraftRelations(id: string, uid: Common.UID.ContentType, locale: string) {
      const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

      if (!hasRelations) {
        return 0;
      }
      const document = await docService(uid).findOne(id, { populate, locale });
      if (!document) {
        throw new ApplicationError(
          `Unable to count draft relations, document with id ${id} and locale ${locale} not found`
        );
      }
      return sumDraftCounts(document, uid);
    },

    async countManyEntriesDraftRelations(
      ids: number[],
      uid: Common.UID.CollectionType,
      locale: string
    ) {
      const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

      if (!hasRelations) {
        return 0;
      }

      const entities = await strapi.entityService.findMany(uid, {
        populate,
        filters: { id: { $in: ids } },
        locale,
      });

      const totalNumberDraftRelations: number = entities!.reduce(
        (count: number, entity: Document) => sumDraftCounts(entity, uid) + count,
        0
      );

      return totalNumberDraftRelations;
    },
  };
};

export type CollectionTypesService = typeof collectionTypes;

export default collectionTypes;
