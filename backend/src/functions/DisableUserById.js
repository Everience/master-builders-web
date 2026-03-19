const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");

app.http("DisableUser", {
  methods: ["POST", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      requireRole(user, "admin");

      const body = await request.json();
      const { user_id } = body;

      if (!user_id) {
        return withCors({
          status: 400,
          body: JSON.stringify({ error: "user_id required" }),
        });
      }

      const pool = await getConnection();

      const result = await pool.request().input("user_id", user_id).query(`
          UPDATE Users
          SET user_status = Disable
          OUTPUT INSERTED.*
          WHERE user_id = @user_id
        `);

      if (result.recordset.length === 0) {
        return withCors({
          status: 404,
          body: JSON.stringify({ error: "User not found" }),
        });
      }

      return withCors({
        status: 200,
        body: JSON.stringify({
          message: "User disabled",
          user: result.recordset[0],
        }),
      });
    } catch (err) {
      context.error(err);

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
