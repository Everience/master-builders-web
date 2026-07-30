export const environment = {
  production: false,
  azureFunctions: {
    baseUrl: 'https://masterbuilderbackend.azurewebsites.net/api',
    hostKey: '',
    //baseUrl: '/api',
  },
  msal: {
    clientId: "f11fa8bf-aa44-429d-8417-d5af5ba21f73",//'767114fd-3d06-45b5-a2bb-7709837a92d9',
    tenantId: "0e1fbcc2-d541-43c9-b3d8-3fd57fb2955a",//'456c3ca4-0074-406c-aefc-7ae53d6430da',
    redirectUri: window.location.origin,
    scopes: ['api://23ee2fd9-7f51-4c37-8d4f-1aef775a79bd/access_as_user']
  }
};
