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
    if (!dados.nome?.trim()) {
      throw new Error("Nome do responsável é obrigatório");
    }

    if (!dados.telefone?.trim()) {
      throw new Error("Telefone do responsável é obrigatório");
    }

    /*
      ALTERADO:
      Email deixou de ser obrigatório.
      Se vier vazio, será salvo como null.
    */
    const email =
      dados.email && dados.email.trim() !== "" ? dados.email.trim() : null;

    if (!dados.endereco?.trim()) {
      throw new Error("Endereço do responsável é obrigatório");
    }

    /*
      ALTERADO:
      quantidade_alunos agora é obrigatória e representa
      a quantidade planejada para o fluxo responsável -> aluno -> mensalidade.
    */
    const quantidadeAlunos = this.normalizarQuantidadeAlunos(
      dados.quantidade_alunos
    );

    const responsavel = this.responsavelRepository.create({
      nome: dados.nome.trim(),
      telefone: dados.telefone.trim(),
      email,
      endereco: dados.endereco.trim(),
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

    if (dados.nome !== undefined && !dados.nome.trim()) {
      throw new Error("Nome do responsável é obrigatório");
    }

    if (dados.telefone !== undefined && !dados.telefone.trim()) {
      throw new Error("Telefone do responsável é obrigatório");
    }

    /*
      ALTERADO:
      Email pode ser vazio.
      Se vier string vazia, salva como null.
    */
    let emailAtualizado = responsavel.email;

    if (dados.email !== undefined) {
      emailAtualizado =
        dados.email && dados.email.trim() !== "" ? dados.email.trim() : null;
    }

    if (dados.endereco !== undefined && !dados.endereco.trim()) {
      throw new Error("Endereço do responsável é obrigatório");
    }

    let quantidadeAtualizada = responsavel.quantidade_alunos;

    if (dados.quantidade_alunos !== undefined) {
      quantidadeAtualizada = this.normalizarQuantidadeAlunos(
        dados.quantidade_alunos
      );
    }

    this.responsavelRepository.merge(responsavel, {
      nome: dados.nome?.trim() ?? responsavel.nome,
      telefone: dados.telefone?.trim() ?? responsavel.telefone,
      email: emailAtualizado,
      endereco: dados.endereco?.trim() ?? responsavel.endereco,
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