import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run admin:hash-password <password>");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
const escaped = `scrypt\\$${salt.toString("hex")}\\$${hash.toString("hex")}`;
console.log(`ADMIN_PASSWORD_HASH=${escaped}`);
console.log("\n(Знаки \\$ уже экранированы — Next.js env-парсер иначе интерпретирует $ как переменные)");
