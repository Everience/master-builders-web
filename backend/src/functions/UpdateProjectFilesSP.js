const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");
const busboy = require("busboy");
const stream = require("stream");
const {
  uploadFileToSharePoint,
  deleteFileFromSharePoint,
  getFolderUrl,
} = require("../../uploadFileToSharePoint.js");

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

app.http("UpdateProjectFilesSP", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, context) => {
    const preflight = handleCors(req);
    if (preflight) return preflight;

    try {
      // Autenticazione
      const user = await withAuth(req, context);
      requireRole(user, "admin");
      const user_email = user.preferred_username;

      // Parsing multipart/form-data
      const bb = busboy({ headers: Object.fromEntries(req.headers) });
      const fields = {};
      const uploadedFiles = [];

      bb.on("field", (name, val) => {
        fields[name] = val;
      });
      bb.on("file", (fieldname, file, info) => {
        const { filename } = info;
        const pass = new stream.PassThrough();
        file.pipe(pass);
        uploadedFiles.push({ stream: pass, filename });
      });

      await new Promise((resolve, reject) => {
        bb.on("finish", resolve);
        bb.on("error", reject);
        req
          .arrayBuffer()
          .then((buffer) => {
            bb.write(Buffer.from(buffer));
            bb.end();
          })
          .catch(reject);
      });

      const { old_project_id, project_phase, notes } = fields;

      if (!old_project_id || !project_phase || !notes) {
        return withCors({
          status: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: false,
            error: "old_project_id e project_phase e note sono obbligatori",
          }),
        });
      }

      // Transazione DB
      const pool = await getConnection();
      const transaction = pool.transaction();
      await transaction.begin();

      const uploadedUrls = [];
      const uploadedFilenames = [];

      try {
        // 1️⃣ Controlla che il progetto originale esista
        const existingRes = await transaction
          .request()
          .input("old_project_id", old_project_id)
          .query("SELECT * FROM Projects WHERE project_id = @old_project_id");

        if (existingRes.recordset.length === 0) {
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

        const oldProject = existingRes.recordset[0];

        // 2️⃣ Disattiva il vecchio progetto
        await transaction
          .request()
          .input("old_project_id", old_project_id)
          .query(
            "UPDATE Projects SET project_visibility='Inactive', project_status='Completed' WHERE project_id=@old_project_id"
          );

        // 3️⃣ Genera nuovo project_id unico
        let newProjectId;
        let exists;
        do {
          newProjectId = generateProjectId();
          const check = await transaction
            .request()
            .input("project_id", newProjectId)
            .query("SELECT 1 FROM Projects WHERE project_id=@project_id");
          exists = check.recordset.length > 0;
        } while (exists);

        context.log("Generated new project_id:", newProjectId);

        // 4️⃣ Inserisci nuovo progetto (clonando vecchio ma aggiornando phase e notes)
        const result = await transaction
          .request()
          .input("project_id", newProjectId)
          .input("project_name", oldProject.project_name)
          .input("project_code", oldProject.project_code)
          .input("region", oldProject.region)
          .input("market_segment", oldProject.market_segment)
          .input("project_phase", project_phase)
          .input("project_status", oldProject.project_status)
          .input("notes", notes)
          .input("attachments_link", oldProject.attachments_link)
          .input("project_visibility", "active")
          .input("innovation_area", oldProject.innovation_area).query(`
            INSERT INTO Projects (
              project_id, project_name, project_code, region, market_segment,
              project_phase, project_status, notes, attachments_link,
              project_visibility, innovation_area
            )
            OUTPUT INSERTED.*
            VALUES (
              @project_id, @project_name, @project_code, @region, @market_segment,
              @project_phase, @project_status, @notes, @attachments_link,
              @project_visibility, @innovation_area
            )
          `);

        // 5️⃣ Upload file su SharePoint e inserimento in Project_Files
        for (const file of uploadedFiles) {
          const url = await uploadFileToSharePoint(
            file.stream,
            oldProject.project_name,
            project_phase,
            file.filename
          );
          uploadedUrls.push(url);
          uploadedFilenames.push(file.filename);

          await transaction
            .request()
            .input("project_id", newProjectId)
            .input("filename", file.filename)
            .input("blob_url", url)
            .input("created_by", user_email).query(`
              INSERT INTO Project_Files (project_id, filename, blob_url, created_by)
              VALUES (@project_id, @filename, @blob_url, @created_by)
            `);
        }

        // 6️⃣ Aggiorna attachments_link se ci sono file caricati
        if (uploadedFiles.length > 0) {
          const folderUrl = await getFolderUrl(
            oldProject.project_name,
            project_phase
          );
          await transaction
            .request()
            .input("project_id", newProjectId)
            .input("attachments_link", folderUrl)
            .query(
              "UPDATE Projects SET attachments_link=@attachments_link WHERE project_id=@project_id"
            );
        }

        await transaction.commit();

        return withCors({
          status: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: true,
            message: "Progetto aggiornato con clone e nuovo inserimento",
            old_project_id,
            new_project: result.recordset[0],
            files: uploadedUrls,
          }),
        });
      } catch (txErr) {
        // Rollback file SharePoint caricati
        for (const filename of uploadedFilenames) {
          try {
            await deleteFileFromSharePoint(
              oldProject.project_name,
              project_phase,
              filename
            );
          } catch {}
        }
        await transaction.rollback();
        throw txErr;
      }
    } catch (err) {
      context.error(err);

      if (err.message === "FORBIDDEN")
        return withCors({
          status: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: false, error: "Forbidden" }),
        });
      if (
        ["NO_AUTH_HEADER", "INVALID_TOKEN"].includes(err.message) ||
        ["JsonWebTokenError", "TokenExpiredError"].includes(err.name)
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
