app.http("VoteProject", {
  methods: ["POST", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      // FIX 3: auth prima di consumare il body
      const user = await withAuth(request, context);
      requireRole(user, "admin", "user");

      const body = await request.json();

      const { project_id, score } = body;
      // FIX 5: trim su score_reasoning prima di validare e salvare
      const score_reasoning = body.score_reasoning?.trim();
      const user_id = user.id;

      if (
        !project_id ||
        score === undefined ||
        score === null ||
        !score_reasoning
      ) {
        return withCors({
          status: 400,
          headers: { "Content-Type": "application/json" }, // FIX 4
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
          headers: { "Content-Type": "application/json" }, // FIX 4
          body: JSON.stringify({
            error: "Score must be an integer between 1 and 5",
          }),
        });
      }

      const pool = await getConnection();
      const transaction = pool.transaction();
      await transaction.begin();

      try {
        const project = await transaction
          .request()
          .input("project_id", project_id)
          .query(
            `SELECT project_status FROM Projects WHERE project_id = @project_id`
          );

        if (project.recordset.length === 0) {
          await transaction.rollback();
          return withCors({
            status: 404,
            headers: { "Content-Type": "application/json" }, // FIX 4
            body: JSON.stringify({ error: "Project not found" }),
          });
        }

        if (project.recordset[0].project_status !== "In progress") {
          await transaction.rollback();
          return withCors({
            status: 400,
            headers: { "Content-Type": "application/json" }, // FIX 4
            body: JSON.stringify({ error: "Voting closed" }),
          });
        }

        const voteCheck = await transaction
          .request()
          .input("project_id", project_id)
          .input("user_id", user_id).query(`
            SELECT vote_id FROM Voting_Results
            WHERE project_id = @project_id AND user_id = @user_id
          `);

        if (voteCheck.recordset.length > 0) {
          await transaction.rollback();
          return withCors({
            status: 409,
            headers: { "Content-Type": "application/json" }, // FIX 4
            body: JSON.stringify({ error: "Already voted" }),
          });
        }

        const result = await transaction
          .request()
          .input("project_id", project_id)
          .input("user_id", user_id)
          .input("score", numericScore)
          .input("score_reasoning", score_reasoning).query(`
            INSERT INTO Voting_Results (project_id, user_id, score, score_reasoning, voted_at)
            OUTPUT INSERTED.*
            VALUES (@project_id, @user_id, @score, @score_reasoning, GETDATE())
          `);

        await transaction.commit();

        return withCors({
          status: 201,
          headers: { "Content-Type": "application/json" }, // FIX 4
          body: JSON.stringify({ vote: result.recordset[0] }),
        });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      context.error(err);

      if (err.message === "FORBIDDEN") {
        return withCors({
          status: 403,
          headers: { "Content-Type": "application/json" }, // FIX 4
          body: JSON.stringify({ error: "Forbidden" }),
        });
      }

      // FIX 1: gestione esplicita degli errori di autenticazione → 401
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
        headers: { "Content-Type": "application/json" }, // FIX 4
        body: JSON.stringify({ error: "Internal server error" }),
      });
    }
  },
});
