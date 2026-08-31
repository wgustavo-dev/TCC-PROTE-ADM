import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { ServiceLinhaTrajeto } from "../services/service_linha_trajeto";

const service = new ServiceLinhaTrajeto();

export class ControlLinhaTrajeto {
  async listar(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado." });
      }

      const data = String(req.query.data || "");
      const turno = String(req.query.turno || "");

      const resultado = await service.listar(req.user, data, turno);
      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao buscar Linha de Trajeto",
      });
    }
  }
}
