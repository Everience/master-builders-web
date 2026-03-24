const corsHeaders = {
  "Content-Type": "application/json",
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
