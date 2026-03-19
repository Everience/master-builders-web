const validateToken = require("./validateToken");

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
};
