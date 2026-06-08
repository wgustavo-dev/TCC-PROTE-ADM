import { Router } from "express";
import { ControlPresenca,} from "../controllers/control_presenca";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();
const controlPresenca =new ControlPresenca();

router.get("/presencas", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req,res)=> controlPresenca.listar(req,res))

router.get("/presencas/data/:data", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req,res)=> controlPresenca.listarPorData(req,res))

router.post("/presencas", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req,res)=> controlPresenca.criar(req,res))

router.put("/presencas/:id", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req,res)=>controlPresenca.atualizar(req,res))

router.delete("/presencas/:id", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req,res)=>controlPresenca.deletar(req,res))

export default router