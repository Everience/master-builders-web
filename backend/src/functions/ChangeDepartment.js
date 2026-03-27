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

      // ✅ VALIDAZIONE
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

      let transactionStarted = false;

      try {
        await transaction.begin();
        transactionStarted = true;

        // 🔍 Controllo utente esistente
        const userResult = await transaction
          .request()
          .input("email", email)
          .input("department", department).query(`
            SELECT TOP 1 user_name
            FROM Users
            WHERE email = @email AND department = @department
          `);

        if (userResult.recordset.length === 0) {
          throw new Error("USER_NOT_FOUND");
        }

        const user_name = userResult.recordset[0].user_name;

        // 🔍 Controllo duplicato nel nuovo dipartimento
        const duplicateCheck = await transaction
          .request()
          .input("email", email)
          .input("new_department", new_department).query(`
            SELECT TOP 1 1
            FROM Users
            WHERE email = @email 
              AND department = @new_department 
              AND user_status = 'Active'
          `);

        if (duplicateCheck.recordset.length > 0) {
          throw new Error("user already exist in new department");
        }

        // 🔄 Disattiva utente nel vecchio dipartimento
        await transaction
          .request()
          .input("email", email)
          .input("department", department).query(`
            UPDATE Users
            SET user_status = 'Inactive'
            WHERE email = @email AND department = @department
          `);

        // ⚠️ FIX: usare new_department
        const new_user_id =
          email.trim().toLowerCase() +
          "|" +
          new_department.trim().toLowerCase();

        // ➕ Inserisci nuovo record
        const insertResult = await transaction
          .request()
          .input("new_user_id", new_user_id)
          .input("email", email)
          .input("user_name", user_name)
          .input("department", new_department)
          .input("status", "Active").query(`
            INSERT INTO Users (user_id_internal, email, user_name, department, user_status)
            OUTPUT INSERTED.*
            VALUES (@new_user_id, @email, @user_name, @department, @status)
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
        if (transactionStarted) {
          try {
            await transaction.rollback();
          } catch (rollbackErr) {
            console.error("Rollback già eseguito:", rollbackErr.message);
          }
        }

        // 🎯 Errori gestiti
        if (err.message === "USER_NOT_FOUND") {
          return withCors({
            status: 404,
            body: JSON.stringify({
              error: "User not found in the original department",
            }),
          });
        }

        if (err.message === "USER_ALREADY_EXISTS") {
          return withCors({
            status: 400,
            body: JSON.stringify({
              error: "User already active in target department",
            }),
          });
        }

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
