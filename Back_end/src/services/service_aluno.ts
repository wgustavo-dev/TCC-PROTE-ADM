import {AppDataSource} from '../config/database';
import {Aluno} from '../models/model_aluno';

export class ServiceAluno{

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

        const aluno = alunoRepository.create(dados);
        await alunoRepository.save(aluno);

        return aluno;
    }

    async atualizar(id:number, dados: Partial<Aluno>){
        const alunoRepository = AppDataSource.getRepository(Aluno);

        const aluno = await alunoRepository.findOneBy({id_aluno: id});

        //valida existencia do aluno
        if (!aluno){
            throw new Error("Aluno não encontrado")
        }   

        // mescla os dados existentes com os novos dados
        alunoRepository.merge(aluno,dados);
        await alunoRepository.save(aluno);

        return aluno;

    }

    async deletar(id_aluno:number){
        const alunoRepository = AppDataSource.getRepository(Aluno); 
        const aluno = await alunoRepository.findOne({
            where: { id_aluno: id_aluno},
        })


        //valida existencia do aluno
        if (!aluno){
            throw new Error("Aluno não encontrado")
        }               

        await alunoRepository.remove(aluno);
        return {message: "Aluno excluído com sucesso"};
    }
}