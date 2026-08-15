// Back_end/src/controllers/control_itinerario.ts
//

import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { ServiceItinerario } from "../services/service_itinerario";

const serviceItinerario = new ServiceItinerario();

export class ControlItinerario {
  async listar(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado." });
      }

      const idCondutor = await serviceItinerario.resolverIdCondutor(req.user);
      const itinerarios = await serviceItinerario.listarAgrupado(idCondutor);

      return res.status(200).json(itinerarios);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Erro ao buscar itinerários",
      });
    }
  }

  async atualizarOrdem(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado." });
      }

      const idCondutor = await serviceItinerario.resolverIdCondutor(req.user);
      const payload = req.body;

      await serviceItinerario.atualizarOrdem(idCondutor, payload);

      return res.status(200).json({ ok: true });
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao salvar ordem do itinerário",
      });
    }
  }
}