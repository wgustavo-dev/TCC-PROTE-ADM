import { AppDataSource } from '../config/database';
import { Despesa } from '../models/model_despesa';

export class ServiceDespesa {
  async listar() {
    const despesaRepository = AppDataSource.getRepository(Despesa);
    return despesaRepository.find();
  }

  async buscarPorID(id: number) {
    const despesaRepository = AppDataSource.getRepository(Despesa);
    const despesa = await despesaRepository.findOneBy({ id_despesa: id });

    if (!despesa) {
      throw new Error('Despesa não encontrada');
    }

    return despesa;
  }

  async criar(dados: Partial<Despesa>) {
    const despesaRepository = AppDataSource.getRepository(Despesa);
    const despesa = despesaRepository.create(dados);
    await despesaRepository.save(despesa);

    return despesa;
  }

  async atualizar(id: number, dados: Partial<Despesa>) {
    const despesaRepository = AppDataSource.getRepository(Despesa);
    const despesa = await despesaRepository.findOneBy({ id_despesa: id });

    if (!despesa) {
      throw new Error('Despesa não encontrada');
    }

    despesaRepository.merge(despesa, dados);
    await despesaRepository.save(despesa);

    return despesa;
  }

  async deletar(id_despesa: number) {
    const despesaRepository = AppDataSource.getRepository(Despesa);
    const despesa = await despesaRepository.findOneBy({ id_despesa });

    if (!despesa) {
      throw new Error('Despesa não encontrada');
    }

    await despesaRepository.remove(despesa);
    return { message: 'Despesa excluída com sucesso' };
  }
}
