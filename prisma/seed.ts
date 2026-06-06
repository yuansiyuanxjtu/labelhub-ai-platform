import { PrismaClient } from "@prisma/client";
import { resetDemoData } from "@/lib/demo/demoData";

const prisma = new PrismaClient();

async function main() {
  const result = await resetDemoData(prisma);
  console.log(`Seeded ${result.taskCount} demo tasks and ${result.sampleCount} samples.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
