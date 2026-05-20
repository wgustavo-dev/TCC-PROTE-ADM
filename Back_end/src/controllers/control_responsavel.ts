// Back_end/src/controllers/control_responsavel.ts

import { Request, Response } from "express";
import { ServiceResponsavel } from "../services/service_responsavel";

const serviceResponsavel = new ServiceResponsavel();

export class ControlResponsavel {
  async listar(req: Request, res: Response) {
    try {
      const responsaveis = await serviceResponsavel.listar();

      return res.status(200).json(responsaveis);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Erro ao listar responsáveis",
      });
    }
  }

  async buscarPorID(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const responsavel = await serviceResponsavel.buscarPorID(Number(id));

      return res.status(200).json(responsavel);
    } catch (error: any) {
      return res.status(404).json({
        error: error.message || "Erro ao buscar responsável",
      });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const dados = req.body;

      const responsavel = await serviceResponsavel.criar(dados);

      return res.status(201).json(responsavel);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao criar responsável",
      });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dados = req.body;

      const responsavel = await serviceResponsavel.atualizar(
        Number(id),
        dados
      );

      return res.status(200).json(responsavel);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao atualizar responsável",
      });
    }
  }

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const resultado = await serviceResponsavel.deletar(Number(id));

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(404).json({
        error: error.message || "Erro ao excluir responsável",
      });
    }
  }
}