
import "dotenv/config";
import { db } from "../lib/db";

async function main() {
    console.log("Testing database connection...");
    const url = process.env.DATABASE_URL;
    console.log("URL loaded:", url ? `${url.substring(0, 20)}...` : "UNDEFINED");
    try {
        const count = await db.gameSession.count();
        console.log(`Connection successful! Found ${count} game sessions.`);
    } catch (error) {
        console.error("Connection failed:", error);
        process.exit(1);
    } finally {
        await db.$disconnect();
    }
}

main();
