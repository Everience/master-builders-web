/*
const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");

// GET /api/GetProject?id=123
app.http("GetProjectById", {
  methods: ["GET"],
  authLevel: "function",
  handler: async (request, context) => {
    try {
      const id = request.query.get("project_id");

      if (!id) {
        return {
          status: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "ID mancante" }),
        };
      }

      const pool = await getConnection();
      const result = await pool
        .request()
        .input("project_id", id)
        .query("SELECT * FROM Projects WHERE project_id = @project_id");

      if (result.recordset.length === 0) {
        return {
          status: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Progetto non trovato" }),
        };
      }

      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: result.recordset[0] }),
      };
    } catch (err) {
      context.error(err);
      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Errore database" }),
      };
    }
  },
});
*/

const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");

app.http("GetProjectByCode", {
  methods: ["GET", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    // 👉 gestione preflight
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
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
