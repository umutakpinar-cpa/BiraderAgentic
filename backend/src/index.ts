import { env } from "./config/env";
import app from "./app";
import { prisma } from "./services/prisma.service";
import { logger } from "./utils/logger";

const server = app.listen(env.PORT, () => {
  logger.info(`Sunucu ${env.PORT} portunda dinliyor.`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} alındı, sunucu kapatılıyor...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
