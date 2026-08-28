import { AppDataSource } from "../config/database";
import { Aluno } from "../models/model_aluno";
import { Responsavel } from "../models/model_responsavel";
import { Mensalidade } from "../models/model_mensalidade";
import { Presenca } from "../models/model_presenca";
import { Escola } from "../models/model_escola";
import { ItinerarioAluno } from "../models/model_itinerario";
import { ServiceItinerario } from "./service_itinerario";

interface UsuarioLogado {
  id: number;
  role: "CONDUTOR" | "MONITOR";
}

export class ServiceAluno {
  private itinerarioService = new ServiceItinerario();

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

  private async sincronizarQuantidadeAlunos(idResponsavel: number) {
    const quantidade = await this.alunoRepository.count({
      where: { id_responsavel: idResponsavel },
    });

    await this.responsavelRepository.update(
      { id_responsavel: idResponsavel },
      { quantidade_alunos: quantidade }
    );
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

  // Mantém o itinerário em dia com o cadastro. `sincronizarAluno` (do
  // service_itinerario, agora via TypeORM) já sabe lidar sozinho com o
  // caso de o aluno não ter turno/tipo_trajeto/condutor completos —
  // não precisa de tratamento especial aqui.
  private async resolverIdCondutorParaAluno(
    dados: Partial<Aluno> & any,
    usuarioLogado?: UsuarioLogado
  ): Promise<number | null> {
    const idCondutorInformado = dados.id_condutor ?? dados.idCondutor;

    if (idCondutorInformado !== undefined && idCondutorInformado !== null && idCondutorInformado !== "") {
      return Number(idCondutorInformado);
    }

    if (!usuarioLogado) {
      return null;
    }

    return await this.itinerarioService.resolverIdCondutor(usuarioLogado);
  }

  private async sincronizarItinerarioDoAluno(aluno: Aluno) {
    // try/catch aqui de propósito: se a sincronização do itinerário
    // falhar por qualquer motivo, isso NÃO pode derrubar o
    // cadastro/edição do aluno — só avisa no console. Vale lembrar que,
    // mesmo se isso falhar, o próximo GET /api/itinerarios se
    // autocorrige sozinho (ver ServiceItinerario.listarAgrupado).
    try {
      await this.itinerarioService.sincronizarAluno(aluno);
    } catch (error) {
      console.error("Falha ao sincronizar itinerário do aluno:", error);
    }
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

  private normalizarTurno(turno: any): "MANHA" | "TARDE" | null {
    const valor = String(turno ?? "").trim().toUpperCase();

    if (!valor) return null;

    if (valor === "MANHA" || valor === "TARDE") {
      return valor;
    }

    throw new Error("Turno inválido. Use MANHA ou TARDE.");
  }

  private normalizarTipoTrajeto(tipo: any): "IDA" | "VOLTA" | "AMBOS" | null {
    const valor = String(tipo ?? "").trim().toUpperCase();

    if (!valor) return null;

    if (valor === "IDA" || valor === "VOLTA" || valor === "AMBOS") {
      return valor;
    }

    throw new Error("Tipo de trajeto inválido. Use IDA, VOLTA ou AMBOS.");
  }

  /*
    Regra de negócio (endereços por tipo de trajeto):
    - IDA         -> só endereço de embarque (não tem desembarque, o
                      destino já é a escola).
    - VOLTA       -> só endereço de desembarque (não tem embarque, a
                      origem já é a escola).
    - IDA E VOLTA -> tem os dois endereços.
    Aqui o backend garante essa regra mesmo que o front mande os dois
    campos preenchidos: o que não faz sentido para o trajeto é limpo.
  */
  private aplicarRegraEnderecoPorTrajeto(
    tipoTrajeto: "IDA" | "VOLTA" | "AMBOS" | null,
    embarque: string | null,
    desembarque: string | null
  ) {
    if (tipoTrajeto === "IDA") {
      return { embarque, desembarque: null };
    }

    if (tipoTrajeto === "VOLTA") {
      return { embarque: null, desembarque };
    }

    return { embarque, desembarque };
  }

  async criar(dados: Partial<Aluno> & any, usuarioLogado?: UsuarioLogado) {
    this.limparCamposAntigos(dados);

    if (!dados.nome?.trim()) {
      throw new Error("Nome do aluno é obrigatório");
    }

    const turno = this.normalizarTurno(dados.turno);
    const tipoTrajeto = this.normalizarTipoTrajeto(dados.tipo_trajeto);
    const idCondutor = await this.resolverIdCondutorParaAluno(dados, usuarioLogado);

    const responsavel = await this.validarResponsavel(dados.id_responsavel);
    const escola = await this.validarEscola(dados.id_escola);

    const enderecos = this.aplicarRegraEnderecoPorTrajeto(
      tipoTrajeto,
      dados.endereco_embarque?.trim() || null,
      dados.endereco_desembarque?.trim() || null
    );

    const aluno = this.alunoRepository.create({
      nome: dados.nome.trim(),
      bairro: dados.bairro?.trim() || null,
      id_escola: escola.id_escola,
      turno,
      endereco_embarque: enderecos.embarque,
      endereco_desembarque: enderecos.desembarque,
      tipo_trajeto: tipoTrajeto,
      foto: dados.foto || null,
      id_responsavel: responsavel.id_responsavel,
      id_condutor: idCondutor,
    });

    await this.alunoRepository.save(aluno);
    await this.sincronizarQuantidadeAlunos(aluno.id_responsavel);

    // Gera as entradas do itinerário (ida/volta) se já tiver
    // turno + tipo_trajeto + condutor definidos no cadastro.
    // try/catch de propósito — problema no itinerário não pode
    // impedir o aluno de ser cadastrado.
    await this.sincronizarItinerarioDoAluno(aluno);

    return await this.buscarPorID(aluno.id_aluno);
  }

  async atualizar(id: number, dados: Partial<Aluno> & any, usuarioLogado?: UsuarioLogado) {
    this.limparCamposAntigos(dados);

    const aluno = await this.alunoRepository.findOneBy({
      id_aluno: id,
    });

    if (!aluno) {
      throw new Error("Aluno não encontrado");
    }

    const idResponsavelAnterior = aluno.id_responsavel;

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

    if (dados.turno !== undefined) {
      aluno.turno = this.normalizarTurno(dados.turno);
    }

    if (dados.endereco_embarque !== undefined) {
      aluno.endereco_embarque = dados.endereco_embarque?.trim() || null;
    }

    if (dados.endereco_desembarque !== undefined) {
      aluno.endereco_desembarque = dados.endereco_desembarque?.trim() || null;
    }

    if (dados.tipo_trajeto !== undefined) {
      aluno.tipo_trajeto = this.normalizarTipoTrajeto(dados.tipo_trajeto);
    }

    // Reaplica a regra de endereço por trajeto sempre que o tipo_trajeto
    // e/ou os endereços mudarem, para o dado nunca ficar inconsistente
    // (ex.: aluno IDA com endereco_desembarque preenchido).
    if (dados.tipo_trajeto !== undefined || dados.endereco_embarque !== undefined || dados.endereco_desembarque !== undefined) {
      const enderecos = this.aplicarRegraEnderecoPorTrajeto(
        aluno.tipo_trajeto,
        aluno.endereco_embarque,
        aluno.endereco_desembarque
      );
      aluno.endereco_embarque = enderecos.embarque;
      aluno.endereco_desembarque = enderecos.desembarque;
    }

    if (dados.foto !== undefined) {
      aluno.foto = dados.foto || null;
    }

    if (dados.id_condutor !== undefined) {
      aluno.id_condutor = dados.id_condutor ? Number(dados.id_condutor) : null;
    } else if (usuarioLogado && aluno.id_condutor === null) {
      aluno.id_condutor = await this.itinerarioService.resolverIdCondutor(usuarioLogado);
    }

    await this.alunoRepository.save(aluno);
    await this.sincronizarQuantidadeAlunos(idResponsavelAnterior);

    if (aluno.id_responsavel !== idResponsavelAnterior) {
      await this.sincronizarQuantidadeAlunos(aluno.id_responsavel);
    }

    // NOVO: sincroniza o itinerário com o turno/tipo_trajeto/condutor
    // atuais do aluno (cria o que falta, remove o que não vale mais,
    // sem mexer na ordem do que continua válido).
    await this.sincronizarItinerarioDoAluno(aluno);

    return await this.buscarPorID(aluno.id_aluno);
  }

  async deletar(id_aluno: number) {
    let idResponsavel: number | null = null;

    await AppDataSource.transaction(async (manager) => {
      const alunoRepository = manager.getRepository(Aluno);
      const aluno = await alunoRepository.findOneBy({ id_aluno });

      if (!aluno) {
        throw new Error("Aluno não encontrado");
      }

      idResponsavel = aluno.id_responsavel;

      // A remoção é atômica: ou toda a árvore é excluída, ou nada muda.
      // Isso também protege instalações com esquema antigo, sem CASCADE.
      await manager.getRepository(Presenca).delete({ id_aluno });
      await manager.getRepository(Mensalidade).delete({ id_aluno });
      await manager.getRepository(ItinerarioAluno).delete({ id_aluno });
      await alunoRepository.delete({ id_aluno });
    });

    if (idResponsavel !== null) {
      await this.sincronizarQuantidadeAlunos(idResponsavel);
    }

    return {
      message: "Aluno excluído com sucesso",
    };
  }
}
