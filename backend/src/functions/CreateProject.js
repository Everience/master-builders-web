const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");

// POST /api/CreateProject
// Body: { name, description, ... }
app.http("CreateProject", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const { name, description } = body;

      if (!name) {
        return {
          status: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Il campo 'name' è obbligatorio" }),
        };
      }

      const pool = await getConnection();
      const result = await pool
        .request()
        .input("name", name)
        .input("description", description ?? null).query(`
          INSERT INTO Projects (name, description)
          OUTPUT INSERTED.*
          VALUES (@name, @description)
        `);

      return {
        status: 201,
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
