import { AppDataSource } from "../config/database";
import { Aluno } from "../models/model_aluno";
import { Responsavel } from "../models/model_responsavel";
import { Mensalidade } from "../models/model_mensalidade";
import { Presenca } from "../models/model_presenca";
import { Escola } from "../models/model_escola";

export class ServiceAluno {
  private get alunoRepository() {
    return AppDataSource.getRepository(Aluno);
  }

  private get responsavelRepository() {
    return AppDataSource.getRepository(Responsavel);
  }

  private get mensalidadeRepository() {
    return AppDataSource.getRepository(Mensalidade);
  }

  private get presencaRepository() {
    return AppDataSource.getRepository(Presenca);
  }

  private get escolaRepository() {
    return AppDataSource.getRepository(Escola);
  }

  private async validarResponsavel(id_responsavel: any) {
    const idResponsavel = Number(id_responsavel);

    if (!Number.isInteger(idResponsavel) || idResponsavel <= 0) {
      throw new Error("Responsável é obrigatório para cadastrar aluno");
    }

    const responsavel = await this.responsavelRepository.findOneBy({
      id_responsavel: idResponsavel,
    });

    if (!responsavel) {
      throw new Error("Responsável não encontrado");
    }

    return responsavel;
  }

  private async validarEscola(id_escola: any) {
    const idEscola = Number(id_escola);

    if (!Number.isInteger(idEscola) || idEscola <= 0) {
      throw new Error("Escola é obrigatória para cadastrar aluno");
    }

    const escola = await this.escolaRepository.findOneBy({
      id_escola: idEscola,
    });

    if (!escola) {
      throw new Error("Escola não encontrada");
    }

    return escola;
  }

  private limparCamposAntigos(dados: Partial<Aluno> & any) {
    /*
      Removido do fluxo:
      O sistema antigo recebia responsavel_nome e responsavel_telefone.
      Agora o aluno deve ser vinculado por id_responsavel.

      ALTERADO:
      O sistema antigo também recebia "escola" como texto livre.
      Agora o aluno deve ser vinculado por id_escola.
    */
    delete dados.responsavel_nome;
    delete dados.responsavel_telefone;
    delete dados.escola;

    return dados;
  }

  async listarResponsaveis() {
    return await this.responsavelRepository.find({
      select: {
        id_responsavel: true,
        nome: true,
        telefone: true,
        quantidade_alunos: true,
      },
      order: {
        nome: "ASC",
      },
    });
  }

  async listarEscolas() {
    return await this.escolaRepository.find({
      select: {
        id_escola: true,
        nome: true,
      },
      order: {
        nome: "ASC",
      },
    });
  }

  async listar() {
    return await this.alunoRepository.find({
      relations: {
        responsavel: true,
        condutor: true,
        escola: true,
      },
      order: {
        nome: "ASC",
      },
    });
  }

  async buscarPorID(id: number) {
    const aluno = await this.alunoRepository.findOne({
      where: { id_aluno: id },
      relations: {
        responsavel: true,
        condutor: true,
        escola: true,
      },
    });

    if (!aluno) {
      throw new Error("Aluno não encontrado");
    }

    return aluno;
  }

  async criar(dados: Partial<Aluno> & any) {
    this.limparCamposAntigos(dados);

    if (!dados.nome?.trim()) {
      throw new Error("Nome do aluno é obrigatório");
    }

    const responsavel = await this.validarResponsavel(dados.id_responsavel);
    const escola = await this.validarEscola(dados.id_escola);

    const aluno = this.alunoRepository.create({
      nome: dados.nome.trim(),
      bairro: dados.bairro?.trim() || null,
      vencimento: dados.vencimento || null,
      id_escola: escola.id_escola,
      turno: dados.turno || null,
      endereco_embarque: dados.endereco_embarque?.trim() || null,
      endereco_desembarque: dados.endereco_desembarque?.trim() || null,
      tipo_trajeto: dados.tipo_trajeto || null,
      foto: dados.foto || null,
      id_responsavel: responsavel.id_responsavel,
      id_condutor: dados.id_condutor ? Number(dados.id_condutor) : null,
    });

    await this.alunoRepository.save(aluno);

    return await this.buscarPorID(aluno.id_aluno);
  }

  async atualizar(id: number, dados: Partial<Aluno> & any) {
    this.limparCamposAntigos(dados);

    const aluno = await this.alunoRepository.findOneBy({
      id_aluno: id,
    });

    if (!aluno) {
      throw new Error("Aluno não encontrado");
    }

    if (dados.nome !== undefined && !dados.nome.trim()) {
      throw new Error("Nome do aluno é obrigatório");
    }

    if (dados.id_responsavel !== undefined) {
      const responsavel = await this.validarResponsavel(dados.id_responsavel);
      aluno.id_responsavel = responsavel.id_responsavel;
    }

    if (dados.id_escola !== undefined) {
      const escola = await this.validarEscola(dados.id_escola);
      aluno.id_escola = escola.id_escola;
    }

    if (dados.nome !== undefined) {
      aluno.nome = dados.nome.trim();
    }

    if (dados.bairro !== undefined) {
      aluno.bairro = dados.bairro?.trim() || null;
    }

    if (dados.vencimento !== undefined) {
      aluno.vencimento = dados.vencimento || null;
    }

    if (dados.turno !== undefined) {
      aluno.turno = dados.turno || null;
    }

    if (dados.endereco_embarque !== undefined) {
      aluno.endereco_embarque = dados.endereco_embarque?.trim() || null;
    }

    if (dados.endereco_desembarque !== undefined) {
      aluno.endereco_desembarque = dados.endereco_desembarque?.trim() || null;
    }

    if (dados.tipo_trajeto !== undefined) {
      aluno.tipo_trajeto = dados.tipo_trajeto || null;
    }

    if (dados.foto !== undefined) {
      aluno.foto = dados.foto || null;
    }

    if (dados.id_condutor !== undefined) {
      aluno.id_condutor = dados.id_condutor ? Number(dados.id_condutor) : null;
    }

    await this.alunoRepository.save(aluno);

    return await this.buscarPorID(aluno.id_aluno);
  }

  async deletar(id_aluno: number) {
    const aluno = await this.alunoRepository.findOne({
      where: { id_aluno },
    });

    if (!aluno) {
      throw new Error("Aluno não encontrado");
    }

    /*
      Mantido por segurança:
      Mesmo com FK cascade no banco, apagamos dependências diretas antes
      para evitar conflito em ambientes onde o schema esteja diferente.
    */
    await this.presencaRepository.delete({ id_aluno });
    await this.mensalidadeRepository.delete({ id_aluno });

    await this.alunoRepository.remove(aluno);

    return {
      message: "Aluno excluído com sucesso",
    };
  }
}