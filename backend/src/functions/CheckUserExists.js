const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");

async function checkUserExists(pool, email) {
  const result = await pool.request().input("email", email).query(`
      SELECT TOP 1 user_id_internal
      FROM Users
      WHERE email = @email
        AND user_status = 'active'
    `);

  return result.recordset.length > 0;
}

app.http("CheckUserExists", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    // Gestione preflight CORS
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      requireRole(user, "admin", "user");

      const body = await request.json();
      const { email } = body;

      if (!email) {
        return withCors({
          status: 400,
          body: JSON.stringify({
            error: "Email is required",
          }),
        });
      }

      const pool = await getConnection();

      const exists = await checkUserExists(pool, email);

      return withCors({
        status: 200,
        body: JSON.stringify({
          exists,
        }),
      });
    } catch (err) {
      context.error("Function error:", err.message);
      context.error("Error name:", err.name);
      context.error("Full error:", JSON.stringify(err));

      if (
        err.message === "NO_AUTH_HEADER" ||
        err.message === "INVALID_TOKEN" ||
        err.name === "JsonWebTokenError" ||
        err.name === "TokenExpiredError"
      ) {
        return withCors({
          status: 401,
          body: JSON.stringify({
            error: "Unauthorized",
            detail: err.message,
          }),
        });
      }

      if (err.message === "FORBIDDEN") {
        return withCors({
          status: 403,
          body: JSON.stringify({
            error: "Forbidden",
          }),
        });
      }

      return withCors({
        status: 500,
        body: JSON.stringify({
          error: "DB ERROR",
          message: err.message,
        }),
      });
    }
  },
});
