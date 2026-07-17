// Back_end/src/controllers/control_escola.ts

import { Request, Response } from "express";
import { ServiceEscola } from "../services/service_escola";

const serviceEscola = new ServiceEscola();

export class ControlEscola {
  async listar(req: Request, res: Response) {
    try {
      const escolas = await serviceEscola.listar();
      return res.status(200).json(escolas);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async buscarPorID(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const escola = await serviceEscola.buscarPorID(id);
      return res.status(200).json(escola);
    } catch (error: any) {
      return res.status(404).json({ message: error.message });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const escola = await serviceEscola.criar(req.body);
      return res.status(201).json(escola);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const escola = await serviceEscola.atualizar(id, req.body);
      return res.status(200).json(escola);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async deletar(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const resultado = await serviceEscola.deletar(id);
      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
