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

      // Validazioni
      if (!email || !department || !new_department) {
        return withCors({
          status: 400,
          body: JSON.stringify({
            error: "email, department and new_department are required",
          }),
        });
      }

      if (
        department.trim().toLowerCase() === new_department.trim().toLowerCase()
      ) {
        return withCors({
          status: 400,
          body: JSON.stringify({
            error: "Source and target department must be different",
          }),
        });
      }

      const pool = await getConnection();
      const transaction = pool.transaction();
      let transactionStarted = false;

      try {
        await transaction.begin();
        transactionStarted = true;

        //verifica utente
        const sourceResult = await transaction
          .request()
          .input("email", email)
          .input("department", department).query(`
            SELECT TOP 1 user_name
            FROM Users
            WHERE email = @email
              AND department = @department
          `);

        if (sourceResult.recordset.length === 0) {
          throw new Error("USER_NOT_FOUND");
        }

        const user_name = sourceResult.recordset[0].user_name;
        const role = sourceResult.recordset[0].role;

        // verifica utente destinazione
        const activeInTarget = await transaction
          .request()
          .input("email", email)
          .input("new_department", new_department).query(`
            SELECT TOP 1 1
            FROM Users
            WHERE email = @email
              AND department = @new_department
              AND user_status = 'active'
          `);

        if (activeInTarget.recordset.length > 0) {
          throw new Error("USER_ALREADY_ACTIVE");
        }

        // verifica utente dormiente in destinazione
        const inactiveInTarget = await transaction
          .request()
          .input("email", email)
          .input("new_department", new_department).query(`
            SELECT TOP 1 1
            FROM Users
            WHERE email = @email
              AND department = @new_department
              AND user_status = 'inactive'
          `);

        const hasInactiveRecord = inactiveInTarget.recordset.length > 0;

        // 4a Disattiva utente
        await transaction
          .request()
          .input("email", email)
          .input("department", department).query(`
            UPDATE Users
            SET user_status = 'inactive'
            WHERE email = @email AND department = @department
          `);

        let resultRecord;

        if (hasInactiveRecord) {
          // 4b riattiva record dormiente
          const reactivateResult = await transaction
            .request()
            .input("email", email)
            .input("new_department", new_department).query(`
              UPDATE Users
              SET user_status = 'active'
              OUTPUT INSERTED.*
              WHERE email = @email AND department = @new_department
            `);

          resultRecord = reactivateResult.recordset[0];
        } else {
          // 4c inserisci nuovo record
          const new_user_id =
            email.trim().toLowerCase() +
            "|" +
            new_department.trim().toLowerCase();

          const insertResult = await transaction
            .request()
            .input("new_user_id", new_user_id)
            .input("email", email)
            .input("user_name", user_name)
            .input("role", role)
            .input("new_department", new_department).query(`
              INSERT INTO Users (user_id_internal, email, user_name, department, user_status, role)
              OUTPUT INSERTED.*
              VALUES (@new_user_id, @email, @user_name, @new_department, 'active', @role)
            `);

          resultRecord = insertResult.recordset[0];
        }

        await transaction.commit();

        return withCors({
          status: 200,
          body: JSON.stringify({
            message: "User moved to new department",
            action: hasInactiveRecord
              ? "department_reactivated"
              : "department_changed",
            user: resultRecord,
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

        if (err.message === "USER_NOT_FOUND") {
          return withCors({
            status: 404,
            body: JSON.stringify({
              error: "User not found or already inactive in source department",
            }),
          });
        }

        if (err.message === "USER_ALREADY_ACTIVE") {
          return withCors({
            status: 409,
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
