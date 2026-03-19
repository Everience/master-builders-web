const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");

app.http("GetProjectByCode", {
  methods: ["GET", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    // 👉 gestione preflight
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      requireRole(user, "admin", "user");

      const code = request.query.get("project_code");

      if (!code) {
        return withCors({
          status: 400,
          body: JSON.stringify({ error: "Code mancante" }),
        });
      }

      const pool = await getConnection();
      const result = await pool
        .request()
        .input("project_code", code)
        .query("SELECT * FROM Projects WHERE project_code = @project_code");

      if (result.recordset.length === 0) {
        return withCors({
          status: 404,
          body: JSON.stringify({ error: "Progetto non trovato" }),
        });
      }

      return withCors({
        status: 200,
        body: JSON.stringify({ project: result.recordset[0] }),
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
          error: "Errore database",
          message: err.message,
        }),
      });
    }
  },
});
