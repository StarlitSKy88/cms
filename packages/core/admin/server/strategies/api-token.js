'use strict';

const { castArray, isEmpty } = require('lodash/fp');
const constants = require('../services/constants');
const { getService } = require('../utils');

/** @type {import('.').AuthenticateFunction} */
const authenticate = async ctx => {
  const apiTokenService = getService('api-token');
  const { authorization } = ctx.request.header;

  if (!authorization) {
    return { authenticated: false };
  }

  const parts = authorization.split(/\s+/);

  if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
    return { authenticated: false };
  }

  const token = parts[1];
  const apiToken = await apiTokenService.getBy({
    accessKey: apiTokenService.hash(token),
  });

  if (!apiToken) {
    return { authenticated: false };
  }

  return { authenticated: true, credentials: apiToken };
};

/** @type {import('.').VerifyFunction} */
const verify = (auth, config) => {
  const { errors } = strapi.container.get('auth');
  const { credentials: apiToken } = auth;

  if (!apiToken) {
    throw new errors.UnauthorizedError();
  }

  if (apiToken.type === constants.API_TOKEN_TYPE.FULL_ACCESS) {
    return;
  }

  /**
   * If you don't have `full-access` you can only access `find` and `findOne`
   * scopes. If the route has no scope, then you can't get access to it.
   */
  const hasValidScopes = castArray(config.scope).every(
    scope => scope.endsWith('find') || scope.endsWith('findOne')
  );

  if (!isEmpty(config.scope) && hasValidScopes) {
    return;
  }

  throw new errors.ForbiddenError();
};

/** @type {import('.').AuthStrategy} */
module.exports = {
  name: 'api-token',
  authenticate,
  verify,
};
