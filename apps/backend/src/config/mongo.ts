import mongoose from "mongoose";
import { env } from "~/config/env";
import { createChild } from "~/utils/logger";

const log = createChild("mongo");

// OLTP traditional-server pool sizing per mongodb-connection skill
// (steady traffic, short queries, pre-warmed connections for spike absorption)
const CONNECT_OPTIONS: mongoose.ConnectOptions = {
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 5 * 60 * 1000, // 5 min
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 30_000,
  connectTimeoutMS: 10_000,
  retryWrites: true,
  appName: "vedaai-backend",
};

export async function connectMongo(): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => log.info("mongo connected"));
  mongoose.connection.on("error", (err) => log.error({ err }, "mongo error"));
  mongoose.connection.on("disconnected", () => log.warn("mongo disconnected"));

  await mongoose.connect(env.MONGODB_URI, CONNECT_OPTIONS);
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
