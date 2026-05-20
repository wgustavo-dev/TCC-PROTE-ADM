// Back_end/src/routes/route_mensalidade.ts

import { Router } from "express";
import { ControlMensalidade } from "../controllers/control_mensalidade";

const router = Router();

const controlMensalidade = new ControlMensalidade();

router.get("/mensalidades", (req, res) =>
  controlMensalidade.listar(req, res)
);

router.get("/mensalidades/:id", (req, res) =>
  controlMensalidade.buscarPorId(req, res)
);

router.post("/mensalidades", (req, res) =>
  controlMensalidade.criar(req, res)
);

/*
  ROTA AUXILIAR:
  Atualiza mensalidades vencidas com status PENDENTE para ATRASADO.

  Importante:
  Esta rota precisa vir antes de /mensalidades/:id,
  caso futuramente fosse criada com GET/PUT parecido.
*/
router.put("/mensalidades/atualizar-atrasadas", (req, res) =>
  controlMensalidade.atualizarAtrasadas(req, res)
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