import { Router } from "express";
import { ControlPresenca,} from "../controllers/control_presenca";

const router = Router();
const controlPresenca =new ControlPresenca();

router.get("/presencas",(req,res)=> controlPresenca.listar(req,res))

router.get("/presencas/data/:data",(req,res)=> controlPresenca.listarPorData(req,res))

router.post("/presencas", (req,res)=> controlPresenca.criar(req,res))

router.put("/presencas/:id",(req,res)=>controlPresenca.atualizar(req,res))

router.delete("/presencas/:id", (req,res)=>controlPresenca.deletar(req,res))

export default router