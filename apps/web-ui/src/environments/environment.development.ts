export const environment = {
  production: false,
  // Empty base => relative requests handled by the dev-server proxy
  // (see proxy.conf.json), which forwards /api, /auth and /ws to the web service.
  apiUrl: '',
  siteUrl: '',
  umami: {
    host: 'http://localhost:3999',
    websiteId: '781f547d-c37c-499b-8bfe-5996d1f2a01c',
    scriptName: 'script.js',
    hostUrl: '',
  },
};
