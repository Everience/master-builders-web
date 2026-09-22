const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");
const { projectSchema, validate } = require("../../projectValidator.js");
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

app.http("CreateProjectFilesSP", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, context) => {
    const preflight = handleCors(req);
    if (preflight) return preflight;

    try {
      const user = await withAuth(req, context);
      requireRole(user, "admin");

      const user_email = user.upn;
      if (!user_email) {
        user_email = user.preferred_username;
      }
      const pool = await getConnection();
      const transaction = pool.transaction();
      await transaction.begin();

      let projectId;
      let cleaned;
      const uploadedFiles = [];

      // Parsing multipart/form-data
      const bb = busboy({ headers: Object.fromEntries(req.headers) });
      const fields = {};

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

      const { errors, cleaned: cleanedData } = validate(projectSchema, fields);
      if (Object.keys(errors).length > 0) {
        return withCors({
          status: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: false, errors }),
        });
      }
      cleaned = cleanedData;

      //check project code
      const existingCode = await transaction
        .request()
        .input("project_code", cleaned.project_code)
        .query("SELECT 1 FROM Projects WHERE project_code = @project_code");

      if (existingCode.recordset.length > 0) {
        await transaction.rollback();
        return withCors({
          status: 409,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: false,
            error: "Project code già esistente",
          }),
        });
      }

      let exists;
      do {
        projectId = generateProjectId();
        const check = await transaction
          .request()
          .input("project_id", projectId)
          .query("SELECT 1 FROM Projects WHERE project_id = @project_id");
        exists = check.recordset.length > 0;
      } while (exists);

      context.log("Generated project_id:", projectId);

      const result = await transaction
        .request()
        .input("project_id", projectId)
        .input("project_name", cleaned.project_name)
        .input("project_code", cleaned.project_code)
        .input("region", cleaned.region)
        .input("market_segment", cleaned.market_segment)
        .input("project_phase", cleaned.project_phase)
        .input("project_status", cleaned.project_status.toLowerCase())
        .input("notes", cleaned.notes)
        .input("attachments_link", cleaned.attachments_link)
        .input("project_visibility", "active")
        .input("innovation_area", cleaned.innovation_area).query(`
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

      const uploadedUrls = [];
      const uploadedFilenames = [];

      try {
        for (const file of uploadedFiles) {
          const url = await uploadFileToSharePoint(
            file.stream,
            cleaned.project_name,
            cleaned.project_phase,
            file.filename
          );
          uploadedUrls.push(url);
          uploadedFilenames.push(file.filename);

          await transaction
            .request()
            .input("project_id", projectId)
            .input("filename", file.filename)
            .input("blob_url", url)
            .input("created_by", user_email).query(`
              INSERT INTO Project_Files (project_id, filename, blob_url, created_by)
              VALUES (@project_id, @filename, @blob_url, @created_by)
            `);
        }

        let folderUrl = null;

        if (uploadedFiles.length > 0) {
          folderUrl = await getFolderUrl(
            cleaned.project_name,
            cleaned.project_phase
          );

          await transaction
            .request()
            .input("project_id", projectId)
            .input("attachments_link", folderUrl).query(`
              UPDATE Projects
              SET attachments_link = @attachments_link
              WHERE project_id = @project_id
          `);
        }
      } catch (err) {
        //Rollback solo dei file già caricati con successo su SharePoint
        for (const filename of uploadedFilenames) {
          try {
            await deleteFileFromSharePoint(
              cleaned.project_name,
              cleaned.project_phase,
              filename
            );
          } catch {}
        }
        await transaction.rollback();
        throw err;
      }

      await transaction.commit();

      return withCors({
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          project: result.recordset[0],
          files: uploadedUrls,
        }),
      });
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
