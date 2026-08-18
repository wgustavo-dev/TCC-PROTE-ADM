

import { AppDataSource } from "../config/database";
import { ItinerarioAluno } from "../models/model_itinerario";
import { Aluno } from "../models/model_aluno";
import { Monitor } from "../models/model_monitor";

type TipoTrajeto = "IDA" | "VOLTA" | "AMBOS";
type Periodo = "MANHA" | "TARDE" | "NOITE";
type TipoRegistro = "IDA" | "VOLTA";

interface UsuarioAutenticado {
  id: number;
  role: "CONDUTOR" | "MONITOR";
}

interface ItemOrdem {
  itemId: string | number;
  ordem: number;
}

const TIPOS_POR_TRAJETO: Record<TipoTrajeto, TipoRegistro[]> = {
  IDA: ["IDA"],
  VOLTA: ["VOLTA"],
  AMBOS: ["IDA", "VOLTA"],
};

function derivarPeriodo(turnoAluno: "MANHA" | "TARDE", tipoRegistro: TipoRegistro): Periodo {
  if (turnoAluno === "MANHA") {
    return tipoRegistro === "IDA" ? "MANHA" : "TARDE";
  }

  // turnoAluno === "TARDE"
  return tipoRegistro === "IDA" ? "TARDE" : "NOITE";
}

// Registros (período + tipo) que o aluno DEVERIA ter no itinerário hoje.
function registrosEsperados(aluno: Aluno): { periodo: Periodo; tipo: TipoRegistro }[] {
  if (!aluno.turno || !aluno.tipo_trajeto) return [];

  const tipos = TIPOS_POR_TRAJETO[aluno.tipo_trajeto] || [];
  return tipos.map((tipo) => ({
    periodo: derivarPeriodo(aluno.turno, tipo),
    tipo,
  }));
}

export class ServiceItinerario {
  private itinerarioRepository = AppDataSource.getRepository(ItinerarioAluno);
  private alunoRepository = AppDataSource.getRepository(Aluno);
  private monitorRepository = AppDataSource.getRepository(Monitor);

  // O token só guarda id + role (CONDUTOR ou MONITOR), nunca o
  // id_condutor direto. Se for monitor, busca no banco a qual condutor
  // ele pertence (mesma regra usada nos outros módulos com Monitor).
  async resolverIdCondutor(usuario: UsuarioAutenticado): Promise<number> {
    if (usuario.role === "CONDUTOR") {
      return usuario.id;
    }

    const monitor = await this.monitorRepository.findOne({
      where: { id_monitor: usuario.id },
    });

    if (!monitor) {
      throw new Error("Monitor sem condutor vinculado.");
    }

    return monitor.id_condutor;
  }

  private async proximaOrdem(idCondutor: number, periodo: Periodo): Promise<number> {
    const ultimo = await this.itinerarioRepository
      .createQueryBuilder("item")
      .select("MAX(item.ordem)", "maxOrdem")
      .where("item.id_condutor = :idCondutor", { idCondutor })
      .andWhere("item.turno = :periodo", { periodo })
      .getRawOne<{ maxOrdem: number | null }>();

    return (ultimo?.maxOrdem || 0) + 1;
  }

  // Sincroniza o itinerário de UM aluno: remove o que não faz mais
  // sentido (trajeto/turno mudou), mantém o que continua valendo (sem
  // mexer na ordem) e cria o que estiver faltando no fim da fila do
  // período certo. Usada tanto pelo cadastro/edição de aluno (hook
  // chamado de dentro de service_aluno.ts) quanto pela sincronização em
  // massa que roda a cada fetch (sincronizarTodos).
  async sincronizarAluno(aluno: Aluno): Promise<void> {
    const existentes = await this.itinerarioRepository.find({
      where: { id_aluno: aluno.id_aluno },
    });

    if (!aluno.id_condutor) {
      // Sem condutor vinculado não há como saber em qual rota encaixar
      // o aluno — remove qualquer entrada antiga que tenha sobrado.
      for (const item of existentes) {
        await this.itinerarioRepository.remove(item);
      }
      return;
    }

    const esperados = registrosEsperados(aluno);

    // remove o que não é mais válido
    for (const item of existentes) {
      const aindaVale = esperados.some(
        (esperado) => esperado.periodo === item.turno && esperado.tipo === item.tipo
      );

      if (!aindaVale) {
        await this.itinerarioRepository.remove(item);
      }
    }

    // cria o que está faltando
    for (const esperado of esperados) {
      const jaExiste = await this.itinerarioRepository.findOne({
        where: { id_aluno: aluno.id_aluno, turno: esperado.periodo, tipo: esperado.tipo },
      });

      if (!jaExiste) {
        const ordem = await this.proximaOrdem(aluno.id_condutor, esperado.periodo);
        const novoItem = this.itinerarioRepository.create({
          id_aluno: aluno.id_aluno,
          id_condutor: aluno.id_condutor,
          turno: esperado.periodo,
          tipo: esperado.tipo,
          ordem,
        });
        await this.itinerarioRepository.save(novoItem);
      }
    }
  }

  // Roda a sincronização para TODOS os alunos de um condutor de uma vez.
  // Chamada no início de `listarAgrupado`, então toda vez que a tela de
  // Itinerários é aberta a tabela já se "auto-corrige" antes de responder.
  async sincronizarTodos(idCondutor: number): Promise<void> {
    const alunos = await this.alunoRepository.find({
      where: { id_condutor: idCondutor },
    });

    for (const aluno of alunos) {
      await this.sincronizarAluno(aluno);
    }

    // Limpeza extra: remove itens órfãos (alunos que não pertencem mais
    // a este condutor, mas cuja linha antiga ainda não tinha sido
    // removida — por exemplo, aluno.id_condutor foi trocado depois do
    // cadastro).
    const idsAlunosAtuais = alunos.map((aluno) => aluno.id_aluno);
    const itensDoCondutor = await this.itinerarioRepository.find({
      where: { id_condutor: idCondutor },
    });

    for (const item of itensDoCondutor) {
      if (!idsAlunosAtuais.includes(item.id_aluno)) {
        await this.itinerarioRepository.remove(item);
      }
    }
  }

  // GET /api/itinerarios
  // Sincroniza tudo e devolve os itens já agrupados por período, no
  // mesmo formato que o front (itinerarios.js) espera.
  async listarAgrupado(idCondutor: number) {
    await this.sincronizarTodos(idCondutor);

    const itens = await this.itinerarioRepository.find({
      where: { id_condutor: idCondutor },
      relations: { aluno: true },
      order: { turno: "ASC", ordem: "ASC" },
    });

    const resultado: Record<string, any[]> = { manha: [], tarde: [], noite: [] };

    for (const item of itens) {
      const chave = item.turno.toLowerCase();
      const endereco = item.tipo === "IDA" ? item.aluno.endereco_embarque : item.aluno.endereco_desembarque;

      resultado[chave].push({
        itemId: String(item.id_itinerario),
        alunoId: item.id_aluno,
        nome: item.aluno.nome,
        endereco,
        tipo: item.tipo.toLowerCase(),
      });
    }

    return resultado;
  }

  // PUT /api/itinerarios/ordem
  // Recebe { manha: [{itemId, ordem}], tarde: [...], noite: [...] } e
  // grava a nova ordem de arrastar-e-soltar, uma por uma, só para itens
  // que realmente pertencem ao condutor autenticado.
  async atualizarOrdem(idCondutor: number, payload: Record<string, ItemOrdem[]>): Promise<void> {
    const periodos: Periodo[] = ["MANHA", "TARDE", "NOITE"];

    await AppDataSource.transaction(async (manager) => {
      const repoTransacional = manager.getRepository(ItinerarioAluno);

      for (const periodo of periodos) {
        const chave = periodo.toLowerCase();
        const itens = payload[chave] || payload[periodo] || [];

        for (const item of itens) {
          await repoTransacional.update(
            { id_itinerario: Number(item.itemId), id_condutor: idCondutor },
            { ordem: item.ordem }
          );
        }
      }
    });
  }

  // Usada pela exclusão de aluno (service_aluno.ts). Existe separada de
  // sincronizarTodos/sincronizarAluno porque aqui o aluno já não existe
  // mais no banco (foi excluído antes de chamar isto).
  async removerPorAluno(idAluno: number): Promise<void> {
    await this.itinerarioRepository.delete({ id_aluno: idAluno });
  }
}