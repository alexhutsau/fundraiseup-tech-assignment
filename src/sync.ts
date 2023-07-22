import "dotenv/config";

import { initConnection, mongoClient } from "./db";
import { anonymiseCustomer } from "./utils";

const isFullReindexMode = process.argv.includes("--full-reindex");

async function runFullReindex(): Promise<void> {
  const limit = 1000;
  let page = 0;

  while (true) {
    const customers = await mongoClient
      .db("fundraiseup")
      .collection("customers")
      .find()
      .sort("_id", 1)
      .limit(limit)
      .skip(page * limit)
      .toArray();

    if (!customers.length) break;

    await mongoClient
      .db("fundraiseup")
      .collection("customers_anonymised")
      .insertMany(customers.map(anonymiseCustomer), { ordered: false })
      .catch((error) => {
        if (error.code !== 11000) throw error;
      });

    page++;
  }
}

(async (): Promise<void> => {
  await initConnection();

  if (isFullReindexMode) {
    await runFullReindex();
    process.exit();
  }
})();
