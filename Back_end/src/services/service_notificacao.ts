
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
        // NOTIFICAÇÃO DE FALTAS
        // =====================================================

        if (dados.tipo === "ALUNO_FALTAS_SEMANA") {

            existente = await this.repository.findOne({
                where: {
                    id_condutor: dados.id_condutor,
                    tipo: dados.tipo,
                    titulo: dados.titulo,
                    resolvida: false
                }
            });

        }

        // =====================================================
        // NOTIFICAÇÃO VINCULADA A UMA ENTIDADE
        // =====================================================

        else if (
            dados.entidade_tipo != null &&
            dados.entidade_id != null
        ) {

            existente = await this.repository.findOne({
                where: {
                    id_condutor: dados.id_condutor,
                    entidade_tipo: dados.entidade_tipo,
                    entidade_id: dados.entidade_id,
                    resolvida: false
                }
            });

        }

        // =====================================================
        // NOTIFICAÇÃO SEM ENTIDADE
        // =====================================================

        else {

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

            const agora = new Date();

            const expirou =
                existente.data_expiracao !== null &&
                existente.data_expiracao !== undefined &&
                existente.data_expiracao.getTime() <= agora.getTime();


            // =================================================
            // REATIVAR NOTIFICAÇÃO EXPIRADA
            // =================================================

            if (expirou) {

                existente.lida = false;
                existente.data_leitura = null;

                existente.resolvida = false;
                existente.data_resolucao = null;

                // Se não foi informada uma nova expiração,
                // remove a expiração antiga.
                existente.data_expiracao =
                    dados.data_expiracao ?? null;

                houveAlteracao = true;

            }


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
                dados.prioridade ?? "MEDIA";

            if (existente.prioridade !== novaPrioridade) {

                existente.prioridade = novaPrioridade;

                houveAlteracao = true;

            }


            // =================================================
            // DATA DE EXPIRAÇÃO
            // =================================================

            if (dados.data_expiracao !== undefined) {

                const expiracaoAnterior =
                    existente.data_expiracao?.getTime() ?? null;

                const expiracaoNova =
                    dados.data_expiracao?.getTime() ?? null;

                if (expiracaoAnterior !== expiracaoNova) {

                    existente.data_expiracao =
                        dados.data_expiracao ?? null;

                    houveAlteracao = true;

                }

            }


            // =================================================
            // ENTIDADE
            // =================================================

            if (dados.tipo === "ALUNO_FALTAS_SEMANA") {

                const entidadeTipo =
                    dados.entidade_tipo ?? null;

                const entidadeId =
                    dados.entidade_id ?? null;

                if (
                    existente.entidade_tipo !== entidadeTipo ||
                    existente.entidade_id !== entidadeId
                ) {

                    existente.entidade_tipo = entidadeTipo;
                    existente.entidade_id = entidadeId;

                    houveAlteracao = true;

                }

            }


            // =================================================
            // SALVAR SE HOUVE ALTERAÇÃO
            // =================================================

            if (houveAlteracao) {

                return await this.repository.save(existente);

            }

            return existente;

        }


        // =====================================================
        // CRIAR NOVA NOTIFICAÇÃO
        // =====================================================

        const notificacao =
            this.repository.create({

                id_condutor: dados.id_condutor,

                tipo: dados.tipo,

                titulo: dados.titulo,

                mensagem: dados.mensagem,

                prioridade: dados.prioridade ?? "MEDIA",

                lida: false,

                resolvida: false,

                entidade_tipo: dados.entidade_tipo ?? null,

                entidade_id: dados.entidade_id ?? null,

                data_expiracao: dados.data_expiracao ?? null

            });


        return await this.repository.save(notificacao);

    }


    // =========================================================
    // BUSCAR NOTIFICAÇÕES
    // =========================================================

    async buscar(
        id_condutor: number,
        apenasNaoLidas: boolean = false
    ) {

        const query = this.repository
            .createQueryBuilder("notificacao")
            .where(
                "notificacao.id_condutor = :id_condutor",
                { id_condutor }
            )
            .andWhere(
                `(
                    notificacao.data_expiracao IS NULL
                    OR notificacao.data_expiracao > :agora
                )`,
                { agora: new Date() }
            );


        if (apenasNaoLidas) {

            query.andWhere(
                "notificacao.lida = :lida",
                { lida: false }
            );

        }


        // Ordem personalizada de prioridade:
        // CRITICA > ALTA > MEDIA > BAIXA

        return query
            .orderBy("notificacao.lida", "ASC")
            .addOrderBy(
                `CASE
                    WHEN notificacao.prioridade = 'CRITICA' THEN 4
                    WHEN notificacao.prioridade = 'ALTA' THEN 3
                    WHEN notificacao.prioridade = 'MEDIA' THEN 2
                    WHEN notificacao.prioridade = 'BAIXA' THEN 1
                    ELSE 0
                END`,
                "DESC"
            )
            .addOrderBy(
                "notificacao.data_criacao",
                "DESC"
            )
            .getMany();

    }


    // =========================================================
    // CONTAR NÃO LIDAS
    // =========================================================

    async contarNaoLidas(
        id_condutor: number
    ) {

        return this.repository
            .createQueryBuilder("notificacao")
            .where(
                "notificacao.id_condutor = :id_condutor",
                { id_condutor }
            )
            .andWhere(
                "notificacao.lida = :lida",
                { lida: false }
            )
            .andWhere(
                "notificacao.resolvida = :resolvida",
                { resolvida: false }
            )
            .andWhere(
                `(
                    notificacao.data_expiracao IS NULL
                    OR notificacao.data_expiracao > :agora
                )`,
                { agora: new Date() }
            )
            .getCount();

    }


    // =========================================================
    // BUSCAR POR ID
    // =========================================================

    async buscarPorId(
        id_notificacao: number,
        id_condutor: number
    ) {

        return this.repository.findOne({

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

            notificacao.data_leitura = new Date();

            return await this.repository.save(notificacao);

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

            notificacao.data_leitura = agora;

        }

        notificacao.data_resolucao = agora;


        return await this.repository.save(notificacao);

    }


    // =========================================================
    // MARCAR TODAS COMO LIDAS
    // =========================================================

    async marcarTodasComoLidas(
        id_condutor: number
    ) {

        const notificacoes =
            (await this.buscar(id_condutor, true))
                .filter(notificacao => !notificacao.resolvida);


        if (notificacoes.length === 0) {

            return [];

        }


        const agora = new Date();


        notificacoes.forEach(notificacao => {

            notificacao.lida = true;

            notificacao.data_leitura = agora;

        });


        return await this.repository.save(notificacoes);

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


        await this.repository.remove(notificacao);


        return {

            sucesso: true,

            mensagem: "Notificação excluída com sucesso."

        };

    }

}
