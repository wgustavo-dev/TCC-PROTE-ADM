// Back_end/src/services/service_responsavel.ts

import { AppDataSource } from "../config/database";
import { QueryFailedError } from "typeorm";
import { Aluno } from "../models/model_aluno";
import { Mensalidade } from "../models/model_mensalidade";
import { Presenca } from "../models/model_presenca";
import { Responsavel } from "../models/model_responsavel";
import { ItinerarioAluno } from "../models/model_itinerario";

type ResponsavelResumo = Responsavel & {
  alunos: Array<{
    id_aluno: number;
    nome: string;
    mensalidade: number;
  }>;
  mensalidade_total: number;
  proximo_vencimento: Date | null;
  status_financeiro: "em_dia" | "atrasado";
};

export class ServiceResponsavel {
  private get responsavelRepository() {
    return AppDataSource.getRepository(Responsavel);
  }

  private get alunoRepository() {
    return AppDataSource.getRepository(Aluno);
  }

  private get mensalidadeRepository() {
    return AppDataSource.getRepository(Mensalidade);
  }

  private get presencaRepository() {
    return AppDataSource.getRepository(Presenca);
  }

  private normalizarNome(nome: any): string {
    const valor = String(nome ?? "").trim();

    if (!valor || valor.length < 2 || valor.length > 100) {
      throw new Error("Nome do responsável deve ter entre 2 e 100 caracteres.");
    }

    return valor.replace(/\s+/g, " ");
  }

  private normalizarTelefone(telefone: any): string {
    const valor = String(telefone ?? "").replace(/\D/g, "");

    if (!/^\d{10,11}$/.test(valor)) {
      throw new Error("Telefone inválido. Use DDD + 8 ou 9 dígitos.");
    }

    return valor;
  }

  private normalizarTelefoneEmergencia(telefone: any): string | null {
    const valor = String(telefone ?? "").replace(/\D/g, "");

    if (!valor) {
      return null;
    }

    if (!/^\d{10,11}$/.test(valor)) {
      throw new Error(
        "Telefone de emergência inválido. Use DDD + 8 ou 9 dígitos."
      );
    }

    return valor;
  }

  private async validarContatosUnicos(
    telefone: string,
    telefoneEmergencia: string | null,
    email: string | null,
    idIgnorado?: number
  ): Promise<void> {
    // Telefones principal e de emergência devem ser únicos entre responsáveis, em qualquer campo.
    if (telefoneEmergencia && telefone === telefoneEmergencia) {
      throw new Error(
        "O telefone principal e o telefone de emergência devem ser diferentes."
      );
    }

    const responsaveis = await this.responsavelRepository.find({
      select: {
        id_responsavel: true,
        telefone: true,
        telefone_emergencia: true,
        email: true,
      },
    });

    const telefonesInformados = [telefone, telefoneEmergencia].filter(
      (numero): numero is string => numero !== null
    );
    const outrosResponsaveis = responsaveis.filter((responsavel) => {
      if (responsavel.id_responsavel === idIgnorado) {
        return false;
      }

      const emailExistente = String(responsavel.email ?? "").trim().toLowerCase();
      const telefonesExistentes = [
        String(responsavel.telefone ?? "").replace(/\D/g, ""),
        String(responsavel.telefone_emergencia ?? "").replace(/\D/g, ""),
      ].filter(Boolean);

      return (
        telefonesInformados.some((numero) =>
          telefonesExistentes.includes(numero)
        ) ||
        (email !== null && emailExistente === email)
      );
    });

    const telefoneDuplicado = outrosResponsaveis.some((responsavel) => {
      const telefonesExistentes = [
        String(responsavel.telefone ?? "").replace(/\D/g, ""),
        String(responsavel.telefone_emergencia ?? "").replace(/\D/g, ""),
      ];
      return telefonesInformados.some((numero) =>
        telefonesExistentes.includes(numero)
      );
    });
    const emailDuplicado = outrosResponsaveis.some(
      (responsavel) =>
        email !== null &&
        String(responsavel.email ?? "").trim().toLowerCase() === email
    );

    if (telefoneDuplicado) {
      throw new Error(
        "Este telefone já está cadastrado como contato de outro responsável."
      );
    }

    if (emailDuplicado) {
      throw new Error("Já existe um responsável cadastrado com este e-mail.");
    }
  }

  private normalizarEmail(email: any): string | null {
    if (email === undefined || email === null) {
      return null;
    }

    const valor = String(email).trim();

    if (!valor) {
      return null;
    }

    const emailNormalizado = valor.toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      throw new Error("E-mail informado é inválido.");
    }

    return emailNormalizado;
  }

  private normalizarEndereco(endereco: any): string {
    const valor = String(endereco ?? "").trim();

    if (!valor || valor.length < 5 || valor.length > 255) {
      throw new Error("Endereço do responsável é obrigatório e deve ter entre 5 e 255 caracteres.");
    }

    return valor.replace(/\s+/g, " ");
  }

  private normalizarQuantidadeAlunos(quantidade: any) {
    const quantidadeNumerica = Number(quantidade);

    if (!Number.isInteger(quantidadeNumerica) || quantidadeNumerica < 1) {
      throw new Error("Quantidade de alunos deve ser pelo menos 1");
    }

    return quantidadeNumerica;
  }

  private async montarResumo(responsavel: Responsavel): Promise<ResponsavelResumo> {
    const alunos = await this.alunoRepository.find({
      where: { id_responsavel: responsavel.id_responsavel },
      order: { nome: "ASC" },
    });

    const alunosResumo = [];
    let mensalidadeTotal = 0;
    let proximoVencimento: Date | null = null;
    let possuiAtraso = false;

    for (const aluno of alunos) {
      const mensalidades = await this.mensalidadeRepository.find({
        where: { id_aluno: aluno.id_aluno },
        order: { data_vencimento: "ASC" },
      });

      const mensalidadesAbertas = mensalidades.filter(
        (mensalidade) => mensalidade.status !== "PAGO"
      );

      const mensalidadeAluno = mensalidadesAbertas.reduce(
        (total, mensalidade) => total + Number(mensalidade.valor || 0),
        0
      );

      mensalidadeTotal += mensalidadeAluno;

      for (const mensalidade of mensalidadesAbertas) {
        if (mensalidade.status === "ATRASADO") {
          possuiAtraso = true;
        }

        if (
          !proximoVencimento ||
          new Date(mensalidade.data_vencimento) < new Date(proximoVencimento)
        ) {
          proximoVencimento = mensalidade.data_vencimento;
        }
      }

      alunosResumo.push({
        id_aluno: aluno.id_aluno,
        nome: aluno.nome,
        mensalidade: mensalidadeAluno,
      });
    }

    return {
      ...responsavel,
      alunos: alunosResumo,
      mensalidade_total: mensalidadeTotal,
      proximo_vencimento: proximoVencimento,
      status_financeiro: possuiAtraso ? "atrasado" : "em_dia",
    };
  }

  private async salvarResponsavel(responsavel: Responsavel): Promise<Responsavel> {
    try {
      return await this.responsavelRepository.save(responsavel);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as {
          code?: string;
          sqlMessage?: string;
        };

        if (driverError.code === "ER_DUP_ENTRY") {
          if (driverError.sqlMessage?.includes("uk_responsavel_telefone")) {
            throw new Error("Já existe um responsável cadastrado com este telefone.");
          }

          if (driverError.sqlMessage?.includes("uk_responsavel_telefone_emergencia")) {
            throw new Error(
              "Este telefone de emergência já está cadastrado para outro responsável."
            );
          }

          if (driverError.sqlMessage?.includes("uk_responsavel_email")) {
            throw new Error("Já existe um responsável cadastrado com este e-mail.");
          }

          throw new Error("Já existe um responsável cadastrado com este telefone ou e-mail.");
        }

        if (
          driverError.code === "ER_SIGNAL_EXCEPTION" ||
          driverError.sqlMessage?.includes(
            "Telefone já cadastrado para outro responsável"
          )
        ) {
          throw new Error(
            "Este telefone já está cadastrado como contato de outro responsável."
          );
        }
      }

      throw error;
    }
  }

  async listar() {
    const responsaveis = await this.responsavelRepository.find({
      order: { nome: "ASC" },
    });

    return Promise.all(
      responsaveis.map((responsavel) => this.montarResumo(responsavel))
    );
  }

  async buscarPorID(id: number) {
    const responsavel = await this.responsavelRepository.findOneBy({
      id_responsavel: id,
    });

    if (!responsavel) {
      throw new Error("Responsável não encontrado");
    }

    return this.montarResumo(responsavel);
  }

  async criar(dados: Partial<Responsavel>) {
    const nome = this.normalizarNome(dados.nome);
    const telefone = this.normalizarTelefone(dados.telefone);
    const telefoneEmergencia = this.normalizarTelefoneEmergencia(
      dados.telefone_emergencia
    );
    const email = this.normalizarEmail(dados.email);
    const endereco = this.normalizarEndereco(dados.endereco);
    const quantidadeAlunos = this.normalizarQuantidadeAlunos(
      dados.quantidade_alunos
    );

    await this.validarContatosUnicos(
      telefone,
      telefoneEmergencia,
      email
    );

    const responsavel = this.responsavelRepository.create({
      nome,
      telefone,
      telefone_emergencia: telefoneEmergencia,
      email,
      endereco,
      quantidade_alunos: quantidadeAlunos,
    });

    await this.salvarResponsavel(responsavel);

    return this.montarResumo(responsavel);
  }

  async atualizar(id: number, dados: Partial<Responsavel>) {
    const responsavel = await this.responsavelRepository.findOneBy({
      id_responsavel: id,
    });

    if (!responsavel) {
      throw new Error("Responsável não encontrado");
    }

    const nomeAtualizado = dados.nome !== undefined
      ? this.normalizarNome(dados.nome)
      : responsavel.nome;

    const telefoneAtualizado = dados.telefone !== undefined
      ? this.normalizarTelefone(dados.telefone)
      : responsavel.telefone;

    const telefoneEmergenciaAtualizado =
      dados.telefone_emergencia !== undefined
        ? this.normalizarTelefoneEmergencia(dados.telefone_emergencia)
        : responsavel.telefone_emergencia;

    let emailAtualizado = responsavel.email;

    if (dados.email !== undefined) {
      emailAtualizado = this.normalizarEmail(dados.email);
    }

    const enderecoAtualizado = dados.endereco !== undefined
      ? this.normalizarEndereco(dados.endereco)
      : responsavel.endereco;

    let quantidadeAtualizada = responsavel.quantidade_alunos;

    if (dados.quantidade_alunos !== undefined) {
      quantidadeAtualizada = this.normalizarQuantidadeAlunos(
        dados.quantidade_alunos
      );
    }

    await this.validarContatosUnicos(
      telefoneAtualizado,
      telefoneEmergenciaAtualizado,
      emailAtualizado,
      responsavel.id_responsavel
    );

    this.responsavelRepository.merge(responsavel, {
      nome: nomeAtualizado,
      telefone: telefoneAtualizado,
      telefone_emergencia: telefoneEmergenciaAtualizado,
      email: emailAtualizado,
      endereco: enderecoAtualizado,
      quantidade_alunos: quantidadeAtualizada,
    });

    await this.salvarResponsavel(responsavel);

    return this.montarResumo(responsavel);
  }

  async deletar(id_responsavel: number) {
    await AppDataSource.transaction(async (manager) => {
      const responsavelRepository = manager.getRepository(Responsavel);
      const responsavel = await responsavelRepository.findOneBy({ id_responsavel });

      if (!responsavel) {
        throw new Error("Responsável não encontrado");
      }

      const alunos = await manager.getRepository(Aluno).find({
        where: { id_responsavel },
        select: { id_aluno: true },
      });

      for (const aluno of alunos) {
        await manager.getRepository(Presenca).delete({ id_aluno: aluno.id_aluno });
        await manager.getRepository(Mensalidade).delete({ id_aluno: aluno.id_aluno });
        await manager.getRepository(ItinerarioAluno).delete({ id_aluno: aluno.id_aluno });
      }

      await manager.getRepository(Aluno).delete({ id_responsavel });
      await responsavelRepository.delete({ id_responsavel });
    });

    return {
      message: "Responsável excluído com sucesso",
    };
  }
}
