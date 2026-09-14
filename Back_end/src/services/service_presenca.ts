import { AppDataSource } from "../config/database";
import { Presenca } from "../models/model_presenca";

type Turno = "MANHA" | "TARDE" | "NOITE";

export class ServicePresenca {
  private normalizarTurno(turno: any): Turno {
    const valor = String(turno ?? "").trim().toUpperCase();

    if (!["MANHA", "TARDE", "NOITE"].includes(valor)) {
      throw new Error("Turno inválido. Use MANHA, TARDE ou NOITE.");
    }

    return valor as Turno;
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

  async listar() {
    const repo = AppDataSource.getRepository(Presenca);

    return await repo.find({
      relations: { aluno: true },
      order: { data: "DESC", id_presenca: "DESC" },
    });
  }

  async listarPorData(data: string, turno?: string) {
    const repo = AppDataSource.getRepository(Presenca);

    const where: any = { data };

    if (turno !== undefined) {
      where.turno = this.normalizarTurno(turno);
    }

    return await repo.find({
      where,
      relations: { aluno: true },
      order: { id_presenca: "ASC" },
    });
  }

  async criar(dados: Partial<Presenca>) {
    this.validarDataNaoFutura(dados.data);

    if (!dados.id_aluno) {
      throw new Error("Aluno é obrigatório");
    }

    const turno = this.normalizarTurno(dados.turno);
    const repo = AppDataSource.getRepository(Presenca);

    const existente = await repo.findOne({
      where: {
        id_aluno: Number(dados.id_aluno),
        data: dados.data as any,
        turno,
      },
    });

    if (existente) {
      repo.merge(existente, { ...dados, turno });
      return await repo.save(existente);
    }

    const presenca = repo.create({
      ...dados,
      id_aluno: Number(dados.id_aluno),
      turno,
    });

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

    if (dados.id_aluno !== undefined) {
      dadosAtualizados.id_aluno = Number(dados.id_aluno);
    }

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
