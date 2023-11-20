import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { findArticlesDb } from './utils';

describe('Document Service', () => {
  let testUtils;
  let strapi: LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('FindMany', () => {
    it('find many documents should only return drafts by default', async () => {
      const articles = await strapi.documents('api::article.article').findMany({});

      articles.forEach((article) => {
        expect(article.publishedAt).toBe(null);
      });
    });

    it('find documents by name returns default locale and draft version', async () => {
      const articlesDb = await findArticlesDb({ title: 'Article1-Draft-EN' });

      const articles = await strapi.documents('api::article.article').findMany({
        filters: { title: 'Article1-Draft-EN' },
      });

      // Should return default language (en) and draft version
      expect(articles.length).toBe(1);
      expect(articles).toMatchObject(articlesDb);
    });

    it('find documents by name and locale', async () => {
      // There should not be a fr article called Article1-Draft-EN
      const articles = await strapi.documents('api::article.article').findMany({
        locale: 'fr',
        // Locale will also be allowed in filters but not recommended or documented
        filters: { title: 'Article1-Draft-FR' },
      });

      // Should return french locale and draft version
      expect(articles.length).toBe(1);
    });

    it('find french documents', async () => {
      const articlesDb = await findArticlesDb({ title: 'Article1-Draft-EN' });

      const articles = await strapi.documents('api::article.article').findMany({
        locale: 'fr',
        status: 'draft', // 'published' | 'draft'
      });

      // Should return default language (en) and draft version
      expect(articles.length).toBeGreaterThan(0);
      // All articles should be in french
      articles.forEach((article) => {
        expect(article.locale).toBe('fr');
        expect(article.publishedAt).toBe(null);
      });
    });

    it('find published documents', async () => {
      const articles = await strapi.documents('api::article.article').findMany({
        status: 'published',
      });

      // Should return default language (en) and draft version
      expect(articles.length).toBeGreaterThan(0);
      // All articles should be published
      articles.forEach((article) => {
        expect(article.publishedAt).not.toBe(null);
      });
    });

    it('find draft documents', async () => {
      const articles = await strapi.documents('api::article.article').findMany({
        status: 'draft',
      });

      // Should return default language (en) and draft version
      expect(articles.length).toBeGreaterThan(0);
      // All articles should be published
      articles.forEach((article) => {
        expect(article.publishedAt).toBe(null);
      });
    });
  });
});
