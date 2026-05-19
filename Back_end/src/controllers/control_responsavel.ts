import { Request, Response } from "express";
import { ServiceResponsavel } from "../services/service_responsavel";

const service = new ServiceResponsavel();

export class ControlResponsavel {
  async listar(req: Request, res: Response) {
    try {
      const responsaveis = await service.listar();
      return res.json(responsaveis);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async buscarPorID(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const responsavel = await service.buscarPorID(Number(id));
      return res.json(responsavel);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const responsavel = await service.criar(req.body);
      return res.status(201).json(responsavel);
    } catch (error: any) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const responsavel = await service.atualizar(Number(id), req.body);
      return res.json(responsavel);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const resultado = await service.deletar(Number(id));
      return res.json(resultado);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }
}
