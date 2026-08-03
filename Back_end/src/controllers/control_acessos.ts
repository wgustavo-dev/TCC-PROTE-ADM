// Back_end/src/controllers/control_acessos.ts

import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { ServiceAcessos } from "../services/service_acessos";

const serviceAcessos = new ServiceAcessos();

export class ControlAcessos {
  async listar(req: AuthRequest, res: Response) {
    try {
      const acessos = await serviceAcessos.listar();

      return res.status(200).json(acessos);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Erro ao listar acessos",
      });
    }
  }

  async criar(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado." });
      }

      const dados = req.body;

      const acesso = await serviceAcessos.criar(dados, req.user);

      return res.status(201).json(acesso);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao criar acesso",
      });
    }
  }

  async atualizar(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado." });
      }

      const tipo = Array.isArray(req.params.tipo) ? req.params.tipo[0] : req.params.tipo;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const dados = req.body;

      const acesso = await serviceAcessos.atualizar(tipo, Number(id), dados, req.user);

      return res.status(200).json(acesso);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao atualizar acesso",
      });
    }
  }

  async deletar(req: AuthRequest, res: Response) {
    try {
      const tipo = Array.isArray(req.params.tipo) ? req.params.tipo[0] : req.params.tipo;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const resultado = await serviceAcessos.deletar(tipo, Number(id));

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(404).json({
        error: error.message || "Erro ao excluir acesso",
      });
    }
  }
}
