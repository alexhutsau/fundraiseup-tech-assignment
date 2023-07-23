import "dotenv/config";

import { initConnection, mongoClient } from "./db";
import { anonymiseCustomer } from "./utils";
import { ChangeStreamInsertDocument, WithId } from "mongodb";
import { Customer } from "./interfaces";

const isFullReindexMode = process.argv.includes("--full-reindex");

async function saveAnonymisedCustomers(
  customers: WithId<Customer>[],
): Promise<void> {
  await mongoClient
    .db("fundraiseup")
    .collection("customers_anonymised")
    .bulkWrite(
      customers.map((customer) => ({
        replaceOne: {
          filter: { _id: customer._id },
          upsert: true,
          replacement: customer,
        },
      })),
    );
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

  const [lastAnonymisedCustomerEvent] = await mongoClient
    .db("local")
    .collection("oplog.rs")
    .find({ ns: "fundraiseup.customers_anonymised" })
    .sort("ts", -1)
    .limit(1)
    .toArray();

  const [lastSavedCustomerEvent] = await (lastAnonymisedCustomerEvent
    ? mongoClient
        .db("local")
        .collection("oplog.rs")
        .find({
          ns: "fundraiseup.customers",
          o2: lastAnonymisedCustomerEvent.o2,
          ts: { $lt: lastAnonymisedCustomerEvent.ts },
        })
        .sort("ts", -1)
    : mongoClient
        .db("local")
        .collection("oplog.rs")
        .find({ ns: "fundraiseup.customers" })
  )
    .limit(1)
    .toArray();

  const changeStream = mongoClient
    .db("fundraiseup")
    .collection("customers")
    .watch(
      [{ $match: { operationType: { $in: ["insert", "update", "replace"] } } }],
      {
        fullDocument: "updateLookup",
        ...(lastSavedCustomerEvent && {
          startAtOperationTime: lastSavedCustomerEvent.ts,
        }),
      },
    );

  const anonymisedCustomers: WithId<Customer>[] = [];

  setInterval(async (): Promise<void> => {
    const len = anonymisedCustomers.length;

    if (len) {
      console.log(`saving ${anonymisedCustomers.length} by interval...`);
      await saveAnonymisedCustomers(anonymisedCustomers.splice(0, len));
    }
  }, 1000);

  console.log(`start from ${lastSavedCustomerEvent?.wall}`);

  for await (const change of changeStream) {
    const { fullDocument: customer } = change as ChangeStreamInsertDocument<
      WithId<Customer>
    >;

    const len = anonymisedCustomers.push(anonymiseCustomer(customer));

    if (len >= 1000) {
      console.log(`saving ${len} by size...`);
      await saveAnonymisedCustomers(anonymisedCustomers.splice(0, len));
    }
  }

  await changeStream.close();
})();
