import { AppDataSource } from "../config/database";
import { ServiceItinerario } from "./service_itinerario";

type Turno = "MANHA" | "TARDE" | "NOITE";

export class ServiceLinhaTrajeto {
  private itinerarioService = new ServiceItinerario();

  private normalizarTurno(valor: string): Turno {
    const turno = String(valor || "").trim().toUpperCase();

    if (!["MANHA", "TARDE", "NOITE"].includes(turno)) {
      throw new Error("Turno inválido. Use MANHA, TARDE ou NOITE.");
    }

    return turno as Turno;
  }

  async listar(
    usuario: { id: number; role: "CONDUTOR" | "MONITOR" },
    data: string,
    turnoInformado: string
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw new Error("Data inválida. Use o formato YYYY-MM-DD.");
    }

    const turno = this.normalizarTurno(turnoInformado);
    const idCondutor = await this.itinerarioService.resolverIdCondutor(usuario);

    const linhas: any[] = await AppDataSource.query(
      `SELECT
         ia.id_itinerario AS itemId,
         ia.id_aluno AS alunoId,
         ia.turno AS turno,
         ia.tipo AS tipo,
         ia.ordem AS ordem,
         a.nome AS nome,
         e.nome AS escola,
         CASE
           WHEN ia.tipo = 'IDA' THEN a.endereco_embarque
           ELSE a.endereco_desembarque
         END AS endereco
       FROM itinerario_aluno ia
       INNER JOIN aluno a
         ON a.id_aluno = ia.id_aluno
       LEFT JOIN escola e
         ON e.id_escola = a.id_escola
       WHERE ia.id_condutor = ?
         AND ia.turno = ?
         AND EXISTS (
           SELECT 1
           FROM presenca p
           WHERE p.id_aluno = ia.id_aluno
             AND p.data = ?
             AND p.turno = ?
             AND p.status = 'PRESENTE'
         )
       ORDER BY ia.ordem ASC, ia.id_itinerario ASC`,
      [idCondutor, turno, data, turno]
    );

    return {
      data,
      turno,
      alunos: linhas.map((linha) => ({
        itemId: String(linha.itemId),
        alunoId: Number(linha.alunoId),
        nome: linha.nome,
        escola: linha.escola || null,
        endereco: linha.endereco || null,
        tipo: String(linha.tipo).toLowerCase(),
        ordem: Number(linha.ordem),
      })),
    };
  }
}
