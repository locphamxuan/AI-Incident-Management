import { Router } from "express";
import type { IncidentRepository } from "../db.js";

export function createIncidentsRouter(repository: IncidentRepository): Router {
  const router = Router();

  router.get("/incidents", async (_req, res) => {
    res.json(await repository.listIncidents());
  });

  router.get("/incidents/:id", async (req, res) => {
    const detail = await repository.getIncidentDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(detail);
  });

  return router;
}
