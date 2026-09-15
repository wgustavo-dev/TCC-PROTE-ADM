import { Request, Response } from "express";
import { ServicePresenca } from "../services/service_presenca";

const service = new ServicePresenca();

export class ControlPresenca {
  async listar(req: Request, res: Response) {
    try {
      return res.json(await service.listar());
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async listarPorData(req: Request, res: Response) {
    try {
      const data = String(req.params.data || "");
      return res.json(await service.listarPorData(data));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async listarPorDataTurno(req: Request, res: Response) {
    try {
      const data = String(req.params.data || "");
      const turno = String(req.params.turno || "");
      const tipo = req.query.tipo !== undefined ? String(req.query.tipo) : undefined;
      return res.json(await service.listarPorData(data, turno, tipo));
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      return res.status(201).json(await service.criar(req.body));
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      return res.json(
        await service.atualizar(Number(req.params.id), req.body)
      );
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async deletar(req: Request, res: Response) {
    try {
      return res.json(await service.deletar(Number(req.params.id)));
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }
}