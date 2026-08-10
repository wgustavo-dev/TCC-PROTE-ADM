// src/services/itinerarioService.ts
//
// Define duas funções. Elas NÃO rodam sozinhas — você precisa
// chamá-las de dentro do controller de aluno que já existe,
// depois que o cadastro/edição der certo:
//
//   import { criarItensItinerario, sincronizarItensItinerario } from "../services/itinerarioService";
//
//   // depois de criar um aluno novo com sucesso:
//   await criarItensItinerario(novoAluno.id_aluno, novoAluno.id_condutor, novoAluno.turno, novoAluno.tipo_trajeto);
//
//   // depois de editar um aluno (turno e/ou tipo_trajeto podem ter mudado):
//   await sincronizarItensItinerario(aluno.id_aluno, aluno.id_condutor, aluno.turno, aluno.tipo_trajeto);

import { AppDataSource } from "../config/database";

type TipoTrajeto = "IDA" | "VOLTA" | "AMBOS";
type Turno = "MANHA" | "TARDE" | "NOITE";

// tipo_trajeto do cadastro -> quais linhas devem existir no itinerário
const TIPOS_POR_TRAJETO: Record<TipoTrajeto, string[]> = {
  IDA: ["IDA"],
  VOLTA: ["VOLTA"],
  AMBOS: ["IDA", "VOLTA"],
};

async function proximaOrdem(turno: Turno, idCondutor: number): Promise<number> {
  const linhas: any[] = await AppDataSource.query(
    "SELECT COALESCE(MAX(ordem), 0) AS max_ordem FROM itinerario_aluno WHERE turno = ? AND id_condutor = ?",
    [turno, idCondutor]
  );
  return linhas[0].max_ordem + 1;
}

// Usar no CADASTRO de um aluno novo.
export async function criarItensItinerario(
  idAluno: number,
  idCondutor: number,
  turno: Turno,
  tipoTrajeto: TipoTrajeto
): Promise<void> {
  const tipos = TIPOS_POR_TRAJETO[tipoTrajeto] || [];
  for (const tipo of tipos) {
    const ordem = await proximaOrdem(turno, idCondutor);
    await AppDataSource.query(
      "INSERT INTO itinerario_aluno (id_aluno, id_condutor, turno, tipo, ordem) VALUES (?, ?, ?, ?, ?)",
      [idAluno, idCondutor, turno, tipo, ordem]
    );
  }
}

// Usar na EDIÇÃO de um aluno (turno ou tipo_trajeto podem ter mudado).
// Remove o que não é mais válido, mantém o que continua valendo (sem
// mexer na ordem), e adiciona o que estiver faltando no fim da fila.
export async function sincronizarItensItinerario(
  idAluno: number,
  idCondutor: number,
  novoTurno: Turno,
  novoTipoTrajeto: TipoTrajeto
): Promise<void> {
  const tiposDesejados = TIPOS_POR_TRAJETO[novoTipoTrajeto] || [];

  const existentes: any[] = await AppDataSource.query(
    "SELECT id_itinerario, turno, tipo FROM itinerario_aluno WHERE id_aluno = ?",
    [idAluno]
  );

  for (const item of existentes) {
    const aindaVale = item.turno === novoTurno && tiposDesejados.includes(item.tipo);
    if (!aindaVale) {
      await AppDataSource.query(
        "DELETE FROM itinerario_aluno WHERE id_itinerario = ?",
        [item.id_itinerario]
      );
    }
  }

  const restantes: any[] = await AppDataSource.query(
    "SELECT tipo FROM itinerario_aluno WHERE id_aluno = ? AND turno = ?",
    [idAluno, novoTurno]
  );
  const tiposJaExistentes = restantes.map((r) => r.tipo);

  for (const tipo of tiposDesejados) {
    if (!tiposJaExistentes.includes(tipo)) {
      const ordem = await proximaOrdem(novoTurno, idCondutor);
      await AppDataSource.query(
        "INSERT INTO itinerario_aluno (id_aluno, id_condutor, turno, tipo, ordem) VALUES (?, ?, ?, ?, ?)",
        [idAluno, idCondutor, novoTurno, tipo, ordem]
      );
    }
  }
}