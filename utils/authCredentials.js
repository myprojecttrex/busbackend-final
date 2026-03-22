const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const BCRYPT_ROUNDS = 12;
const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

function generateSecurePassword(length = 14) {
  let password = "";
  while (password.length < length) {
    const index = crypto.randomInt(0, PASSWORD_CHARS.length);
    password += PASSWORD_CHARS[index];
  }
  return password;
}

function buildCompanyCode(companyId) {
  return `COMP${String(companyId).padStart(3, "0")}`;
}

function buildCompanyAdminUserId(companyCode, existingUserIds = []) {
  let maxSequence = 0;

  for (const userId of existingUserIds) {
    const match = String(userId || "").match(/_ADMIN(\d+)$/);
    if (!match) continue;

    const sequence = Number(match[1]);
    if (!Number.isNaN(sequence)) {
      maxSequence = Math.max(maxSequence, sequence);
    }
  }

  return `${companyCode}_ADMIN${String(maxSequence + 1).padStart(2, "0")}`;
}

function isHashedPassword(value) {
  return /^\$2[aby]\$\d+\$/.test(String(value || ""));
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

async function comparePassword(plainPassword, storedPassword) {
  if (!storedPassword) return false;
  if (isHashedPassword(storedPassword)) {
    return bcrypt.compare(plainPassword, storedPassword);
  }
  return plainPassword === storedPassword;
}

module.exports = {
  buildCompanyAdminUserId,
  buildCompanyCode,
  comparePassword,
  generateSecurePassword,
  hashPassword,
  isHashedPassword,
};
