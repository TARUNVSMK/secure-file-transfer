import mongoose from "mongoose";
import { apiConfig } from "../config.js";
import { HttpError } from "../lib/errors.js";

let connectionPromise = null;

const states = ["disconnected", "connected", "connecting", "disconnecting"];

export const getDatabaseState = () => states[mongoose.connection.readyState] ?? "unknown";

export const ensureDatabaseConnection = async () => {
  if (!apiConfig.mongoUri) {
    throw new HttpError(500, "Missing configuration: MONGO_URI");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(apiConfig.mongoUri).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
};
