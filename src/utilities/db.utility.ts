import { PrismaClient } from "@prisma/client";



class Database extends PrismaClient {
  constructor() {
    super();
    async () => {
      try {
        await this.$connect();
        console.log("Database connection established");
      } catch (err) {
        console.error("Failed to connect to database", err);
        process.exit(1);
      }
    };
  }
}

export const db = new Database();