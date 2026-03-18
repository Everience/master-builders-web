const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "http://localhost:4200",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// gestisce preflight
function handleCors(request) {
  if (request.method === "OPTIONS") {
    return {
      status: 204,
      headers: corsHeaders,
    };
  }
  return null;
}

// wrapper per le risposte
function withCors(response) {
  return {
    ...response,
    headers: {
      ...corsHeaders,
      ...(response.headers || {}),
    },
  };
}

module.exports = { handleCors, withCors };
