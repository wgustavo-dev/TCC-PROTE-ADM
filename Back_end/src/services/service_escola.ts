// Back_end/src/services/service_escola.ts

import { AppDataSource } from "../config/database";
import { Escola } from "../models/model_escola";
import { Aluno } from "../models/model_aluno";

export class ServiceEscola {
  private get escolaRepository() {
    return AppDataSource.getRepository(Escola);
  }

  private get alunoRepository() {
    return AppDataSource.getRepository(Aluno);
  }

  async listar() {
    return await this.escolaRepository.find({
      order: {
        nome: "ASC",
      },
    });
  }

  async buscarPorID(id: number) {
    const escola = await this.escolaRepository.findOneBy({
      id_escola: id,
    });

    if (!escola) {
      throw new Error("Escola não encontrada");
    }

    return escola;
  }

  async criar(dados: Partial<Escola>) {
    if (!dados.nome?.trim()) {
      throw new Error("Nome da escola é obrigatório");
    }

    const escola = this.escolaRepository.create({
      nome: dados.nome.trim(),
      endereco: dados.endereco?.trim() || null,
    });

    await this.escolaRepository.save(escola);

    return escola;
  }

  async atualizar(id: number, dados: Partial<Escola>) {
    const escola = await this.escolaRepository.findOneBy({
      id_escola: id,
    });

    if (!escola) {
      throw new Error("Escola não encontrada");
    }

    if (dados.nome !== undefined) {
      if (!dados.nome.trim()) {
        throw new Error("Nome da escola é obrigatório");
      }
      escola.nome = dados.nome.trim();
    }

    if (dados.endereco !== undefined) {
      escola.endereco = dados.endereco?.trim() || null;
    }

    await this.escolaRepository.save(escola);

    return escola;
  }

  async deletar(id_escola: number) {
    const escola = await this.escolaRepository.findOneBy({
      id_escola,
    });

    if (!escola) {
      throw new Error("Escola não encontrada");
    }

    /*
      A FK aluno.id_escola usa ON DELETE RESTRICT no banco, então uma
      escola com alunos vinculados não pode ser removida. Verificamos
      aqui antes para devolver uma mensagem clara em vez de um erro
      cru de constraint do MySQL.
    */
    const alunosVinculados = await this.alunoRepository.count({
      where: { id_escola },
    });

    if (alunosVinculados > 0) {
      throw new Error(
        "Não é possível excluir a escola: existem alunos vinculados a ela"
      );
    }

    await this.escolaRepository.remove(escola);

    return {
      message: "Escola excluída com sucesso",
    };
  }
}
