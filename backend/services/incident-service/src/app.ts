import cors from "cors";
import express, { type Express } from "express";
import type { IncidentRepository } from "./db.js";
import { createIncidentsRouter } from "./routes/incidents.js";
import { createReportsRouter } from "./routes/reports.js";

export function createApp(repository: IncidentRepository, corsOrigins: string[]): Express {
  const app = express();
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use(createIncidentsRouter(repository));
  app.use(createReportsRouter(repository));
  return app;
}
