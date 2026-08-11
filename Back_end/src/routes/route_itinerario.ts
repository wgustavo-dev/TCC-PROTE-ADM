// Back_end/src/routes/route_itinerario.ts
//
// Segue o mesmo padrão dos outros arquivos de rota (route_aluno.ts
// etc.): as paths aqui dentro NÃO incluem "/api" — o prefixo é
// adicionado no index.ts, na hora de registrar (routes.use('/api', ...)).

import { Router, Response } from "express";
import { AppDataSource } from "../config/database";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
// ajuste o caminho acima se authMiddleware.ts estiver em outra pasta

const router = Router();
const TURNOS = ["manha", "tarde", "noite"];

// O token só guarda "id" + "role" (CONDUTOR ou MONITOR), não o
// id_condutor direto. Se for monitor, busca no banco a qual
// condutor ele pertence.
async function resolverIdCondutor(user: { id: number; role: "CONDUTOR" | "MONITOR" }): Promise<number> {
  if (user.role === "CONDUTOR") {
    return user.id;
  }

  const linhas: any[] = await AppDataSource.query(
    "SELECT id_condutor FROM monitor WHERE id_monitor = ?",
    [user.id]
  );

  if (!linhas.length) {
    throw new Error("Monitor sem condutor vinculado.");
  }

  return linhas[0].id_condutor;
}

// GET /api/itinerarios
router.get("/itinerarios", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const idCondutor = await resolverIdCondutor(req.user!);

    const linhas: any[] = await AppDataSource.query(
      `SELECT
         ia.id_itinerario AS itemId,
         ia.id_aluno      AS alunoId,
         ia.turno         AS turno,
         ia.tipo          AS tipo,
         ia.ordem         AS ordem,
         a.nome           AS nome,
         CASE WHEN ia.tipo = 'IDA'
              THEN a.endereco_embarque
              ELSE a.endereco_desembarque
         END              AS endereco
       FROM itinerario_aluno ia
       JOIN aluno a ON a.id_aluno = ia.id_aluno
       WHERE ia.id_condutor = ?
       ORDER BY ia.turno, ia.ordem`,
      [idCondutor]
    );

    const resultado: Record<string, any[]> = { manha: [], tarde: [], noite: [] };
    linhas.forEach((linha) => {
      const turnoChave = String(linha.turno).toLowerCase();
      resultado[turnoChave].push({
        itemId: String(linha.itemId),
        alunoId: linha.alunoId,
        nome: linha.nome,
        endereco: linha.endereco,
        tipo: String(linha.tipo).toLowerCase(),
      });
    });

    return res.status(200).json(resultado);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erro ao buscar itinerários" });
  }
});

// PUT /api/itinerarios/ordem
router.put("/itinerarios/ordem", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const idCondutor = await resolverIdCondutor(req.user!);
    const payload = req.body as Record<string, { itemId: string; ordem: number }[]>;

    await AppDataSource.manager.transaction(async (manager) => {
      for (const turno of TURNOS) {
        const itens = payload[turno] || [];
        for (const item of itens) {
          await manager.query(
            "UPDATE itinerario_aluno SET ordem = ? WHERE id_itinerario = ? AND id_condutor = ?",
            [item.ordem, item.itemId, idCondutor]
          );
        }
      }
    });

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erro ao salvar ordem" });
  }
});

export default router;