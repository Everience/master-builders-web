/*--login 
--solo admin 
--il fe con getprojtecs aha tutte le info dei provideZoneChangeDetection
--mi serve il porject id del vecchio 
FARE IN MODO DI FARE TUTTO IN BLOCCO 
update visibility a inacyive del vechio project 
creazione del nuovo project in tabella con una insert */

const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");
const { projectSchema, validate } = require("../../projectValidator.js");

// POST /api/UpdateProject
app.http("UpdateProject", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      requireRole(user, "admin");

      const body = await request.json();
      const { old_project_id, ...projectData } = body;

      // validazione old_project_id
      if (!old_project_id) {
        return withCors({
          status: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: false,
            error: "old_project_id è obbligatorio",
          }),
        });
      }

      // validazione campi nuovo progetto
      const { errors, cleaned } = validate(projectSchema, projectData);

      if (Object.keys(errors).length > 0) {
        return withCors({
          status: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: false, errors }),
        });
      }

      const pool = await getConnection();
      const transaction = pool.transaction();

      try {
        await transaction.begin();

        // 1️⃣ Verifica che il vecchio progetto esista
        const existing = await transaction
          .request()
          .input("old_project_id", old_project_id)
          .query("SELECT 1 FROM Projects WHERE project_id = @old_project_id");

        if (existing.recordset.length === 0) {
          await transaction.rollback();
          return withCors({
            status: 404,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              success: false,
              error: "Progetto originale non trovato",
            }),
          });
        }

        // 2️⃣ Imposta project_visibility = 'inactive' sul vecchio progetto
        await transaction.request().input("old_project_id", old_project_id)
          .query(`
            UPDATE Projects
            SET project_visibility = 'inactive'
            WHERE project_id = @old_project_id
          `);

        // 3️⃣ Inserisce il nuovo progetto
        const result = await transaction
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

        await transaction.commit();

        return withCors({
          status: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: true,
            message: "Progetto aggiornato con successo",
            old_project_id,
            new_project: result.recordset[0],
          }),
        });
      } catch (txErr) {
        await transaction.rollback();
        throw txErr; // rilancia al catch esterno
      }
    } catch (err) {
      context.error(err);

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
