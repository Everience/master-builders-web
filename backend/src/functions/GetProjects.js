/*const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");

app.http("GetProjects", {
  methods: ["GET"],
  authLevel: "function",
  handler: async (request, context) => {
    try {
      const pool = await getConnection();
      const result = await pool.request().query("SELECT * FROM Projects");
      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({ projects: result.recordset }),
      };
    } catch (err) {
      console.error("Function error:", err);
      return {
        status: 500,
        body: { error: "Database error" },
      };
    }
  },
});*/

/*

const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");


const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "http://localhost:4200",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

app.http("GetProjects", {
  //adding options to manage cors prob
  methods: ["GET", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }

    try {
      const pool = await getConnection();
      const result = await pool.request().query("SELECT * FROM Projects");
      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({ projects: result.recordset }),
      };
    } catch (err) {
      console.error("Function error:", err);
      return {
        status: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "DB ERROR",
          message: err.message,
        }),
      };
    }
  },
});
*/

const { app } = require("@azure/functions");
const { getConnection } = require("../../db.js");
const { handleCors, withCors } = require("../../cors.js");
const validateToken = require("../auth/validateToken.js");

app.http("GetProjects", {
  methods: ["GET", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    // 👉 gestione preflight CORS
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader)
        return withCors({ status: 401, body: "Missing Authorization header" });

      const token = authHeader.split(" ")[1];
      if (!token)
        return withCors({
          status: 401,
          body: "Malformed Authorization header",
        });

      const decoded = await validateToken(token);
      context.log(
        "User authenticated:",
        decoded?.preferred_username || decoded?.oid
      );

      const pool = await getConnection();
      const result = await pool.request().query("SELECT * FROM Projects");

      return withCors({
        status: 200,
        body: JSON.stringify({ projects: result.recordset }),
      });
    } catch (err) {
      console.error("Function error:", err);

      if (
        err.name === "JsonWebTokenError" ||
        err.name === "TokenExpiredError"
      ) {
        return withCors({
          status: 401,
          body: JSON.stringify({ error: "Unauthorized" }),
        });
      }

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
