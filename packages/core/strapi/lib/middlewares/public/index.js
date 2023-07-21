'use strict';

const fs = require('fs');
const path = require('path');
const stream = require('stream');
const _ = require('lodash');
const { defaultsDeep } = require('lodash/fp');
const koaStatic = require('koa-static');
const utils = require('../../utils');
const serveStatic = require('./serve-static');

const defaults = {
  maxAge: 60000,
  defaultIndex: true,
};

/**
 * @type {import('../').MiddlewareFactory}
 */
module.exports = (config, { strapi }) => {
  const { defaultIndex, index, maxAge } = defaultsDeep(defaults, config);

  let filePath = 'index.html';
  if (!defaultIndex && index && index !== 'index.html') {
    filePath = `./public/${index}`;
  }

  if (!defaultIndex && fs.existsSync('./public/index.html')) {
    filePath = './public/index.html';
  }
  filePath = filePath === 'index.html' ? path.join(__dirname, filePath) : filePath;
  const indexFile = fs.readFileSync(filePath, 'utf8');

  const serveIndexPage = async (ctx, next) => {
    // defer rendering of strapi index page
    await next();

    if (ctx.body != null || ctx.status !== 404) return;

    ctx.url = index ? '/' : ctx.url;
    const isInitialized = await utils.isInitialized(strapi);
    const data = {
      serverTime: new Date().toUTCString(),
      isInitialized,
      ..._.pick(strapi, [
        'config.info.version',
        'config.info.name',
        'config.admin.url',
        'config.server.url',
        'config.environment',
        'config.serveAdminPanel',
      ]),
    };
    const content = _.template(indexFile)(data);
    const body = stream.Readable({
      read() {
        this.push(Buffer.from(content));
        this.push(null);
      },
    });
    // Serve static.
    ctx.type = 'html';
    ctx.body = body;
  };

  strapi.server.routes([
    {
      method: 'GET',
      path: '/',
      handler: serveIndexPage,
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/index.html',
      handler: serveIndexPage,
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/assets/images/(.*)',
      handler: serveStatic(path.resolve(__dirname, 'assets/images'), {
        maxage: maxAge,
        defer: true,
      }),
      config: { auth: false },
    },
    // All other public GET-routes except /uploads/(.*) which is handled in upload middleware
    {
      method: 'GET',
      path: '/((?!uploads/).+)',
      handler: koaStatic(strapi.dirs.static.public, {
        maxage: maxAge,
        defer: true,
      }),
      config: { auth: false },
    },
  ]);

  return null;
};
