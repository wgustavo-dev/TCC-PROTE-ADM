// Back_end/src/controllers/control_aluno.ts

import { Request, Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { ServiceAluno } from "../services/service_aluno";

const serviceAluno = new ServiceAluno();

export class ControlAluno {
  async listarResponsaveis(req: Request, res: Response) {
    try {
      const responsaveis = await serviceAluno.listarResponsaveis();

      return res.status(200).json(responsaveis);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Erro ao listar responsáveis",
      });
    }
  }

  async listar(req: Request, res: Response) {
    try {
      const alunos = await serviceAluno.listar();

      return res.status(200).json(alunos);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Erro ao listar alunos",
      });
    }
  }

  async buscarPorID(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const aluno = await serviceAluno.buscarPorID(Number(id));

      return res.status(200).json(aluno);
    } catch (error: any) {
      return res.status(404).json({
        error: error.message || "Erro ao buscar aluno",
      });
    }
  }

  async criar(req: AuthRequest, res: Response) {
    try {
      const dados = req.body;

      if (req.file) {
        dados.foto = `/uploads/alunos/${req.file.filename}`;
      }

      const aluno = await serviceAluno.criar(dados, req.user);

      return res.status(201).json(aluno);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao criar aluno",
      });
    }
  }

  async atualizar(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const dados = req.body;

      if (req.file) {
        dados.foto = `/uploads/alunos/${req.file.filename}`;
      }

      const aluno = await serviceAluno.atualizar(Number(id), dados, req.user);

      return res.status(200).json(aluno);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao atualizar aluno",
      });
    }
  }

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const resultado = await serviceAluno.deletar(Number(id));

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(404).json({
        error: error.message || "Erro ao excluir aluno",
      });
    }
  }
}