const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");

app.http("GetProjects", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const pool = await getConnection();
      const result = await pool.request().query("SELECT * FROM Projects");
      console.log(result);
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: result.recordset }),
      };
    } catch (err) {
      console.error(err);
      return {
        status: 500,
        body: { error: "Database error" },
      };
    }
  },
});
