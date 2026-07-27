
import {AppDataSource} from "../config/database";

import {Presenca} from "../models/model_presenca";

export class ServicePresenca{
//listar
    async listar(){
        const repo = AppDataSource. getRepository(Presenca);

        const presencas = await repo.find({
            relations:{
                aluno:true
            }
        });

        return presencas;
    }

//listar por data
    async listarPorData(data:string){
        const repo = AppDataSource. getRepository(Presenca);

        const presenca = await repo.find({
            where: {data: data as any},
            relations:{
                aluno:true
            }
        })

        return presenca
    }   

//criar
    async criar(dados: Partial<Presenca>){
        const repo=AppDataSource.getRepository(Presenca)

        const existente = await repo.findOne({
            where: {
                id_aluno: dados.id_aluno as number,
                data: dados.data as any
            }
        });

        if (existente) {
            repo.merge(existente, dados);
            await repo.save(existente);
            return existente;
        }

        const presenca = repo.create(dados)
        await repo.save(presenca)

        return presenca;
    }

//atualizar
    async atualizar(id:number, dados: Partial<Presenca>){
        const repo=AppDataSource.getRepository(Presenca)

        //filtra por id
        const presenca = await repo.findOne({
            where: { id_presenca:id},
        })

        //valida se existe
        if (!presenca){
            throw new Error ("Presença Inválida (não encontrada)")
        }

        repo.merge(presenca,dados);
        await repo.save(presenca)

        return presenca;

    }

//deletar
    async deletar (id:number){
        const repo = AppDataSource.getRepository(Presenca)
        const presenca = await repo.findOne({
            where: {id_presenca:id}
        })

        //valida existencia do aluno
        if(!presenca){
            throw new Error ("Aluno não encontrado")

        }

        await repo.remove(presenca)
        return {message: "Presença Removida"}
    }


}