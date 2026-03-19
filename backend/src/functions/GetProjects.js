const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const validateToken = require("../auth/validateToken.js");
const withAuth = require("../auth/withAuth.js");

app.http("GetProjects", {
  methods: ["GET", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    // 👉 gestione preflight CORS
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      const pool = await getConnection();
      const result = await pool.request().query("SELECT * FROM Projects");

      return withCors({
        status: 200,
        body: JSON.stringify({ projects: result.recordset }),
      });
    } catch (err) {
      console.error("Function error:", err);

      if (
        err.message === "NO_AUTH_HEADER" ||
        err.message === "INVALID_TOKEN" ||
        err.name === "JsonWebTokenError" ||
        err.name === "TokenExpiredError"
      ) {
        return withCors({
          status: 401,
          body: JSON.stringify({ error: "Unauthorized" }),
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
