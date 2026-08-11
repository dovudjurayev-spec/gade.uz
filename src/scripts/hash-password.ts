import { hashPassword } from "@/lib/admin-auth";

const password = process.argv[2];
if (!password) {
  console.error("Usage: tsx src/scripts/hash-password.ts <password>");
  process.exit(1);
}
console.log(hashPassword(password));
