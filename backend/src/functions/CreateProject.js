const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");
const projectSchema = {
  project_name: { required: true, type: "string" },
  project_code: { required: true, type: "string" },
  region: { required: true, type: "string" },
  market_segment: { required: true, type: "string" },
  project_phase: { required: true, type: "string" },
  project_status: { required: true, type: "string" },
  notes: { required: true, type: "string" },
  attachments_link: { required: false, type: "string" },
  project_visibility: { required: true, type: "string" },
  innovation_area: { required: true, type: "string" },
};

function validate(schema, data) {
  const errors = {};
  const cleaned = {};

  for (const field in schema) {
    const rules = schema[field];
    let value = data[field];

    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors[field] = "Campo obbligatorio";
      continue;
    }

    if (!rules.required && value === undefined) {
      cleaned[field] = null;
      continue;
    }

    if (rules.type === "string" && typeof value !== "string") {
      errors[field] = `Deve essere di tipo ${rules.type}`;
      continue;
    }

    if (rules.type === "string") {
      value = value.trim();
      if (rules.required && value === "") {
        errors[field] = "Non può essere vuoto";
        continue;
      }
    }

    cleaned[field] = value ?? null;
  }

  return { errors, cleaned };
}

// POST /api/CreateProject
app.http("CreateProject", {
  methods: ["POST", "OPTIONS"],
  authLevel: "function",
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
