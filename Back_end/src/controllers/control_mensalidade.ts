// Back_end/src/controllers/control_mensalidade.ts

import { Request, Response } from "express";
import { ServiceMensalidade } from "../services/service_mensalidade";

const serviceMensalidade = new ServiceMensalidade();

export class ControlMensalidade {
  async listar(req: Request, res: Response) {
    try {
      const mensalidades = await serviceMensalidade.listar();

      return res.status(200).json(mensalidades);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Erro ao listar mensalidades",
      });
    }
  }

  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const mensalidade = await serviceMensalidade.buscarPorId(Number(id));

      return res.status(200).json(mensalidade);
    } catch (error: any) {
      return res.status(404).json({
        error: error.message || "Erro ao buscar mensalidade",
      });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const dados = req.body;

      const mensalidade = await serviceMensalidade.criar(dados);

      return res.status(201).json(mensalidade);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao criar mensalidade",
      });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dados = req.body;

      const mensalidade = await serviceMensalidade.atualizar(Number(id), dados);

      return res.status(200).json(mensalidade);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao atualizar mensalidade",
      });
    }
  }

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const resultado = await serviceMensalidade.deletar(Number(id));

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(404).json({
        error: error.message || "Erro ao excluir mensalidade",
      });
    }
  }

  async marcarComoPago(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const mensalidade = await serviceMensalidade.marcarComoPago(Number(id));

      return res.status(200).json(mensalidade);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || "Erro ao marcar mensalidade como paga",
      });
    }
  }

  async atualizarAtrasadas(req: Request, res: Response) {
    try {
      const resultado = await serviceMensalidade.atualizarMensalidadesAtrasadas();

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Erro ao atualizar mensalidades atrasadas",
      });
    }
  }

  // Disparo manual da rotina de renovação mensal (a mesma que roda
  // sozinha no servidor). Útil para testar/forçar sem esperar o mês virar.
  async renovarMes(req: Request, res: Response) {
    try {
      const resultado = await serviceMensalidade.gerarRenovacaoMensal();

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || "Erro ao renovar mensalidades do mês",
      });
    }
  }
}