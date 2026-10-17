import { AppDataSource } from "../config/database";
import { ServiceNotificacao } from "./service_notificacao";

export class ServiceNotificacaoAutomatica {

    private serviceNotificacao =
        new ServiceNotificacao();


    // =========================================================
    // EXECUTAR TODAS AS VERIFICAÇÕES
    // =========================================================

    async executar(id_condutor: number) {

        console.log(
            `[notificacao] Verificando notificações do condutor ${id_condutor}...`
        );

        try {

            // Regras já existentes
            await this.verificarDocumentos(id_condutor);

            await this.verificarMensalidades(id_condutor);

            await this.verificarOrcamentos(id_condutor);


            // Novas regras
            await this.verificarAlunos(id_condutor);

            await this.verificarPresencas(id_condutor);


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

            const dataValidade =
                new Date(documento.data_validade);


            dataValidade.setHours(
                23,
                59,
                59,
                999
            );


            const diferencaMs =
                dataValidade.getTime() -
                agora.getTime();


            const diasRestantes =
                Math.ceil(
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
                DATEDIFF(CURDATE(), DATE(m.data_vencimento)) AS dias_atraso,
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

            if (
                status === "ATRASADO" ||
                Number(mensalidade.dias_atraso) > 0
            ) {

                await this.serviceNotificacao.criar({

                    id_condutor,

                    tipo: "MENSALIDADE_ATRASADA",

                    titulo: "Mensalidade atrasada",

                    mensagem:
                        `A mensalidade do aluno ` +
                        `${mensalidade.nome_aluno} ` +
                        `está atrasada há ${Number(mensalidade.dias_atraso) || 0} dias.`,

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


    // =========================================================
    // ALUNOS
    // =========================================================
    //
    // Verifica problemas operacionais no cadastro do aluno:
    //
    // 1. Turno não informado
    // 2. Tipo de trajeto não informado
    // 3. Endereço de embarque/desembarque incompatível
    //    com o tipo de trajeto
    // 4. Itinerário não cadastrado
    //
    // A notificação é vinculada ao ALUNO para que apareça
    // corretamente no módulo de alunos.
    //
    // =========================================================

    private async verificarAlunos(id_condutor: number) {

        const alunos = await AppDataSource.query(
            `
            SELECT
                a.id_aluno,
                a.nome,
                a.turno,
                a.tipo_trajeto,
                a.endereco_embarque,
                a.endereco_desembarque,
                a.id_condutor
            FROM aluno a
            WHERE a.id_condutor = ?
            `,
            [id_condutor]
        );


        console.log(
            `[notificacao] Alunos encontrados para o condutor ${id_condutor}:`,
            alunos.length
        );


        for (const aluno of alunos) {

            const turno =
                String(aluno.turno ?? "")
                    .trim()
                    .toUpperCase();


            const tipoTrajeto =
                String(aluno.tipo_trajeto ?? "")
                    .trim()
                    .toUpperCase();


            const possuiEmbarque =
                Boolean(
                    String(
                        aluno.endereco_embarque ?? ""
                    ).trim()
                );


            const possuiDesembarque =
                Boolean(
                    String(
                        aluno.endereco_desembarque ?? ""
                    ).trim()
                );


            let problemaCadastro = "";


            // =================================================
            // TURNO
            // =================================================

            if (!turno) {

                problemaCadastro =
                    "O turno do aluno não foi informado.";
            }


            // =================================================
            // TIPO DE TRAJETO
            // =================================================

            else if (!tipoTrajeto) {

                problemaCadastro =
                    "O tipo de trajeto do aluno não foi informado.";
            }


            // =================================================
            // TRAJETO DE IDA
            // =================================================

            else if (
                tipoTrajeto === "IDA" &&
                !possuiEmbarque
            ) {

                problemaCadastro =
                    "O endereço de embarque do aluno não foi informado.";
            }


            // =================================================
            // TRAJETO DE VOLTA
            // =================================================

            else if (
                tipoTrajeto === "VOLTA" &&
                !possuiDesembarque
            ) {

                problemaCadastro =
                    "O endereço de desembarque do aluno não foi informado.";
            }


            // =================================================
            // TRAJETO DE IDA E VOLTA
            // =================================================

            else if (
                tipoTrajeto === "AMBOS" &&
                (
                    !possuiEmbarque ||
                    !possuiDesembarque
                )
            ) {

                problemaCadastro =
                    "Os endereços de embarque e desembarque do aluno precisam ser informados.";
            }


            // =================================================
            // NOTIFICAÇÃO DE CADASTRO INCOMPLETO
            // =================================================

            if (problemaCadastro) {

                await this.serviceNotificacao.criar({

                    id_condutor,

                    tipo: "ALUNO_CADASTRO_INCOMPLETO",

                    titulo: "Cadastro de aluno incompleto",

                    mensagem:
                        `O cadastro do aluno ${aluno.nome} ` +
                        `está incompleto. ${problemaCadastro}`,

                    prioridade: "MEDIA",

                    entidade_tipo: "ALUNO",

                    entidade_id:
                        aluno.id_aluno
                });
            }


        }
    }

    // =========================================================
    // PRESENÇAS
    // =========================================================
    //
    // Alunos com mais de três dias de falta na semana atual geram
    // um aviso agregado que expira no fim da semana.
    //
    // =========================================================

    private async verificarPresencas(id_condutor: number) {
        const alunosComFaltas = await AppDataSource.query(
            `
            SELECT
                a.id_aluno,
                a.nome,
                COUNT(DISTINCT DATE(p.data)) AS faltas_semana,
                MAX(p.id_presenca) AS ultima_presenca_id
            FROM aluno a
            INNER JOIN presenca p
                ON p.id_aluno = a.id_aluno
            WHERE a.id_condutor = ?
              AND UPPER(p.status) = 'AUSENTE'
              AND DATE(p.data) >= DATE_SUB(
                    CURDATE(),
                    INTERVAL WEEKDAY(CURDATE()) DAY
              )
              AND DATE(p.data) <= CURDATE()
            GROUP BY a.id_aluno, a.nome
            HAVING COUNT(DISTINCT DATE(p.data)) > 3
            `,
            [id_condutor]
        );

        const agora = new Date();
        const diasAteDomingo = (7 - agora.getDay()) % 7;
        const expiracaoSemana = new Date(agora);
        expiracaoSemana.setDate(expiracaoSemana.getDate() + diasAteDomingo);
        expiracaoSemana.setHours(23, 59, 59, 999);

        for (const aluno of alunosComFaltas) {
            const quantidadeFaltas = Number(aluno.faltas_semana);

            await this.serviceNotificacao.criar({
                id_condutor,
                tipo: "ALUNO_FALTAS_SEMANA",
                titulo: `Faltas recorrentes: ${aluno.nome}`,
                mensagem: `Aluno ${aluno.nome} faltou ${quantidadeFaltas} vezes essa semana.`,
                prioridade: "ALTA",
                entidade_tipo: "PRESENCA",
                entidade_id: Number(aluno.ultima_presenca_id),
                data_expiracao: expiracaoSemana,
            });
        }
    }
}