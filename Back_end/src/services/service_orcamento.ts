import { AppDataSource } from '../config/database';
import { Aluno } from '../models/model_aluno';
import { Condutor } from '../models/model_condutor';
import { Orcamento } from '../models/model_orcamento';
import { Responsavel } from '../models/model_responsavel';

export class ServiceOrcamento {
  async listar() {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);
    return orcamentoRepository.find({
      relations: {
        condutor: true,
      },
    });
  }

  async buscarPorID(id: number) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);
    const orcamento = await orcamentoRepository.findOne({
      where: { id_orcamento: id },
      relations: {
        condutor: true,
      },
    });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    return orcamento;
  }

  async criar(dados: Partial<Orcamento>) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);
    const orcamento = orcamentoRepository.create(dados);
    await orcamentoRepository.save(orcamento);

    return orcamento;
  }

  async atualizar(id: number, dados: Partial<Orcamento>) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);
    const orcamento = await orcamentoRepository.findOneBy({ id_orcamento: id });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    orcamentoRepository.merge(orcamento, dados);
    await orcamentoRepository.save(orcamento);

    return orcamento;
  }

  async deletar(id_orcamento: number) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);
    const orcamento = await orcamentoRepository.findOneBy({ id_orcamento });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    await orcamentoRepository.remove(orcamento);
    return { message: 'Orçamento excluído com sucesso' };
  }

  async aprovar(id: number) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);
    const responsavelRepository = AppDataSource.getRepository(Responsavel);
    const alunoRepository = AppDataSource.getRepository(Aluno);

    const orcamento = await orcamentoRepository.findOneBy({ id_orcamento: id });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    if (orcamento.convertido) {
      throw new Error('Orçamento já convertido');
    }

    const responsavel = responsavelRepository.create({
      nome: orcamento.nome_cliente,
      telefone: orcamento.telefone,
      endereco: orcamento.bairro,
      quantidade_alunos: orcamento.quantidade_alunos,
    });

    await responsavelRepository.save(responsavel);

    const alunos = [];
    const quantidadeAlunos = orcamento.quantidade_alunos || 1;

    for (let i = 0; i < quantidadeAlunos; i++) {
      const aluno = alunoRepository.create({
        nome: 'XXXXX',
        bairro: orcamento.bairro,
        escola: orcamento.escola,
        turno: orcamento.turno,
        tipo_trajeto: orcamento.tipo_trajeto,
        endereco_embarque: orcamento.endereco_embarque,
        endereco_desembarque: orcamento.endereco_desembarque,
        id_responsavel: responsavel.id_responsavel,
        id_condutor: orcamento.id_condutor = 1,
      });
      alunos.push(aluno);
    }

    await alunoRepository.save(alunos);

    orcamento.status = 'APROVADO';
    orcamento.convertido = true;
    orcamento.data_conversao = new Date();
    orcamento.id_condutor = 1;

    await orcamentoRepository.save(orcamento);

    return {
      orcamento,
      responsavel,
      alunos,
    };
  }
}
