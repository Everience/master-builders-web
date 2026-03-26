const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");
const { projectSchema, validate } = require("../../projectValidator.js");

// Funzione per generare project_id tipo FE43C-DD6C8
function generateProjectId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let part1 = "",
    part2 = "";
  for (let i = 0; i < 5; i++)
    part1 += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 5; i++)
    part2 += chars[Math.floor(Math.random() * chars.length)];
  return `${part1}-${part2}`;
}

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
          body: JSON.stringify({ success: false, errors }),
        });
      }

      const pool = await getConnection();

      // ── STEP 1 — controlla project_code duplicato ───────────────
      const existingCode = await pool
        .request()
        .input("project_code", cleaned.project_code)
        .query("SELECT 1 FROM Projects WHERE project_code = @project_code");

      if (existingCode.recordset.length > 0) {
        return withCors({
          status: 409,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: false,
            error: "Project code già esistente",
          }),
        });
      }

      // ── STEP 2 — genera project_id unico ───────────────────────
      let project_id;
      let exists;
      do {
        project_id = generateProjectId();
        const check = await pool
          .request()
          .input("project_id", project_id)
          .query("SELECT 1 FROM Projects WHERE project_id = @project_id");
        exists = check.recordset.length > 0;
      } while (exists);

      context.log("Generated unique project_id:", project_id);

      // ── STEP 3 — INSERT nel DB ────────────────────────────────
      const result = await pool
        .request()
        .input("project_id", project_id)
        .input("project_name", cleaned.project_name)
        .input("project_code", cleaned.project_code)
        .input("region", cleaned.region)
        .input("market_segment", cleaned.market_segment)
        .input("project_phase", cleaned.project_phase)
        .input("project_status", cleaned.project_status)
        .input("notes", cleaned.notes)
        .input("attachments_link", cleaned.attachments_link)
        .input("project_visibility", "active")
        .input("innovation_area", cleaned.innovation_area).query(`
          INSERT INTO Projects (
            project_id,
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
            @project_id,
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
        body: JSON.stringify({ success: true, project: result.recordset[0] }),
      });
    } catch (err) {
      context.error(err);

      // gestione errori auth/forbidden
      if (err.message === "FORBIDDEN") {
        return withCors({
          status: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: false, error: "Forbidden" }),
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
          body: JSON.stringify({ success: false, error: "Unauthorized" }),
        });
      }

      // errore generico
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
