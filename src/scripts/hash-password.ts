import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run admin:hash-password <password>");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
const value = `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;

console.log(`ADMIN_PASSWORD_HASH=${value}`);
console.log("\nБез кавычек, без экранирования — разделитель `:` не конфликтует ни с чем.");
