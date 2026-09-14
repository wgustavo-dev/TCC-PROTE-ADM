import { AppDataSource } from "../config/database";
import { Notificacao } from "../models/model_notificacao";
import { IsNull } from "typeorm";

export class ServiceNotificacao {

    private repository =
        AppDataSource.getRepository(Notificacao);


    // =========================================================
    // CRIAR / ATUALIZAR NOTIFICAÇÃO
    // =========================================================

    async criar(dados: {
        id_condutor: number;
        tipo: string;
        titulo: string;
        mensagem: string;
        prioridade?: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
        entidade_tipo?: string | null;
        entidade_id?: number | null;
        data_expiracao?: Date | null;
    }) {

        let existente: Notificacao | null = null;


        // =====================================================
        // NOTIFICAÇÃO VINCULADA A UMA ENTIDADE
        // =====================================================

        if (
            dados.entidade_tipo !== undefined &&
            dados.entidade_tipo !== null &&
            dados.entidade_id !== undefined &&
            dados.entidade_id !== null
        ) {

            /*
             * Procuramos a ocorrência pela entidade,
             * e NÃO pelo tipo.
             *
             * Isso é importante porque uma mesma ocorrência
             * pode mudar de:
             *
             * DOCUMENTO_PROXIMO_VENCIMENTO
             *        ↓
             * DOCUMENTO_VENCIDO
             *
             * sem criar uma segunda notificação.
             */

            existente = await this.repository.findOne({
                where: {
                    id_condutor: dados.id_condutor,
                    entidade_tipo: dados.entidade_tipo,
                    entidade_id: dados.entidade_id,
                    resolvida: false
                }
            });

        } else {

            // =================================================
            // NOTIFICAÇÃO SEM ENTIDADE
            // =================================================

            existente = await this.repository.findOne({
                where: {
                    id_condutor: dados.id_condutor,
                    tipo: dados.tipo,
                    titulo: dados.titulo,
                    resolvida: false,
                    entidade_tipo: IsNull(),
                    entidade_id: IsNull()
                }
            });

        }


        // =====================================================
        // ATUALIZAR NOTIFICAÇÃO EXISTENTE
        // =====================================================

        if (existente) {

            let houveAlteracao = false;


            // =================================================
            // TIPO
            // =================================================

            if (existente.tipo !== dados.tipo) {

                existente.tipo = dados.tipo;

                houveAlteracao = true;
            }


            // =================================================
            // TÍTULO
            // =================================================

            if (existente.titulo !== dados.titulo) {

                existente.titulo = dados.titulo;

                houveAlteracao = true;
            }


            // =================================================
            // MENSAGEM
            // =================================================

            if (existente.mensagem !== dados.mensagem) {

                existente.mensagem = dados.mensagem;

                houveAlteracao = true;
            }


            // =================================================
            // PRIORIDADE
            // =================================================

            const novaPrioridade =
                dados.prioridade || "MEDIA";


            if (
                existente.prioridade !==
                novaPrioridade
            ) {

                existente.prioridade =
                    novaPrioridade;

                houveAlteracao = true;
            }


            // =================================================
            // DATA DE EXPIRAÇÃO
            // =================================================

            if (
                dados.data_expiracao !== undefined &&
                existente.data_expiracao?.getTime() !==
                    dados.data_expiracao?.getTime()
            ) {

                existente.data_expiracao =
                    dados.data_expiracao ?? null;

                houveAlteracao = true;
            }


            // =================================================
            // SALVAR SOMENTE SE HOUVE ALTERAÇÃO
            // =================================================

            if (houveAlteracao) {

                return await this.repository.save(
                    existente
                );

            }


            return existente;
        }


        // =====================================================
        // CRIAR NOVA NOTIFICAÇÃO
        // =====================================================

        const notificacao =
            this.repository.create({

                id_condutor:
                    dados.id_condutor,

                tipo:
                    dados.tipo,

                titulo:
                    dados.titulo,

                mensagem:
                    dados.mensagem,

                prioridade:
                    dados.prioridade || "MEDIA",

                lida:
                    false,

                resolvida:
                    false,

                entidade_tipo:
                    dados.entidade_tipo ?? null,

                entidade_id:
                    dados.entidade_id ?? null,

                data_expiracao:
                    dados.data_expiracao ?? null
            });


        return await this.repository.save(
            notificacao
        );
    }


    // =========================================================
    // BUSCAR NOTIFICAÇÕES
    // =========================================================

    async buscar(
        id_condutor: number,
        apenasNaoLidas: boolean = false
    ) {

        const where: any = {
            id_condutor
        };


        if (apenasNaoLidas) {

            where.lida = false;

        }


        return await this.repository.find({

            where,

            order: {

                lida: "ASC",

                prioridade: "DESC",

                data_criacao: "DESC"

            }

        });

    }


    // =========================================================
    // CONTAR NÃO LIDAS
    // =========================================================

    async contarNaoLidas(
        id_condutor: number
    ) {

        return await this.repository.count({

            where: {

                id_condutor,

                lida: false

            }

        });

    }


    // =========================================================
    // BUSCAR POR ID
    // =========================================================

    async buscarPorId(
        id_notificacao: number,
        id_condutor: number
    ) {

        return await this.repository.findOne({

            where: {

                id_notificacao,

                id_condutor

            }

        });

    }


    // =========================================================
    // MARCAR COMO LIDA
    // =========================================================

    async marcarComoLida(
        id_notificacao: number,
        id_condutor: number
    ) {

        const notificacao =
            await this.buscarPorId(
                id_notificacao,
                id_condutor
            );


        if (!notificacao) {

            throw new Error(
                "Notificação não encontrada."
            );

        }


        if (!notificacao.lida) {

            notificacao.lida = true;

            notificacao.data_leitura =
                new Date();


            return await this.repository.save(
                notificacao
            );

        }


        return notificacao;
    }


    // =========================================================
    // MARCAR COMO RESOLVIDA
    // =========================================================

    async marcarComoResolvida(
        id_notificacao: number,
        id_condutor: number
    ) {

        const notificacao =
            await this.buscarPorId(
                id_notificacao,
                id_condutor
            );


        if (!notificacao) {

            throw new Error(
                "Notificação não encontrada."
            );

        }


        const agora = new Date();


        notificacao.lida = true;

        notificacao.resolvida = true;


        if (!notificacao.data_leitura) {

            notificacao.data_leitura =
                agora;

        }


        notificacao.data_resolucao =
            agora;


        return await this.repository.save(
            notificacao
        );

    }


    // =========================================================
    // MARCAR TODAS COMO LIDAS
    // =========================================================

    async marcarTodasComoLidas(
        id_condutor: number
    ) {

        const notificacoes =
            await this.repository.find({

                where: {

                    id_condutor,

                    lida: false

                }

            });


        if (notificacoes.length === 0) {

            return [];

        }


        const agora = new Date();


        notificacoes.forEach(
            (notificacao) => {

                notificacao.lida = true;

                notificacao.data_leitura =
                    agora;

            }
        );


        return await this.repository.save(
            notificacoes
        );

    }


    // =========================================================
    // EXCLUIR
    // =========================================================

    async excluir(
        id_notificacao: number,
        id_condutor: number
    ) {

        const notificacao =
            await this.buscarPorId(
                id_notificacao,
                id_condutor
            );


        if (!notificacao) {

            throw new Error(
                "Notificação não encontrada."
            );

        }


        await this.repository.remove(
            notificacao
        );


        return {

            sucesso: true,

            mensagem:
                "Notificação excluída com sucesso."

        };

    }

}