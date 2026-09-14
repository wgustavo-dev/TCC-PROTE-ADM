import { Router } from "express";

import { ControllerNotificacao } from "../controllers/controller_notificacao";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

const controller = new ControllerNotificacao();


// =========================================================
// AUTENTICAÇÃO
// =========================================================

router.use(authMiddleware);


// =========================================================
// LISTAR NOTIFICAÇÕES
// =========================================================
// GET /api/notificacoes

router.get(
    "/",
    controller.listar.bind(controller)
);


// =========================================================
// CONTADOR
// =========================================================
// GET /api/notificacoes/nao-lidas

router.get(
    "/nao-lidas",
    controller.contarNaoLidas.bind(controller)
);


// =========================================================
// MARCAR TODAS COMO LIDAS
// =========================================================
// PATCH /api/notificacoes/marcar-todas-lidas

router.patch(
    "/marcar-todas-lidas",
    controller.marcarTodasComoLidas.bind(controller)
);


// =========================================================
// ROTAS INDIVIDUAIS
// =========================================================

// GET /api/notificacoes/:id
router.get(
    "/:id",
    controller.buscarPorId.bind(controller)
);


// PATCH /api/notificacoes/:id/lida
router.patch(
    "/:id/lida",
    controller.marcarComoLida.bind(controller)
);


// PATCH /api/notificacoes/:id/resolver
router.patch(
    "/:id/resolver",
    controller.marcarComoResolvida.bind(controller)
);


// DELETE /api/notificacoes/:id
router.delete(
    "/:id",
    controller.excluir.bind(controller)
);


export default router;