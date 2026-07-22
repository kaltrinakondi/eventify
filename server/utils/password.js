const bcrypt = require('bcryptjs');

async function verifyPassword(password, hash) {
  const normalized = hash.replace(/^\$2y\$/, '$2a$');
  return bcrypt.compare(password, normalized);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

module.exports = { verifyPassword, hashPassword };
