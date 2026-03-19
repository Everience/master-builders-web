module.exports = function requireRole(user, ...roles) {
  // Controlla che l'utente abbia dei ruoli definiti
  if (!user.roles || !roles.some((role) => user.roles.includes(role))) {
    throw new Error("FORBIDDEN");
  }
};
