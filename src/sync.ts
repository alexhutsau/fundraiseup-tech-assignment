import "dotenv/config";

import { initConnection, mongoClient } from "./db";
import { anonymiseCustomer } from "./utils";
import { ChangeStreamInsertDocument, Timestamp, WithId } from "mongodb";
import { Customer } from "./interfaces";

const isFullReindexMode = process.argv.includes("--full-reindex");

async function saveAnonymisedCustomers(
  customers: WithId<Customer>[],
): Promise<void> {
  await mongoClient
    .db("fundraiseup")
    .collection("customers_anonymised")
    .insertMany(customers, { ordered: false })
    .catch((error) => {
      if (error.code !== 11000) throw error;
    });
}

async function runFullReindex(): Promise<void> {
  const limit = 1000;
  let page = 0;

  while (true) {
    const customers = await mongoClient
      .db("fundraiseup")
      .collection<Customer>("customers")
      .find()
      .sort("_id", 1)
      .limit(limit)
      .skip(page * limit)
      .toArray();

    if (!customers.length) break;

    await saveAnonymisedCustomers(customers.map(anonymiseCustomer));

    page++;
  }
}

(async (): Promise<void> => {
  await initConnection();

  if (isFullReindexMode) {
    await runFullReindex();
    process.exit();
  }

  const [lastAnonymised] = await mongoClient
    .db("fundraiseup")
    .collection<Customer>("customers_anonymised")
    .find()
    .sort("_id", -1)
    .limit(1)
    .toArray();

  const firstCreated =
    !lastAnonymised &&
    (await mongoClient
      .db("fundraiseup")
      .collection<Customer>("customers")
      .findOne());

  const startAtOperationTime = (lastAnonymised || firstCreated)?.createdAt;

  const watchStream = mongoClient
    .db("fundraiseup")
    .collection("customers")
    .watch([{ $match: { operationType: "insert" } }], {
      ...(startAtOperationTime && {
        startAtOperationTime: new Timestamp({
          t: Math.floor(+startAtOperationTime / 1000),
          i: 1,
        }),
      }),
    });

  const anonymisedCustomers: WithId<Customer>[] = [];

  setInterval(async (): Promise<void> => {
    const len = anonymisedCustomers.length;

    if (len) {
      console.log(`saving ${anonymisedCustomers.length} by interval...`);
      await saveAnonymisedCustomers(anonymisedCustomers.splice(0, len));
    }
  }, 1000);

  console.log(`start from ${startAtOperationTime}`);

  while (true) {
    const { fullDocument: customer } =
      (await watchStream.next()) as ChangeStreamInsertDocument<
        WithId<Customer>
      >;

    const len = anonymisedCustomers.push(anonymiseCustomer(customer));

    if (len >= 1000) {
      console.log(`saving ${len} by size...`);
      await saveAnonymisedCustomers(anonymisedCustomers.splice(0, len));
    }
  }
})();
