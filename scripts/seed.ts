import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] ?? "admin@clalit.com";
  const password = process.argv[3] ?? "changeme123";
  const name = process.argv[4] ?? "Admin";

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed },
    create: { email, password: hashed, name },
  });

  console.log(`User ready: ${user.email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
