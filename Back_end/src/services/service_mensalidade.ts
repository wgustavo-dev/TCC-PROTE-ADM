import { AppDataSource } from "../config/database";
import { Mensalidade } from "../models/model_mensalidade";


export class ServiceMensalidade{

    async listar(){
        const repo = AppDataSource.getRepository(Mensalidade);

        const mensalidade = await repo.find({
            relations:{
                aluno:true
            }
        })

        return mensalidade
    }

    async buscarPorId(id: number){
        const repo = AppDataSource.getRepository(Mensalidade);

        const mensalidade = await repo.findOne({
            where:{id_mensalidade:id},
            relations:{
                aluno:true
            }
        })

        return mensalidade
    }

    async criar(dados: Partial<Mensalidade>){
        const repo=AppDataSource.getRepository(Mensalidade)

        const  mensalidade = repo.create(dados)
        await repo.save(mensalidade)

        return mensalidade
    }

    async atualizar(id:number, dados:Partial<Mensalidade>){
        const repo = AppDataSource.getRepository(Mensalidade)

        const mensalidade = await repo.findOne({
            where:{id_mensalidade:id}
        })

        if (!mensalidade){
            throw new Error ("Mensalidade Não encontrada")
        }

        repo.merge(mensalidade,dados);
        await repo.save(mensalidade)

        return mensalidade;
    }

    async deletar(id:number){
        const repo = AppDataSource.getRepository(Mensalidade)
        const mensalidade = await repo.findOne({
            where:{id_mensalidade:id}
        })

        if(!mensalidade){
            throw new Error (" Mensalidade não encontrada")
        }

        await repo.remove(mensalidade)
        return {message:"Mensalidade Removida"}
    }

    async marcarComoPago (id:number){
        const repo = AppDataSource.getRepository(Mensalidade)
        const mensalidade = await repo.findOne({
            where: {id_mensalidade:id}
        })

        if(!mensalidade){
            throw new Error ("Mensalidade não encontrada")
        }

        mensalidade.status="PAGO"
        mensalidade.data_pagamento = new Date

        await repo.save(mensalidade)
        return mensalidade
    }
}