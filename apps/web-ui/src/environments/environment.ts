export const environment = {
  production: true,
  // Empty base => same-origin requests (the SPA is served next to the API in
  // production). Override for a split deployment where the API is on another host.
  // apiUrl: 'https://api-gandhibot.freits.fr',
  apiUrl: '',
  // siteUrl: 'https://gandhibot.freits.fr',
  siteUrl: '',
  umami: {
    host: 'https://gandhibot.freits.fr',
    websiteId: '96f308e9-c0bc-4fdc-8caf-69a883b0032b',
    scriptName: 'stats.js',
    hostUrl: 'https://gandhibot.freits.fr',
  },
};
