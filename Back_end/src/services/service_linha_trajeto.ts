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

  // A Linha de Trajeto é UMA ÚNICA sequência física, e sua ordem vem
  // exclusivamente do Itinerário (ia.ordem) — nunca de nome, id ou
  // status do aluno. O Itinerário pode misturar entradas IDA e VOLTA
  // no mesmo turno (ex.: TARDE), e é exatamente essa ordem física que
  // a linha reproduz.
  //
  // Para cada entrada do itinerário, a presença correspondente é
  // buscada por aluno + data + turno + TIPO (não apenas aluno + data +
  // turno). Sem registro de presença para aquela combinação, a entrada
  // é considerada PRESENTE por padrão. Só é removida da linha a
  // entrada cujo registro explícito seja AUSENTE — e a remoção afeta
  // somente aquela entrada (aquele aluno+tipo), nunca outra entrada do
  // mesmo aluno com tipo diferente.
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

    const itens: any[] = await AppDataSource.query(
      `SELECT
         ia.id_itinerario AS itemId,
         ia.id_aluno AS alunoId,
         ia.turno AS turno,
         ia.tipo AS tipo,
         ia.ordem AS ordem,
         a.nome AS nome,
         a.foto AS foto,
         e.nome AS escola,
         CASE
           WHEN ia.tipo = 'IDA' THEN a.endereco_embarque
           ELSE a.endereco_desembarque
         END AS endereco,
         COALESCE(p.status, 'PRESENTE') AS status
       FROM itinerario_aluno ia
       INNER JOIN aluno a
         ON a.id_aluno = ia.id_aluno
       LEFT JOIN escola e
         ON e.id_escola = a.id_escola
       LEFT JOIN presenca p
         ON p.id_aluno = ia.id_aluno
         AND p.data = ?
         AND p.turno = ia.turno
         AND p.tipo = ia.tipo
       WHERE ia.id_condutor = ?
         AND ia.turno = ?
       ORDER BY ia.ordem ASC, ia.id_itinerario ASC`,
      [data, idCondutor, turno]
    );

    // Preserva a ordem física do Itinerário; remove apenas as entradas
    // (aluno + tipo) marcadas explicitamente como AUSENTE. As demais
    // posições permanecem na mesma ordem relativa entre si.
    const alunosNaLinha = itens
      .filter((item) => String(item.status).toUpperCase() !== "AUSENTE")
      .map((item) => ({
        itemId: String(item.itemId),
        alunoId: Number(item.alunoId),
        nome: item.nome,
        foto: item.foto || null,
        escola: item.escola || null,
        endereco: item.endereco || null,
        tipo: String(item.tipo).toLowerCase(),
        ordem: Number(item.ordem),
      }));

    return {
      data,
      turno,
      alunos: alunosNaLinha,
    };
  }
}