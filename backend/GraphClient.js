const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
require("isomorphic-fetch");

const credential = new ClientSecretCredential(
  process.env.TENANT_ID,
  process.env.BE_CLIENT_ID,
  process.env.BE_CLIENT_SECRET
);

async function getGraphClient() {
  const token = await credential.getToken(
    "https://graph.microsoft.com/.default"
  );
  return Client.init({
    authProvider: (done) => {
      done(null, token.token);
    },
  });
}

module.exports = { getGraphClient };
