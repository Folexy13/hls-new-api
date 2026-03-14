"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
class Database extends client_1.PrismaClient {
    constructor() {
        super();
        async () => {
            try {
                await this.$connect();
                console.log("Database connection established");
            }
            catch (err) {
                console.error("Failed to connect to database", err);
                process.exit(1);
            }
        };
    }
}
exports.db = new Database();
//# sourceMappingURL=db.utility.js.map