import { AppDataSource } from "../config/database";
import { Presenca } from "../models/model_presenca";

type Turno = "MANHA" | "TARDE" | "NOITE";
type Tipo = "IDA" | "VOLTA";
type Status = "PRESENTE" | "AUSENTE";

export class ServicePresenca {
  private normalizarTurno(turno: any): Turno {
    const valor = String(turno ?? "").trim().toUpperCase();

    if (!["MANHA", "TARDE", "NOITE"].includes(valor)) {
      throw new Error("Turno inválido. Use MANHA, TARDE ou NOITE.");
    }

    return valor as Turno;
  }

  private normalizarTipo(tipo: any): Tipo {
    const valor = String(tipo ?? "").trim().toUpperCase();

    if (!["IDA", "VOLTA"].includes(valor)) {
      throw new Error("Tipo inválido. Use IDA ou VOLTA.");
    }

    return valor as Tipo;
  }

  private validarDataNaoFutura(data: Partial<Presenca>["data"]) {
    const valor = String(data ?? "");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return;

    const hoje = new Date();
    const hojeISO = [
      hoje.getFullYear(),
      String(hoje.getMonth() + 1).padStart(2, "0"),
      String(hoje.getDate()).padStart(2, "0"),
    ].join("-");

    if (valor > hojeISO) {
      throw new Error("Não é possível criar uma presença com data futura");
    }
  }

  // Regra de negócio da observação:
  // - só é mantida quando o registro está AUSENTE;
  // - ao voltar para PRESENTE, a observação é sempre limpa, para não
  //   deixar uma justificativa de ausência "pendurada" num registro que
  //   já não representa mais uma ausência;
  // - strings vazias/só espaço viram null (não fica lixo salvo no banco).
  private aplicarRegraObservacao(statusFinal: Status, dados: Partial<Presenca>) {
    if (statusFinal === "PRESENTE") {
      dados.observacao = null;
      return;
    }

    if (dados.observacao !== undefined) {
      const texto = String(dados.observacao ?? "").trim();
      dados.observacao = texto.length ? texto : null;
    }
  }

  async listar() {
    const repo = AppDataSource.getRepository(Presenca);

    return await repo.find({
      relations: { aluno: true },
      order: { data: "DESC", id_presenca: "DESC" },
    });
  }

  // Aceita filtro opcional por turno e, dentro do turno, por tipo
  // (IDA/VOLTA) — necessário porque a TARDE tem duas chamadas
  // independentes dentro do mesmo turno.
  async listarPorData(data: string, turno?: string, tipo?: string) {
    const repo = AppDataSource.getRepository(Presenca);

    const where: any = { data };

    if (turno !== undefined) {
      where.turno = this.normalizarTurno(turno);
    }

    if (tipo !== undefined) {
      where.tipo = this.normalizarTipo(tipo);
    }

    return await repo.find({
      where,
      relations: { aluno: true },
      order: { id_presenca: "ASC" },
    });
  }

  // Cria ou atualiza (upsert) o registro de presença de UM aluno para
  // uma combinação de data + turno + tipo. Evita duplicidade: se já
  // existir presença para aluno + data + turno + tipo, atualiza em vez
  // de criar outra linha (mesma estratégia já usada antes desta
  // alteração, agora também considerando o tipo).
  async criar(dados: Partial<Presenca>) {
    this.validarDataNaoFutura(dados.data);

    if (!dados.id_aluno) {
      throw new Error("Aluno é obrigatório");
    }

    const turno = this.normalizarTurno(dados.turno);
    const tipo = this.normalizarTipo(dados.tipo);
    const repo = AppDataSource.getRepository(Presenca);

    const existente = await repo.findOne({
      where: {
        id_aluno: Number(dados.id_aluno),
        data: dados.data as any,
        turno,
        tipo,
      },
    });

    const dadosNormalizados: Partial<Presenca> = {
      ...dados,
      id_aluno: Number(dados.id_aluno),
      turno,
      tipo,
    };

    const statusFinal = (dadosNormalizados.status as Status) || existente?.status;

    if (!statusFinal) {
      throw new Error("Status é obrigatório (PRESENTE ou AUSENTE)");
    }

    this.aplicarRegraObservacao(statusFinal, dadosNormalizados);

    if (existente) {
      repo.merge(existente, dadosNormalizados);
      return await repo.save(existente);
    }

    const presenca = repo.create(dadosNormalizados);
    return await repo.save(presenca);
  }

  async atualizar(id: number, dados: Partial<Presenca>) {
    const repo = AppDataSource.getRepository(Presenca);

    const presenca = await repo.findOne({
      where: { id_presenca: id },
    });

    if (!presenca) {
      throw new Error("Presença inválida (não encontrada)");
    }

    if (dados.data !== undefined) {
      this.validarDataNaoFutura(dados.data);
    }

    const dadosAtualizados: Partial<Presenca> = { ...dados };

    if (dados.turno !== undefined) {
      dadosAtualizados.turno = this.normalizarTurno(dados.turno);
    }

    if (dados.tipo !== undefined) {
      dadosAtualizados.tipo = this.normalizarTipo(dados.tipo);
    }

    if (dados.id_aluno !== undefined) {
      dadosAtualizados.id_aluno = Number(dados.id_aluno);
    }

    const statusFinal = (dadosAtualizados.status as Status) || presenca.status;
    this.aplicarRegraObservacao(statusFinal, dadosAtualizados);

    repo.merge(presenca, dadosAtualizados);

    return await repo.save(presenca);
  }

  async deletar(id: number) {
    const repo = AppDataSource.getRepository(Presenca);
    const presenca = await repo.findOne({ where: { id_presenca: id } });

    if (!presenca) {
      throw new Error("Presença não encontrada");
    }

    await repo.remove(presenca);
    return { message: "Presença removida" };
  }
}