import {Router} from "express"
import {ControlMensalidade}from "../controllers/control_mensalidade"

const router = Router()

const controlMensalidade = new ControlMensalidade()


router.get("/mensalidades", (req, res) =>
  controlMensalidade.listar(req, res)
);

router.get("/mensalidades/:id", (req, res) =>
  controlMensalidade.buscarPorId(req, res)
);

router.post("/mensalidades", (req, res) =>
  controlMensalidade.criar(req, res)
);

router.put("/mensalidades/:id/pagar", (req, res) =>
  controlMensalidade.marcarComoPago(req, res)
);

router.put("/mensalidades/:id", (req, res) =>
  controlMensalidade.atualizar(req, res)
);


router.delete("/mensalidades/:id", (req, res) =>
  controlMensalidade.deletar(req, res)
);

export default router;