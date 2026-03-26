const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");

app.http("ChangeUserDepartment", {
  methods: ["PUT", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      requireRole(user, "admin");

      const body = await request.json();
      const { email, department, new_department } = body;

      // VALIDAZIONE
      if (!email || !department || !new_department) {
        return withCors({
          status: 400,
          body: JSON.stringify({
            error: "email, department and new_department are required",
          }),
        });
      }

      const pool = await getConnection();
      const transaction = pool.transaction();
      await transaction.begin();

      try {
        const userResult = await transaction
          .request()
          .input("email", email)
          .input("department", department).query(`
            SELECT TOP 1 *
            FROM Users
            WHERE email = @email AND department = @department
          `);

        if (userResult.recordset.length === 0) {
          await transaction.rollback();
          return withCors({
            status: 404,
            body: JSON.stringify({
              error: "User not found in the original department",
            }),
          });
        }

        await transaction
          .request()
          .input("email", email)
          .input("department", department).query(`
            UPDATE Users
            SET user_status = 'Inactive'
            WHERE email = @email AND department = @department
          `);

        const duplicateCheck = await transaction
          .request()
          .input("email", email)
          .input("new_department", new_department).query(`
            SELECT TOP 1 *
            FROM Users
            WHERE email = @email AND department = @new_department AND user_status = 'Active'
          `);

        if (duplicateCheck.recordset.length > 0) {
          await transaction.rollback();
          return withCors({
            status: 400,
            body: JSON.stringify({
              error: "User already active in target department",
            }),
          });
        }

        const insertResult = await transaction
          .request()
          .input("email", email)
          .input("department", new_department)
          .input("status", "Active").query(`
            INSERT INTO Users (user_id, email, department, user_status)
            OUTPUT INSERTED.*
            VALUES (NEWID(), @email, @department, @status)
          `);

        await transaction.commit();

        return withCors({
          status: 200,
          body: JSON.stringify({
            message: "User moved to new department",
            action: "department_changed",
            user: insertResult.recordset[0],
          }),
        });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
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
