export const environment = {
  production: false,
  azureFunctions: {
    baseUrl: 'https://masterbuilderbackend.azurewebsites.net/api',
    hostKey: '',
    //baseUrl: '/api',
  },
  msal: {
    clientId: '767114fd-3d06-45b5-a2bb-7709837a92d9',
    tenantId: '456c3ca4-0074-406c-aefc-7ae53d6430da',
    redirectUri: window.location.origin,
    scopes: ['api://3953353c-e525-4bcf-bc5b-8a3f2fef63dd/access_as_user']
  }
};
