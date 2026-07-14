const crypto = require("crypto");

const PASSWORD_ALGORITHM = "pbkdf2_sha256";
const PASSWORD_ITERATIONS = 210000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.pbkdf2Sync(String(password), salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString("hex");
  return `${PASSWORD_ALGORITHM}$${PASSWORD_ITERATIONS}$${salt}$${derived}`;
}

function isHashedPassword(value) {
  return String(value || "").startsWith(`${PASSWORD_ALGORITHM}$`);
}

function verifyPassword(password, storedPassword) {
  const stored = String(storedPassword || "");
  if (!stored) {
    return false;
  }

  if (!isHashedPassword(stored)) {
    return String(password) === stored;
  }

  const parts = stored.split("$");
  if (parts.length !== 4) {
    return false;
  }

  const [, iterationsValue, salt, expectedHash] = parts;
  const iterations = Number(iterationsValue);
  if (!Number.isFinite(iterations) || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto
    .pbkdf2Sync(String(password), salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(actualHash, "hex");
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function normalizePasswordForStorage(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const password = String(value);
  if (!password) {
    return "";
  }

  return isHashedPassword(password) ? password : hashPassword(password);
}

module.exports = {
  hashPassword,
  isHashedPassword,
  normalizePasswordForStorage,
  verifyPassword
};
