const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const tenantId = process.env.TENANT_ID;
const audience = process.env.AUDIENCE;

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      callback(err);
      return;
    }

    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

async function validateToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: audience,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      }
    );
  });
}

/*
async function validateToken(token) {
  return new Promise((resolve, reject) => {
    try {
      // Token HS256 con chiave di test
      const decoded = jwt.verify(token, "chiave_test_locale_1234567890123456", {
        algorithms: ["HS256"],
        ignoreExpiration: true,
      });
      resolve(decoded);
    } catch (err) {
      reject(err);
    }
  });
}*/

module.exports = validateToken;
