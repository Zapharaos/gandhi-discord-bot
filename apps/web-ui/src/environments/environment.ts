export const environment = {
  production: true,
  // Empty base => same-origin requests (the SPA is served next to the API in
  // production). Override for a split deployment where the API is on another host.
  apiUrl: 'https://api-gandhibot.freits.fr',
  siteUrl: 'https://gandhibot.freits.fr',
  umami: {
    host: 'https://gandhibot.freits.fr',
    websiteId: '781f547d-c37c-499b-8bfe-5996d1f2a01c',
    scriptName: 'stats.js',
    hostUrl: 'https://gandhibot.freits.fr',
  },
};
