import { MongoClient } from "mongodb";

const { DB_URI } = process.env;

if (!DB_URI) {
  throw new Error("DB_URI env is missed");
}

export const mongoClient = new MongoClient(DB_URI);

export async function initConnection(): Promise<MongoClient> {
  return mongoClient.connect();
}

function closeConnection(): void {
  mongoClient.close();
}

process.on("SIGINT", closeConnection);
process.on("SIGTERM", closeConnection);
process.on("exit", closeConnection);
