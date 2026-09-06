import { Router } from "express";
import type { IncidentRepository } from "../db.js";

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 365;

export function createReportsRouter(repository: IncidentRepository): Router {
  const router = Router();

  router.get("/reports/summary", async (req, res) => {
    const requested = Number(req.query.days);
    const days =
      Number.isFinite(requested) && requested > 0
        ? Math.min(Math.trunc(requested), MAX_RANGE_DAYS)
        : DEFAULT_RANGE_DAYS;
    res.json(await repository.getReportSummary(days));
  });

  return router;
}
