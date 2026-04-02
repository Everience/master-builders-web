const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");

app.http("ChangeUserStatus", {
  methods: ["PUT", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      // 🔑 Autenticazione e autorizzazione
      const user = await withAuth(request, context);
      requireRole(user, "admin");

      const body = await request.json();
      const { email, department, status } = body;

      //validazioni
      if (!email || !department || !status) {
        return withCors({
          status: 400,
          body: JSON.stringify({ error: "email and department are required" }),
        });
      }

      if (!status || !["Active", "Inactive"].includes(status)) {
        return withCors({
          status: 400,
          body: JSON.stringify({
            error: "status must be 'Active' or 'Inactive'",
          }),
        });
      }

      const pool = await getConnection();

      //trovo user
      const userResult = await pool
        .request()
        .input("email", email)
        .input("department", department).query(`
          SELECT TOP 1 *
          FROM Users
          WHERE email = @email AND department = @department
        `);

      if (userResult.recordset.length === 0) {
        return withCors({
          status: 404,
          body: JSON.stringify({ error: "User not found" }),
        });
      }

      const targetUser = userResult.recordset[0];
      const user_id_internal = targetUser.user_id_internal;

      const transaction = pool.transaction();
      await transaction.begin();
      const txRequest = transaction.request();

      if (status === "Active") {
        await txRequest
          .input("email", email)
          .input("user_id_internal", user_id_internal).query(`
            UPDATE Users
            SET user_status = 'Inactive'
            WHERE email = @email AND user_id_internal <> @user_id_internal
          `);
      }

      const updateResult = await txRequest
        .input("status", status)
        .input("user_id_internal", user_id_internal).query(`
          UPDATE Users
          SET user_status = @status
          OUTPUT INSERTED.*
          WHERE user_id_internal = @user_id_internal
        `);

      await transaction.commit();

      return withCors({
        status: 200,
        body: JSON.stringify({
          message: `User status updated to '${status}'`,
          action: "status_updated",
          user: updateResult.recordset[0],
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
