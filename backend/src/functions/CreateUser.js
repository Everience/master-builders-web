const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");

app.http("CreateUser", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      requireRole(user, "admin");

      const body = await request.json();
      let { email, user_name, department, role } = body;

      //nrmalizzazion
      email = email?.trim().toLowerCase();
      user_name = user_name?.trim().toLowerCase();
      department = department?.trim();
      role = role?.trim();
      const user_internal_id = `${email}|${department.toLowerCase()}`;

      //vlidazioni
      if (!email || !user_name || !department || !role) {
        return withCors({
          status: 400,
          body: JSON.stringify({
            error: "email, user_name, department and role are required",
          }),
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return withCors({
          status: 400,
          body: JSON.stringify({
            error: "Invalid email format",
          }),
        });
      }

      const pool = await getConnection();

      //check duplicati
      const duplicateCheck = await pool
        .request()
        .input("email", email)
        .input("user_name", user_name).query(`
          SELECT TOP 1 *
          FROM Users
          WHERE LOWER(email) = @email
             OR LOWER(user_name) = @user_name
        `);

      if (duplicateCheck.recordset.length > 0) {
        return withCors({
          status: 409,
          body: JSON.stringify({
            error: "User with same email or username already exists",
          }),
        });
      }

      // Insert
      const insertResult = await pool
        .request()
        .input("email", email)
        .input("user_name", user_name)
        .input("department", department)
        .input("role", role).query(`
          INSERT INTO Users (email, user_name, department, role, user_status, user_internal_id)
          OUTPUT INSERTED.*
          VALUES (@email, @user_name, @department, @role, 'Active', @user_internal_id)
        `);

      return withCors({
        status: 201,
        body: JSON.stringify({
          message: "User created successfully",
          action: "user_created",
          user: insertResult.recordset[0],
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
