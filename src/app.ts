import "dotenv/config";

import { createRandomCustomers } from "./utils";
import { initConnection, mongoClient } from "./db";

async function onTick(): Promise<void> {
  await mongoClient
    .db("fundraiseup")
    .collection("customers")
    .insertMany(createRandomCustomers());
}

(async (): Promise<void> => {
  await initConnection();

  const job = setInterval(onTick, 200);

  function stopJob(): void {
    clearInterval(job);
  }

  process.on("SIGINT", stopJob);
  process.on("SIGTERM", stopJob);
  process.on("exit", stopJob);
})();
