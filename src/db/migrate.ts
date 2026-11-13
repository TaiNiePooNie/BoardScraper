import { openDb } from "./client";

const h = await openDb();
await h.migrate();
await h.close();
console.log("✓ migrations applied");
