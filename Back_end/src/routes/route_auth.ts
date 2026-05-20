import { Router } from "express";
import { ControlAuth } from "../controllers/control_auth";

const router = Router();
const controlAuth = new ControlAuth();

router.post("/login", (req, res) => controlAuth.login(req, res));
router.post("/recuperar-senha", (req, res) => controlAuth.recuperarSenha(req, res));
router.post("/redefinir_senha", (req, res) => controlAuth.redefinirSenha(req, res));

export default router;
