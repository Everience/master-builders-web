const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const withAuth = require("../auth/withAuth.js");
const requireRole = require("../auth/requireRole.js");

app.http("VoteProject", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const user = await withAuth(request, context);
      requireRole(user, "admin", "user");

      const body = await request.json();
      const { project_id, score } = body;
      const score_reasoning = body.score_reasoning?.trim();

      const user_email = user.preferred_username;

      // validazione input
      if (
        !project_id ||
        score === undefined ||
        score === null ||
        !score_reasoning
      ) {
        return withCors({
          status: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Missing required fields" }),
        });
      }

      const numericScore = Number(score);
      if (
        !Number.isInteger(numericScore) ||
        numericScore < 1 ||
        numericScore > 5
      ) {
        return withCors({
          status: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Score must be an integer between 1 and 5",
          }),
        });
      }

      const pool = await getConnection();
      const transaction = pool.transaction();
      await transaction.begin();

      try {
        // 1️⃣ verifica progetto
        const project = await transaction
          .request()
          .input("project_id", project_id)
          .query(
            "SELECT project_status FROM Projects WHERE project_id = @project_id"
          );

        if (project.recordset.length === 0) {
          await transaction.rollback();
          return withCors({
            status: 404,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Project not found" }),
          });
        }

        if (project.recordset[0].project_visibility !== "Active") {
          await transaction.rollback();
          return withCors({
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Voting closed" }),
          });
        }

        // // verifica utente
        const userCheck = await transaction
          .request()
          .input("user_email", user_email)
          .query(
            `SELECT user_id_internal, user_status 
              FROM Users 
              WHERE email = @user_email AND user_status = 'Active'`
          );

        if (userCheck.recordset.length === 0) {
          await transaction.rollback();
          return withCors({
            status: 404,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "User non trovato o non esiste" }),
          });
        }

        if (userCheck.recordset.length > 1) {
          await transaction.rollback();
          return withCors({
            status: 409, // conflitto
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error: "User con piu department attivi",
            }),
          });
        }

        const user_id_internal = userCheck.recordset[0].user_id_internal;

        // verifica voto duplicato
        const voteCheck = await transaction
          .request()
          .input("project_id", project_id)
          .input("user_id_internal", user_id_internal).query(`
            SELECT vote_id FROM Voting_Results
            WHERE project_id = @project_id AND user_id_internal = @user_id_internal
          `);

        if (voteCheck.recordset.length > 0) {
          await transaction.rollback();
          return withCors({
            status: 409,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Already voted" }),
          });
        }

        // votazione
        const result = await transaction
          .request()
          .input("project_id", project_id)
          .input("user_id_internal", user_id_internal)
          .input("score", numericScore)
          .input("score_reasoning", score_reasoning).query(`
            INSERT INTO Voting_Results (project_id, user_id_internal, score, score_reasoning, voted_at)
            OUTPUT INSERTED.*
            VALUES (@project_id, @user_id_internal, @score, @score_reasoning, GETDATE())
          `);

        await transaction.commit();

        return withCors({
          status: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vote: result.recordset[0] }),
        });
      } catch (txErr) {
        await transaction.rollback();
        throw txErr;
      }
    } catch (err) {
      context.error(err);

      if (err.message === "FORBIDDEN") {
        return withCors({
          status: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
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
          body: JSON.stringify({ error: "Unauthorized" }),
        });
      }

      return withCors({
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal server error" }),
      });
    }
  },
});
