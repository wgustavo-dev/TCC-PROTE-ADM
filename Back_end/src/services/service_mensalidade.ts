// Back_end/src/services/service_mensalidade.ts

import { AppDataSource } from "../config/database";
import { Mensalidade } from "../models/model_mensalidade";
import { Aluno } from "../models/model_aluno";
import { Condutor } from "../models/model_condutor";

export class ServiceMensalidade {
  private get mensalidadeRepository() {
    return AppDataSource.getRepository(Mensalidade);
  }

  private get alunoRepository() {
    return AppDataSource.getRepository(Aluno);
  }

  private get condutorRepository() {
    return AppDataSource.getRepository(Condutor);
  }

  private async validarAluno(id_aluno: any) {
    const idAluno = Number(id_aluno);

    if (!Number.isInteger(idAluno) || idAluno <= 0) {
      throw new Error("Aluno é obrigatório para cadastrar mensalidade");
    }

    const aluno = await this.alunoRepository.findOne({
      where: { id_aluno: idAluno },
      relations: {
        responsavel: true,
      },
    });

    if (!aluno) {
      throw new Error("Aluno não encontrado");
    }

    return aluno;
  }

  private async validarCondutor(id_condutor: any) {
    if (id_condutor === undefined || id_condutor === null || id_condutor === "") {
      return null;
    }

    const idCondutor = Number(id_condutor);

    if (!Number.isInteger(idCondutor) || idCondutor <= 0) {
      throw new Error("Condutor inválido");
    }

    const condutor = await this.condutorRepository.findOneBy({
      id_condutor: idCondutor,
    });

    if (!condutor) {
      throw new Error("Condutor não encontrado");
    }

    return condutor;
  }

  private validarValor(valor: any) {
    const texto = String(valor ?? "").trim();
    if (!texto) {
      throw new Error("Valor da mensalidade deve ser maior que zero");
    }

    const valorNumerico = Number(
      texto
        .replace(/[R$\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    );

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      throw new Error("Valor da mensalidade deve ser maior que zero");
    }

    return Number(valorNumerico.toFixed(2));
  }

  private validarDataVencimento(data_vencimento: any) {
    if (!data_vencimento) {
      throw new Error("Data de vencimento é obrigatória");
    }

    const valor = String(data_vencimento).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      throw new Error("Data de vencimento inválida");
    }

    const data = new Date(`${valor}T12:00:00`);
    const [ano, mes, dia] = valor.split("-").map(Number);

    if (
      Number.isNaN(data.getTime()) ||
      data.getFullYear() !== ano ||
      data.getMonth() + 1 !== mes ||
      data.getDate() !== dia
    ) {
      throw new Error("Data de vencimento inválida");
    }

    return valor;
  }

  private validarStatus(status: any) {
    if (!status) {
      return "PENDENTE";
    }

    const statusPermitidos = ["PAGO", "PENDENTE", "ATRASADO"];
    const statusNormalizado = String(status).trim().toUpperCase();

    if (!statusPermitidos.includes(statusNormalizado)) {
      throw new Error("Status da mensalidade inválido");
    }

    return statusNormalizado as "PAGO" | "PENDENTE" | "ATRASADO";
  }

  async listar() {
    return await this.mensalidadeRepository.find({
      relations: {
        aluno: {
          responsavel: true,
        },
        condutor: true,
      },
      order: {
        data_vencimento: "ASC",
      },
    });
  }

  async buscarPorId(id: number) {
    const mensalidade = await this.mensalidadeRepository.findOne({
      where: { id_mensalidade: id },
      relations: {
        aluno: {
          responsavel: true,
        },
        condutor: true,
      },
    });

    if (!mensalidade) {
      throw new Error("Mensalidade não encontrada");
    }

    return mensalidade;
  }

  async criar(dados: Partial<Mensalidade>) {
    const aluno = await this.validarAluno(dados.id_aluno);
    const condutor = await this.validarCondutor(dados.id_condutor);

    const valor = this.validarValor(dados.valor);
    const dataVencimento = this.validarDataVencimento(dados.data_vencimento);
    const status = this.validarStatus(dados.status);

    let dataPagamento: Date | null = null;

    if (status === "PAGO") {
      dataPagamento = dados.data_pagamento
        ? new Date(dados.data_pagamento)
        : new Date();
    }

    const mensalidade = this.mensalidadeRepository.create({
      id_aluno: aluno.id_aluno,
      valor,
      data_vencimento: dataVencimento,
      data_pagamento: dataPagamento,
      status,
      id_condutor: condutor ? condutor.id_condutor : null,
    });

    await this.mensalidadeRepository.save(mensalidade);

    return await this.buscarPorId(mensalidade.id_mensalidade);
  }

  async atualizar(id: number, dados: Partial<Mensalidade>) {
    const mensalidade = await this.mensalidadeRepository.findOne({
      where: { id_mensalidade: id },
    });

    if (!mensalidade) {
      throw new Error("Mensalidade não encontrada");
    }

    if (dados.id_aluno !== undefined) {
      const aluno = await this.validarAluno(dados.id_aluno);
      mensalidade.id_aluno = aluno.id_aluno;
    }

    if (dados.id_condutor !== undefined) {
      const condutor = await this.validarCondutor(dados.id_condutor);
      mensalidade.id_condutor = condutor ? condutor.id_condutor : null;
    }

    if (dados.valor !== undefined) {
      mensalidade.valor = this.validarValor(dados.valor);
    }

    if (dados.data_vencimento !== undefined) {
      mensalidade.data_vencimento = this.validarDataVencimento(
        dados.data_vencimento
      ) as any;
    }

    if (dados.status !== undefined) {
      mensalidade.status = this.validarStatus(dados.status);

      if (mensalidade.status !== "PAGO") {
        mensalidade.data_pagamento = null;
      }

      if (mensalidade.status === "PAGO" && !mensalidade.data_pagamento) {
        mensalidade.data_pagamento = dados.data_pagamento
          ? new Date(dados.data_pagamento)
          : new Date();
      }
    }

    if (dados.data_pagamento !== undefined) {
      mensalidade.data_pagamento = dados.data_pagamento
        ? new Date(dados.data_pagamento)
        : null;
    }

    await this.mensalidadeRepository.save(mensalidade);

    return await this.buscarPorId(mensalidade.id_mensalidade);
  }

  async deletar(id: number) {
    const mensalidade = await this.mensalidadeRepository.findOne({
      where: { id_mensalidade: id },
    });

    if (!mensalidade) {
      throw new Error("Mensalidade não encontrada");
    }

    await this.mensalidadeRepository.remove(mensalidade);

    return {
      message: "Mensalidade removida com sucesso",
    };
  }

  async marcarComoPago(id: number) {
    const mensalidade = await this.mensalidadeRepository.findOne({
      where: { id_mensalidade: id },
    });

    if (!mensalidade) {
      throw new Error("Mensalidade não encontrada");
    }

    if (mensalidade.status === "PAGO" || mensalidade.data_pagamento) {
      throw new Error("Mensalidade já foi paga");
    }

    mensalidade.status = "PAGO";
    mensalidade.data_pagamento = new Date();

    await this.mensalidadeRepository.save(mensalidade);

    return await this.buscarPorId(mensalidade.id_mensalidade);
  }

  async atualizarMensalidadesAtrasadas() {
    await this.mensalidadeRepository
      .createQueryBuilder()
      .update(Mensalidade)
      .set({ status: "ATRASADO" })
      .where("data_vencimento < CURDATE()")
      .andWhere("status = :status", { status: "PENDENTE" })
      .execute();

    return {
      message: "Mensalidades atrasadas atualizadas",
    };
  }
}