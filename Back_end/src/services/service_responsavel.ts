// Back_end/src/services/service_responsavel.ts

import { AppDataSource } from "../config/database";
import { Aluno } from "../models/model_aluno";
import { Mensalidade } from "../models/model_mensalidade";
import { Presenca } from "../models/model_presenca";
import { Responsavel } from "../models/model_responsavel";

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
    const email = this.normalizarEmail(dados.email);
    const endereco = this.normalizarEndereco(dados.endereco);
    const quantidadeAlunos = this.normalizarQuantidadeAlunos(
      dados.quantidade_alunos
    );

    const responsavel = this.responsavelRepository.create({
      nome,
      telefone,
      email,
      endereco,
      quantidade_alunos: quantidadeAlunos,
    });

    await this.responsavelRepository.save(responsavel);

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

    this.responsavelRepository.merge(responsavel, {
      nome: nomeAtualizado,
      telefone: telefoneAtualizado,
      email: emailAtualizado,
      endereco: enderecoAtualizado,
      quantidade_alunos: quantidadeAtualizada,
    });

    await this.responsavelRepository.save(responsavel);

    return this.montarResumo(responsavel);
  }

  async deletar(id_responsavel: number) {
    const responsavel = await this.responsavelRepository.findOneBy({
      id_responsavel,
    });

    if (!responsavel) {
      throw new Error("Responsável não encontrado");
    }

    const alunos = await this.alunoRepository.find({
      where: { id_responsavel },
    });

    for (const aluno of alunos) {
      await this.presencaRepository.delete({ id_aluno: aluno.id_aluno });
      await this.mensalidadeRepository.delete({ id_aluno: aluno.id_aluno });
    }

    await this.alunoRepository.delete({ id_responsavel });
    await this.responsavelRepository.remove(responsavel);

    return {
      message: "Responsável excluído com sucesso",
    };
  }
}