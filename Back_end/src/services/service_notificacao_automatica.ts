import { AppDataSource } from "../config/database";
import { ServiceNotificacao } from "./service_notificacao";

export class ServiceNotificacaoAutomatica {

    private serviceNotificacao = new ServiceNotificacao();


    // =========================================================
    // EXECUTAR TODAS AS VERIFICAÇÕES
    // =========================================================

    async executar(id_condutor: number) {

        console.log(
            `[notificacao] Verificando notificações do condutor ${id_condutor}...`
        );

        try {

            await this.verificarDocumentos(id_condutor);

            await this.verificarMensalidades(id_condutor);

            await this.verificarOrcamentos(id_condutor);

            console.log(
                `[notificacao] Verificação concluída para o condutor ${id_condutor}.`
            );

        } catch (error) {

            console.error(
                `[notificacao] Erro na verificação do condutor ${id_condutor}:`,
                error
            );

            throw error;
        }
    }


    // =========================================================
    // DOCUMENTOS
    // =========================================================

    private async verificarDocumentos(id_condutor: number) {

        console.log(
            `[notificacao] INICIANDO verificação de documentos do condutor ${id_condutor}`
        );


        const documentos = await AppDataSource.query(
            `
            SELECT
                id_documento,
                tipo_documento,
                data_validade
            FROM documento
            WHERE id_condutor = ?
              AND data_validade IS NOT NULL
            `,
            [id_condutor]
        );


        console.log(
            "[notificacao] Documentos encontrados:",
            documentos
        );


        const agora = new Date();


        for (const documento of documentos) {

            /*
             * O TypeORM já retorna data_validade
             * como um objeto Date.
             *
             * Portanto, não devemos concatenar
             * "T23:59:59" diretamente no valor.
             */

            const dataValidade = new Date(
                documento.data_validade
            );


            /*
             * Ajustamos a validade para o final
             * do respectivo dia.
             *
             * Isso evita que um documento seja
             * considerado vencido no começo
             * do próprio dia de vencimento.
             */

            dataValidade.setHours(
                23,
                59,
                59,
                999
            );


            const diferencaMs =
                dataValidade.getTime() -
                agora.getTime();


            const diasRestantes = Math.ceil(
                diferencaMs /
                (1000 * 60 * 60 * 24)
            );


            console.log(
                `[notificacao] Documento ${documento.id_documento} | ` +
                `${documento.tipo_documento} | ` +
                `Validade: ${dataValidade.toLocaleDateString("pt-BR")} | ` +
                `Dias restantes: ${diasRestantes}`
            );


            // =================================================
            // DOCUMENTO VENCIDO
            // =================================================

            if (diasRestantes < 0) {

                console.log(
                    `[notificacao] Documento ${documento.id_documento} está VENCIDO.`
                );


                await this.serviceNotificacao.criar({

                    id_condutor,

                    tipo: "DOCUMENTO_VENCIDO",

                    titulo: "Documento vencido",

                    mensagem:
                        `O documento ${documento.tipo_documento} ` +
                        `está vencido e precisa ser regularizado.`,

                    prioridade: "CRITICA",

                    entidade_tipo: "DOCUMENTO",

                    entidade_id:
                        documento.id_documento
                });


                continue;
            }


            // =================================================
            // VENCE HOJE OU EM ATÉ 3 DIAS
            // =================================================

            if (diasRestantes <= 3) {

                console.log(
                    `[notificacao] Documento ${documento.id_documento} ` +
                    `vence em até 3 dias.`
                );


                await this.serviceNotificacao.criar({

                    id_condutor,

                    tipo: "DOCUMENTO_PROXIMO_VENCIMENTO",

                    titulo:
                        diasRestantes === 0
                            ? "Documento vence hoje"
                            : "Documento vence em breve",

                    mensagem:
                        diasRestantes === 0
                            ? `O documento ${documento.tipo_documento} vence hoje.`
                            : `O documento ${documento.tipo_documento} vence em ${diasRestantes} ${
                                diasRestantes === 1
                                    ? "dia"
                                    : "dias"
                            }.`,


                    prioridade: "ALTA",

                    entidade_tipo: "DOCUMENTO",

                    entidade_id:
                        documento.id_documento
                });


                continue;
            }


            // =================================================
            // VENCE EM ATÉ 7 DIAS
            // =================================================

            if (diasRestantes <= 7) {

                console.log(
                    `[notificacao] Documento ${documento.id_documento} ` +
                    `vence em até 7 dias.`
                );


                await this.serviceNotificacao.criar({

                    id_condutor,

                    tipo: "DOCUMENTO_PROXIMO_VENCIMENTO",

                    titulo:
                        "Documento próximo do vencimento",

                    mensagem:
                        `O documento ${documento.tipo_documento} ` +
                        `vence em ${diasRestantes} dias.`,

                    prioridade: "MEDIA",

                    entidade_tipo: "DOCUMENTO",

                    entidade_id:
                        documento.id_documento
                });
            }
        }


        console.log(
            `[notificacao] FINALIZADA verificação de documentos do condutor ${id_condutor}`
        );
    }


    // =========================================================
    // MENSALIDADES
    // =========================================================

    private async verificarMensalidades(id_condutor: number) {

        const mensalidades = await AppDataSource.query(
            `
            SELECT
                m.id_mensalidade,
                m.valor,
                m.data_vencimento,
                m.status,
                a.nome AS nome_aluno
            FROM mensalidade m

            INNER JOIN aluno a
                ON a.id_aluno = m.id_aluno

            WHERE m.id_condutor = ?
              AND m.status IN ('PENDENTE', 'ATRASADO')
            `,
            [id_condutor]
        );


        for (const mensalidade of mensalidades) {

            const status =
                String(mensalidade.status).toUpperCase();


            // =================================================
            // ATRASADA
            // =================================================

            if (status === "ATRASADO") {

                await this.serviceNotificacao.criar({

                    id_condutor,

                    tipo: "MENSALIDADE_ATRASADA",

                    titulo: "Mensalidade atrasada",

                    mensagem:
                        `A mensalidade do aluno ` +
                        `${mensalidade.nome_aluno} ` +
                        `está atrasada.`,

                    prioridade: "ALTA",

                    entidade_tipo: "MENSALIDADE",

                    entidade_id:
                        mensalidade.id_mensalidade
                });

                continue;
            }


            // =================================================
            // PENDENTE
            // =================================================

            if (status === "PENDENTE") {

                await this.serviceNotificacao.criar({

                    id_condutor,

                    tipo: "MENSALIDADE_PENDENTE",

                    titulo: "Mensalidade pendente",

                    mensagem:
                        `A mensalidade do aluno ` +
                        `${mensalidade.nome_aluno} ` +
                        `está pendente.`,

                    prioridade: "MEDIA",

                    entidade_tipo: "MENSALIDADE",

                    entidade_id:
                        mensalidade.id_mensalidade
                });
            }
        }
    }


    // =========================================================
    // ORÇAMENTOS
    // =========================================================

    private async verificarOrcamentos(id_condutor: number) {

        const orcamentos = await AppDataSource.query(
            `
            SELECT
                id_orcamento,
                nome_responsavel,
                status,
                data_solicitacao
            FROM orcamento
            WHERE status IN ('PENDENTE', 'EM_CADASTRO')
              AND (
                    id_condutor = ?
                    OR id_condutor IS NULL
              )
            `,
            [id_condutor]
        );


        for (const orcamento of orcamentos) {

            await this.serviceNotificacao.criar({

                id_condutor,

                tipo: "NOVO_ORCAMENTO",

                titulo: "Novo orçamento",

                mensagem:
                    `O orçamento de ` +
                    `${orcamento.nome_responsavel} ` +
                    `está aguardando análise.`,

                prioridade: "ALTA",

                entidade_tipo: "ORCAMENTO",

                entidade_id:
                    orcamento.id_orcamento
            });
        }
    }
}