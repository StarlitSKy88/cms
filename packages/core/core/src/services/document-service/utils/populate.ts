import { UID } from '@strapi/types';
import { contentTypes } from '@strapi/utils';

interface Options {
  /**
   * Fields to select when populating relations
   */
  relationalFields?: string[];
}

// We want to build a populate object based on the schema
export const getDeepPopulate = (uid: UID.Schema, opts: Options = {}) => {
  const model = strapi.getModel(uid);
  const attributes = Object.entries(model.attributes);

  return attributes.reduce((acc: any, [attributeName, attribute]) => {
    switch (attribute.type) {
      case 'relation': {
        // TODO: Support polymorphic relations
        const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');
        if (isMorphRelation) {
          break;
        }

        acc[attributeName] = { select: opts.relationalFields };
        break;
      }

      case 'media': {
        acc[attributeName] = { select: ['id'] };
        break;
      }

      case 'component': {
        const populate = getDeepPopulate(attribute.component, opts);
        acc[attributeName] = { populate };
        break;
      }

      case 'dynamiczone': {
        // Use fragments to populate the dynamic zone components
        const populatedComponents = (attribute.components || []).reduce(
          (acc: any, componentUID: UID.Component) => {
            acc[componentUID] = { populate: getDeepPopulate(componentUID, opts) };
            return acc;
          },
          {}
        );

        acc[attributeName] = { on: populatedComponents };
        break;
      }
      default:
        break;
    }

    return acc;
  }, {});
};
