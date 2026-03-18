const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");

app.http("VoteProject", {
  methods: ["POST", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const body = await request.json();

      const { project_id, user_id, score, score_reasoning } = body;

      // VALIDATION
      if (!project_id || !user_id || !score || !score_reasoning) {
        return withCors({
          status: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        });
      }

      if (score < 1 || score > 5) {
        return withCors({
          status: 400,
          body: JSON.stringify({ error: "Score must be between 1 and 5" }),
        });
      }

      const pool = await getConnection();

      // check project
      const project = await pool.request().input("project_id", project_id)
        .query(`
          SELECT project_status
          FROM Projects
          WHERE project_id = @project_id
        `);

      if (project.recordset.length === 0) {
        return withCors({
          status: 404,
          body: JSON.stringify({ error: "Project not found" }),
        });
      }

      if (project.recordset[0].project_status !== "Active") {
        return withCors({
          status: 400,
          body: JSON.stringify({ error: "Voting closed" }),
        });
      }

      // check already voted
      const voteCheck = await pool
        .request()
        .input("project_id", project_id)
        .input("user_id", user_id).query(`
          SELECT vote_id
          FROM Voting_Results
          WHERE project_id = @project_id
          AND user_id = @user_id
        `);

      if (voteCheck.recordset.length > 0) {
        return withCors({
          status: 409,
          body: JSON.stringify({
            error: "User already voted for this project",
          }),
        });
      }

      // insert vote
      const result = await pool
        .request()
        .input("project_id", project_id)
        .input("user_id", user_id)
        .input("score", score)
        .input("score_reasoning", score_reasoning).query(`
          INSERT INTO Voting_Results (
            project_id,
            user_id,
            score,
            score_reasoning,
            voted_at
          )
          OUTPUT INSERTED.*
          VALUES (
            @project_id,
            @user_id,
            @score,
            @score_reasoning,
            GETDATE()
          )
        `);

      return withCors({
        status: 201,
        body: JSON.stringify({
          vote: result.recordset[0],
        }),
      });
    } catch (err) {
      context.error(err);

      return withCors({
        status: 500,
        body: JSON.stringify({
          error: "DB ERROR",
          message: err.message,
        }),
      });
    }
  },
});
