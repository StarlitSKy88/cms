import _ from 'lodash';

interface ServerConfig {
  url: string;
  host: string;
  port: number | string;
}

export const getConfigUrls = (config: Record<string, unknown>) => {
  const serverConfig = config.server as ServerConfig;
  const adminConfig = config.admin;

  // Defines serverUrl value
  let serverUrl = _.get(serverConfig, 'url', '');
  serverUrl = _.trim(serverUrl, '/ ');
  if (typeof serverUrl !== 'string') {
    throw new Error('Invalid server url config. Make sure the url is a string.');
  }

  if (serverUrl.startsWith('http')) {
    try {
      serverUrl = _.trim(new URL(serverConfig.url).toString(), '/');
    } catch (e) {
      throw new Error(
        'Invalid server url config. Make sure the url defined in server.js is valid.'
      );
    }
  } else if (serverUrl !== '') {
    serverUrl = `/${serverUrl}`;
  }

  // Defines adminUrl value
  let adminUrl = _.get(adminConfig, 'url', '/admin');
  adminUrl = _.trim(adminUrl, '/ ');
  if (typeof adminUrl !== 'string') {
    throw new Error('Invalid admin url config. Make sure the url is a non-empty string.');
  }
  if (adminUrl.startsWith('http')) {
    try {
      adminUrl = _.trim(new URL(adminUrl).toString(), '/');
    } catch (e) {
      throw new Error('Invalid admin url config. Make sure the url defined in server.js is valid.');
    }
  } else {
    // in case when adminUrl is not an absolute url, we need to prepend serverUrl
    // to make it relative to the server, ie /admin or /strapi/admin (if serverUrl is /strapi)
    adminUrl = `${serverUrl}/${adminUrl}`;
  }

  // Defines adminPath value
  // adminPath is the path of the admin panel relative to the host
  // this could be just /admin, or custom one like /dashboard, or subpath like /strapi/dashboard
  let adminPath = adminUrl;
  if (adminUrl.startsWith('http')) {
    adminPath = new URL(adminUrl).pathname;
  }

  return {
    serverUrl,
    adminUrl,
    adminPath,
  };
};

const getAbsoluteUrl = (adminOrServer: 'admin' | 'server') => (config: Record<string, unknown>) => {
  const { serverUrl, adminUrl } = getConfigUrls(config);
  const url = adminOrServer === 'server' ? serverUrl : adminUrl;

  if (url.startsWith('http')) {
    return url;
  }

  const serverConfig = config.server as ServerConfig;
  const hostname =
    config.environment === 'development' && ['127.0.0.1', '0.0.0.0'].includes(serverConfig.host)
      ? 'localhost'
      : serverConfig.host;

  return `http://${hostname}:${serverConfig.port}${url}`;
};

export const getAbsoluteAdminUrl = getAbsoluteUrl('admin');
export const getAbsoluteServerUrl = getAbsoluteUrl('server');
