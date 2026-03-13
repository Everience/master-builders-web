// backend/db.js
const sql = require("mssql");

let pool; // pool condiviso tra le richieste

async function getConnection() {
  if (pool) {
    // se esiste già un pool, lo riutilizziamo
    return pool;
  }
  try {
    pool = await sql.connect(process.env.SQL_CONNECTION_STRING);
    console.log("✅ Azure SQL connected");
    return pool;
  } catch (err) {
    console.error("❌ SQL connection error:", err);
    throw err;
  }
}

module.exports = { getConnection };
