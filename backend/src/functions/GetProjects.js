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

app.http("GetProjects", {
  methods: ["GET", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    // 👉 gestione preflight CORS
    const preflight = handleCors(request);
    if (preflight) return preflight;

    try {
      const pool = await getConnection();
      const result = await pool.request().query("SELECT * FROM Projects");

      return withCors({
        status: 200,
        body: JSON.stringify({ projects: result.recordset }),
      });
    } catch (err) {
      console.error("Function error:", err);

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
