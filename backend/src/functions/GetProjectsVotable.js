const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const validateToken = require("../auth/validateToken.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");

async function getUserIdInternal(pool, email) {
  const result = await pool.request().input("email", email).query(`
      SELECT user_id_internal
      FROM Users
      WHERE email = @email
        AND user_status = 'active'
    `);

  if (result.recordset.length === 0) {
    return null;
  }

  return result.recordset[0];
}

app.http("GetProjects", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    // 👉 gestione preflight CORS
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      requireRole(user, "admin", "user");

      const body = await request.json();
      const email = body.email;

      const pool = await getConnection();
      const userIdInternal = getUserIdInternal(pool, email);

      if (!userIdInternal) {
        return withCors({
          status: 404,
          body: JSON.stringify({
            error: "User not found or inactive",
          }),
        });
      }

      const result = await pool
        .request()
        .input("userIdInternal", userIdInternal).query(`
            SELECT *
            FROM Projects
            WHERE project_visibility = 'active'
              AND project_id NOT IN (
                SELECT project_id
                FROM Voting_Results
                WHERE user_id_internal = @userIdInternal
              )
          `);

      return withCors({
        status: 200,
        body: JSON.stringify({ projects: result.recordset }),
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
          body: JSON.stringify({ error: "Forbidden" }),
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
