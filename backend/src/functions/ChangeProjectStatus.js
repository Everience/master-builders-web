const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");

const statusVisibilityMap = {
  Killed: "inactive",
  "On Hold": "inactive",
  Completed: "inactive",
  "In Progress": "active",
};

app.http("ChangeProjectStatus", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      requireRole(user, "admin");

      const body = await request.json();
      const { project_id, status } = body;

      // 🔹 Validazioni
      if (!project_id) {
        return withCors({
          status: 400,
          body: JSON.stringify({ error: "project_id is required" }),
        });
      }

      if (!status || !statusVisibilityMap[status]) {
        return withCors({
          status: 400,
          body: JSON.stringify({
            error: "Invalid status",
            allowed: Object.keys(statusVisibilityMap),
          }),
        });
      }

      const visibility = statusVisibilityMap[status];

      const pool = await getConnection();

      const result = await pool
        .request()
        .input("project_id", project_id)
        .input("status", status)
        .input("visibility", visibility).query(`
          UPDATE Projects
          SET project_status = @status,
              project_visibility = @visibility
          OUTPUT INSERTED.*
          WHERE project_id = @project_id
        `);

      if (result.recordset.length === 0) {
        return withCors({
          status: 404,
          body: JSON.stringify({ error: "Project not found" }),
        });
      }

      return withCors({
        status: 200,
        body: JSON.stringify({
          message: `Project updated to '${status}'`,
          project: result.recordset[0],
        }),
      });
    } catch (err) {
      context.error(err);

      if (err.message === "NO_AUTH_HEADER" || err.message === "INVALID_TOKEN") {
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
          error: "Internal server error",
          message: err.message,
        }),
      });
    }
  },
});
