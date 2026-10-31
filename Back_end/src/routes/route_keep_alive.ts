import { Router } from "express";

const router = Router();

const keepAlive = (_req: any, res: any) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.status(200).json({
    status: "ok",
    service: "PROTE-ADM",
    timestamp: new Date().toISOString()
  });
};

router.get("/keep-alive", keepAlive);
router.head("/keep-alive", keepAlive);

export default router;
