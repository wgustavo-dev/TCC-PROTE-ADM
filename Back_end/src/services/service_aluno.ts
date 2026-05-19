import { AppDataSource } from '../config/database';
import { Aluno } from '../models/model_aluno';
import { Responsavel } from '../models/model_responsavel';
import { Mensalidade } from "../models/model_mensalidade";
import { Presenca } from "../models/model_presenca";

export class ServiceAluno{
    private async atualizarQuantidadeAlunosResponsavel(id_responsavel?: number | null) {
        if (!id_responsavel) return;

        const alunoRepository = AppDataSource.getRepository(Aluno);
        const responsavelRepository = AppDataSource.getRepository(Responsavel);

        const quantidade = await alunoRepository.count({
            where: { id_responsavel },
        });

        await responsavelRepository.update(id_responsavel, {
            quantidade_alunos: quantidade,
        });
    }

    async listarResponsaveis() {
        const responsavelRepository = AppDataSource.getRepository(Responsavel);
        return responsavelRepository.find({
            select: {
                id_responsavel: true,
                nome: true,
                telefone: true,
            },
            order: {
                nome: "ASC",
            },
        });
    }

    //método para listar todos os alunos e relações com responsavel e condutor
    async listar(){
        const alunoRepository = AppDataSource.getRepository(Aluno);
    
    const alunos = await alunoRepository.find({
        relations:{
            responsavel: true,
        },
    });
    
    return alunos;
}
//buscar aluno por ID, incluindo as relações com responsavel e condutor
    async buscarPorID(id:number){
        const alunoRepository = AppDataSource.getRepository(Aluno);

        const aluno = await alunoRepository.findOne({
            where: { id_aluno: id},
            relations:{
                responsavel: true,
            },
        });

        // validar existência do aluno
        if (!aluno){
            throw new Error("Aluno não encontrado")
        }

        return aluno;
    }

    //cria novo aluno, recebendo os dados parciais do aluno 
    async criar(dados: Partial<Aluno>){
        const alunoRepository = AppDataSource.getRepository(Aluno);
        const responsavelRepository = AppDataSource.getRepository(Responsavel);

        const nomeResponsavel = (dados as any).responsavel_nome?.toString().trim();
        if (!nomeResponsavel) {
            throw new Error("Responsavel nao cadastrado");
        }

        const responsavel = await responsavelRepository
            .createQueryBuilder("responsavel")
            .where("LOWER(responsavel.nome) = LOWER(:nome)", { nome: nomeResponsavel })
            .getOne();

        if (!responsavel) {
            throw new Error("Responsavel nao cadastrado");
        }

        dados.id_responsavel = responsavel.id_responsavel;

        delete (dados as any).responsavel_nome;
        delete (dados as any).responsavel_telefone;

        const aluno = alunoRepository.create(dados);
        await alunoRepository.save(aluno);
        await this.atualizarQuantidadeAlunosResponsavel(aluno.id_responsavel);

        return aluno;
    }

    async atualizar(id:number, dados: Partial<Aluno>){
        const alunoRepository = AppDataSource.getRepository(Aluno);
        const responsavelRepository = AppDataSource.getRepository(Responsavel);

        const aluno = await alunoRepository.findOneBy({id_aluno: id});

        //valida existencia do aluno
        if (!aluno){
            throw new Error("Aluno não encontrado")
        }   

        const nomeResponsavel = (dados as any).responsavel_nome?.toString().trim();
        if (!nomeResponsavel) {
            throw new Error("Responsavel nao cadastrado");
        }

        const responsavel = await responsavelRepository
            .createQueryBuilder("responsavel")
            .where("LOWER(responsavel.nome) = LOWER(:nome)", { nome: nomeResponsavel })
            .getOne();

        if (!responsavel) {
            throw new Error("Responsavel nao cadastrado");
        }

        dados.id_responsavel = responsavel.id_responsavel;

        delete (dados as any).responsavel_nome;
        delete (dados as any).responsavel_telefone;

        const responsavelAnterior = aluno.id_responsavel;

        // mescla os dados existentes com os novos dados
        alunoRepository.merge(aluno,dados);
        await alunoRepository.save(aluno);
        await this.atualizarQuantidadeAlunosResponsavel(responsavelAnterior);
        await this.atualizarQuantidadeAlunosResponsavel(aluno.id_responsavel);

        return aluno;

    }

async deletar(id_aluno: number) {
    const alunoRepository = AppDataSource.getRepository(Aluno);
    const mensalidadeRepository = AppDataSource.getRepository(Mensalidade);
    const presencaRepository = AppDataSource.getRepository(Presenca);

    const aluno = await alunoRepository.findOne({
        where: { id_aluno: id_aluno },
    });

    // valida existência do aluno
    if (!aluno) {
        throw new Error("Aluno não encontrado");
    }

    // Apaga primeiro os registros ligados ao aluno
    await presencaRepository.delete({ id_aluno: id_aluno });
    await mensalidadeRepository.delete({ id_aluno: id_aluno });

    // Depois apaga o aluno
    const responsavelAnterior = aluno.id_responsavel;
    await alunoRepository.remove(aluno);
    await this.atualizarQuantidadeAlunosResponsavel(responsavelAnterior);

    return { message: "Aluno excluído com sucesso" };
}
}
