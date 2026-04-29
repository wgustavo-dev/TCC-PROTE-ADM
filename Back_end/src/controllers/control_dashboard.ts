import { Request,Response } from "express";
import { ServiceDashboard } from "../services/service_dashboard";

const service = new ServiceDashboard();

export class ControlDashboard {
  async resumo(req: Request, res: Response) {
    try {
      const dados = await service.resumo();
      return res.json(dados);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}