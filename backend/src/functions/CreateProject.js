const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");
const { projectSchema, validate } = require("../../projectValidator.js");

// POST /api/CreateProject
app.http("CreateProject", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    // 👉 preflight CORS
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      requireRole(user, "admin");

      const body = await request.json();

      const { errors, cleaned } = validate(projectSchema, body);

      if (Object.keys(errors).length > 0) {
        return withCors({
          status: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: false,
            errors,
          }),
        });
      }

      const pool = await getConnection();

      const existing = await pool
        .request()
        .input("project_code", cleaned.project_code)
        .query("SELECT 1 FROM Projects WHERE project_code = @project_code");

      if (existing.recordset.length > 0) {
        return withCors({
          status: 409,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: false,
            error: "Project code già esistente",
          }),
        });
      }

      const result = await pool
        .request()
        .input("project_name", cleaned.project_name)
        .input("project_code", cleaned.project_code)
        .input("region", cleaned.region)
        .input("market_segment", cleaned.market_segment)
        .input("project_phase", cleaned.project_phase)
        .input("project_status", cleaned.project_status)
        .input("notes", cleaned.notes)
        .input("attachments_link", cleaned.attachments_link)
        .input("project_visibility", cleaned.project_visibility)
        .input("innovation_area", cleaned.innovation_area).query(`
          INSERT INTO Projects (
            project_name,
            project_code,
            region,
            market_segment,
            project_phase,
            project_status,
            notes,
            attachments_link,
            project_visibility,
            innovation_area
          )
          OUTPUT INSERTED.*
          VALUES (
            @project_name,
            @project_code,
            @region,
            @market_segment,
            @project_phase,
            @project_status,
            @notes,
            @attachments_link,
            @project_visibility,
            @innovation_area
          )
        `);

      return withCors({
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          project: result.recordset[0],
        }),
      });
    } catch (err) {
      context.error(err);

      if (err.message === "FORBIDDEN") {
        return withCors({
          status: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: false,
            error: "Forbidden",
          }),
        });
      }

      if (
        err.message === "NO_AUTH_HEADER" ||
        err.message === "INVALID_TOKEN" ||
        err.name === "JsonWebTokenError" ||
        err.name === "TokenExpiredError"
      ) {
        return withCors({
          status: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: false,
            error: "Unauthorized",
          }),
        });
      }

      return withCors({
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          error: "Errore interno al server",
        }),
      });
    }
  },
});
