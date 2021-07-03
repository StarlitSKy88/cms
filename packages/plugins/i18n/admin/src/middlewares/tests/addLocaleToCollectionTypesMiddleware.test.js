import { fixtures } from '../../../../../../admin-test-utils';
import addLocaleToCollectionTypesMiddleware from '../addLocaleToCollectionTypesMiddleware';

describe('i18n | middlewares | addLocaleToCollectionTypesMiddleware', () => {
  let getState;
  let store;

  beforeEach(() => {
    store = {
      ...fixtures.store.state,
      i18n_locales: { locales: [] },
    };
    store.rbacProvider.allPermissions = [];

    store.rbacProvider.collectionTypesRelatedPermissions = {
      test: {
        'plugins::content-manager.explorer.read': [],
        'plugins::content-manager.explorer.create': [],
      },
    };

    getState = jest.fn(() => store);
  });

  it('should forward the action when the type is undefined', () => {
    const action = { test: true, type: undefined };

    const next = jest.fn();
    const middleware = addLocaleToCollectionTypesMiddleware()({ getState });

    middleware(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('should forward the action when the type is not ContentManager/App/SET_CONTENT_TYPE_LINKS', () => {
    const action = { test: true, type: 'TEST' };

    const next = jest.fn();

    const middleware = addLocaleToCollectionTypesMiddleware()({ getState });
    middleware(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('should forward when the authorizedStLinks array is empty', () => {
    const action = {
      type: 'ContentManager/App/SET_CONTENT_TYPE_LINKS',
      data: {
        authorizedCtLinks: [],
      },
    };
    const middleware = addLocaleToCollectionTypesMiddleware()({ getState });

    const next = jest.fn();

    middleware(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('should not add the search key to a single type link when i18n is not enabled on the single type', () => {
    const action = {
      type: 'ContentManager/App/SET_CONTENT_TYPE_LINKS',
      data: {
        authorizedCtLinks: [{ to: 'cm/collectionType/test' }],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: false } } }],
      },
    };
    const middleware = addLocaleToCollectionTypesMiddleware()({ getState });

    const next = jest.fn();

    middleware(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('should add a search key with the default locale when the user has the right to read it', () => {
    store.i18n_locales = { locales: [{ code: 'en', isDefault: true }] };
    store.rbacProvider.collectionTypesRelatedPermissions.test[
      'plugins::content-manager.explorer.read'
    ] = [{ properties: { locales: ['en'] } }];

    const action = {
      type: 'ContentManager/App/SET_CONTENT_TYPE_LINKS',
      data: {
        authorizedCtLinks: [{ to: 'cm/collectionType/test', search: null }],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };
    const middleware = addLocaleToCollectionTypesMiddleware()({ getState });

    const next = jest.fn();

    middleware(next)(action);

    const expected = {
      type: 'ContentManager/App/SET_CONTENT_TYPE_LINKS',
      data: {
        authorizedCtLinks: [{ to: 'cm/collectionType/test', search: 'plugins[i18n][locale]=en' }],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };

    expect(next).toBeCalledWith(expected);
  });

  it('should set the isDisplayed key to false when the user does not have the right to read any locale', () => {
    store.i18n_locales.locales = [{ code: 'en', isDefault: true }];
    store.rbacProvider.collectionTypesRelatedPermissions.test[
      'plugins::content-manager.explorer.read'
    ] = [{ properties: { locales: [] } }];

    const action = {
      type: 'ContentManager/App/SET_CONTENT_TYPE_LINKS',
      data: {
        authorizedCtLinks: [{ to: 'cm/collectionType/test', search: 'page=1&pageSize=10' }],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };
    const middleware = addLocaleToCollectionTypesMiddleware()({ getState });

    const next = jest.fn();

    middleware(next)(action);

    const expected = {
      type: 'ContentManager/App/SET_CONTENT_TYPE_LINKS',
      data: {
        authorizedCtLinks: [
          {
            to: 'cm/collectionType/test',
            isDisplayed: false,
            search: 'page=1&pageSize=10',
          },
        ],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };

    expect(next).toBeCalledWith(expected);
  });

  it('should keep the previous search', () => {
    store.i18n_locales.locales = [{ code: 'en', isDefault: true }];
    store.rbacProvider.collectionTypesRelatedPermissions.test[
      'plugins::content-manager.explorer.read'
    ] = [{ properties: { locales: ['en'] } }];

    const action = {
      type: 'ContentManager/App/SET_CONTENT_TYPE_LINKS',
      data: {
        authorizedCtLinks: [{ to: 'cm/collectionType/test', search: 'plugins[plugin][test]=test' }],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };
    const middleware = addLocaleToCollectionTypesMiddleware()({ getState });

    const next = jest.fn();

    middleware(next)(action);

    const expected = {
      type: 'ContentManager/App/SET_CONTENT_TYPE_LINKS',
      data: {
        authorizedCtLinks: [
          {
            to: 'cm/collectionType/test',
            search: 'plugins[plugin][test]=test&plugins[i18n][locale]=en',
          },
        ],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };

    expect(next).toBeCalledWith(expected);
  });
});
