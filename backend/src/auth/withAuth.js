/* const validateToken = require("./validateToken");

module.exports = async function withAuth(request, context) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    throw new Error("NO_AUTH_HEADER");
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new Error("INVALID_TOKEN");
  }

  const decoded = await validateToken(token);

  return decoded; // 👉 user
};*/

const validateToken = require("./validateToken");

module.exports = async function withAuth(request, context) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    context.log("NO AUTH HEADER");
    throw new Error("NO_AUTH_HEADER");
  }

  context.log("AUTH HEADER PRESENT");

  const token = authHeader.split(" ")[1];

  if (!token) {
    context.log("INVALID TOKEN FORMAT");
    throw new Error("INVALID_TOKEN");
  }

  try {
    const decoded = await validateToken(token);

    context.log("TOKEN VALID");
    context.log(
      JSON.stringify({
        aud: decoded.aud,
        iss: decoded.iss,
        tid: decoded.tid,
        oid: decoded.oid,
        roles: decoded.roles,
        scp: decoded.scp,
      })
    );

    return decoded;
  } catch (err) {
    context.log("TOKEN INVALID");
    context.log(err.message);

    throw err;
  }
};
