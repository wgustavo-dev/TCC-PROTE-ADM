import { AppDataSource } from "../config/database";
import { Mensalidade } from "../models/model_mensalidade";


export class ServiceMensalidade {

    async listar() {

        await this.atualizarMensalidadesAtrasadas();

        const repo = AppDataSource.getRepository(Mensalidade);

        const mensalidade = await repo.find({
            relations: {
                aluno: {
                    responsavel: true
                }
            }
        })

        return mensalidade
    }

    async buscarPorId(id: number) {

        await this.atualizarMensalidadesAtrasadas();

        const repo = AppDataSource.getRepository(Mensalidade);

        const mensalidade = await repo.findOne({
            where: { id_mensalidade: id },
            relations: {
                aluno: {
                    responsavel: true
                }
            }
        })

        if (!mensalidade) {
            throw new Error("Mensalidade não encontrada")
        }

        return mensalidade
    }

    async criar(dados: Partial<Mensalidade>) {
        const repo = AppDataSource.getRepository(Mensalidade)

        const mensalidade = repo.create(dados)
        await repo.save(mensalidade)

        return mensalidade
    }

    async atualizar(id: number, dados: Partial<Mensalidade>) {
        const repo = AppDataSource.getRepository(Mensalidade)

        const mensalidade = await repo.findOne({
            where: { id_mensalidade: id }
        })

        if (!mensalidade) {
            throw new Error("Mensalidade Não encontrada")
        }

        repo.merge(mensalidade, dados);
        await repo.save(mensalidade)

        return mensalidade;
    }

    async deletar(id: number) {
        const repo = AppDataSource.getRepository(Mensalidade)
        const mensalidade = await repo.findOne({
            where: { id_mensalidade: id }
        })

        if (!mensalidade) {
            throw new Error(" Mensalidade não encontrada")
        }

        await repo.remove(mensalidade)
        return { message: "Mensalidade Removida" }
    }

    async marcarComoPago(id: number) {
        const repo = AppDataSource.getRepository(Mensalidade)
        const mensalidade = await repo.findOne({
            where: { id_mensalidade: id }
        })

        if (!mensalidade) {
            throw new Error("Mensalidade não encontrada")
        }

        mensalidade.status = "PAGO"
        mensalidade.data_pagamento = new Date

        await repo.save(mensalidade)
        return mensalidade
    }

    //mensalidade atualiza se estiver atrasada
    async atualizarMensalidadesAtrasadas() {
        const repo = AppDataSource.getRepository(Mensalidade);

        await repo
            .createQueryBuilder()
            .update(Mensalidade)
            .set({ status: "ATRASADO" })
            .where("data_vencimento < CURDATE()")
            .andWhere("status = :status", { status: "PENDENTE" })
            .execute();

        return { message: "Mensalidades atrasadas atualizadas" };
    }
}