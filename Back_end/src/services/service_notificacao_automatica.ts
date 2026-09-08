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


            // =================================================
            // ITINERÁRIO
            // =================================================

            await this.verificarItinerarioAluno(
                id_condutor,
                aluno
            );
        }
    }


    // =========================================================
    // ITINERÁRIO DO ALUNO
    // =========================================================
    //
    // O aluno pode precisar de:
    //
    // IDA       -> itinerário de IDA
    // VOLTA     -> itinerário de VOLTA
    // AMBOS     -> itinerário de IDA + VOLTA
    //
    // O turno do itinerário deve corresponder ao turno
    // cadastrado no aluno.
    //
    // =========================================================

    private async verificarItinerarioAluno(
        id_condutor: number,
        aluno: any
    ) {

        const turno =
            String(aluno.turno ?? "")
                .trim()
                .toUpperCase();


        const tipoTrajeto =
            String(aluno.tipo_trajeto ?? "")
                .trim()
                .toUpperCase();


        // Sem essas informações não temos como determinar
        // corretamente qual itinerário deveria existir.
        if (!turno || !tipoTrajeto) {

            return;
        }


        const itinerarios =
            await AppDataSource.query(
                `
                SELECT
                    id_itinerario,
                    turno,
                    tipo,
                    ordem
                FROM itinerario_aluno
                WHERE id_aluno = ?
                  AND id_condutor = ?
                `,
                [
                    aluno.id_aluno,
                    id_condutor
                ]
            );


        const tiposCadastrados =
            itinerarios.map(
                (item: any) =>
                    String(item.tipo ?? "")
                        .trim()
                        .toUpperCase()
            );


        let tiposEsperados: string[] = [];


        // =================================================
        // IDA
        // =================================================

        if (tipoTrajeto === "IDA") {

            tiposEsperados = ["IDA"];
        }


        // =================================================
        // VOLTA
        // =================================================

        else if (tipoTrajeto === "VOLTA") {

            tiposEsperados = ["VOLTA"];
        }


        // =================================================
        // IDA + VOLTA
        // =================================================

        else if (tipoTrajeto === "AMBOS") {

            tiposEsperados = [
                "IDA",
                "VOLTA"
            ];
        }


        // =================================================
        // VERIFICAR ITINERÁRIOS AUSENTES
        // =================================================

        const itinerariosAusentes =
            tiposEsperados.filter(
                tipo =>
                    !tiposCadastrados.includes(tipo)
            );


        if (itinerariosAusentes.length === 0) {

            return;
        }


        const descricaoTipos =
            itinerariosAusentes
                .map(
                    tipo =>
                        tipo === "IDA"
                            ? "ida"
                            : "volta"
                )
                .join(" e ");


        console.log(
            `[notificacao] Aluno ${aluno.id_aluno} ` +
            `está sem itinerário de ${descricaoTipos}.`
        );


        await this.serviceNotificacao.criar({

            id_condutor,

            tipo: "ALUNO_SEM_ITINERARIO",

            titulo: "Aluno sem itinerário",

            mensagem:
                `O aluno ${aluno.nome} ` +
                `não possui itinerário de ${descricaoTipos} ` +
                `cadastrado para o turno ${turno}.`,

            prioridade: "MEDIA",

            entidade_tipo: "ALUNO",

            entidade_id:
                aluno.id_aluno
        });
    }


    // =========================================================
    // PRESENÇAS
    // =========================================================
    //
    // Regra:
    //
    // Se o aluno possuir 3 registros consecutivos de AUSENTE,
    // será criada uma notificação de prioridade ALTA.
    //
    // A ocorrência é vinculada ao último registro de presença
    // que completou a sequência.
    //
    // =========================================================

    private async verificarPresencas(id_condutor: number) {

        const alunos =
            await AppDataSource.query(
                `
                SELECT
                    id_aluno,
                    nome
                FROM aluno
                WHERE id_condutor = ?
                `,
                [id_condutor]
            );


        for (const aluno of alunos) {

            const presencas =
                await AppDataSource.query(
                    `
                    SELECT
                        p.id_presenca,
                        p.id_aluno,
                        p.data,
                        p.turno,
                        p.tipo,
                        p.status
                    FROM presenca p

                    INNER JOIN aluno a
                        ON a.id_aluno = p.id_aluno

                    WHERE p.id_aluno = ?
                      AND a.id_condutor = ?

                    ORDER BY
                        p.data DESC,
                        p.id_presenca DESC

                    LIMIT 20
                    `,
                    [
                        aluno.id_aluno,
                        id_condutor
                    ]
                );


            if (
                !Array.isArray(presencas) ||
                presencas.length < 3
            ) {

                continue;
            }


            /*
             * A consulta vem em ordem DESC.
             *
             * Percorremos os registros mais recentes
             * procurando uma sequência de 3 AUSENTE.
             */

            let quantidadeAusenciasConsecutivas = 0;

            let ultimaPresencaAusente: any = null;


            for (const presenca of presencas) {

                const status =
                    String(presenca.status ?? "")
                        .trim()
                        .toUpperCase();


                if (status === "AUSENTE") {

                    quantidadeAusenciasConsecutivas++;

                    if (!ultimaPresencaAusente) {

                        ultimaPresencaAusente =
                            presenca;
                    }


                    if (
                        quantidadeAusenciasConsecutivas >= 3
                    ) {

                        break;
                    }

                } else {

                    /*
                     * Uma presença interrompe a sequência.
                     */

                    quantidadeAusenciasConsecutivas = 0;

                    ultimaPresencaAusente = null;
                }
            }


            // =================================================
            // NÃO POSSUI 3 FALTAS
            // =================================================

            if (
                quantidadeAusenciasConsecutivas < 3 ||
                !ultimaPresencaAusente
            ) {

                continue;
            }


            // =================================================
            // EVITAR DUPLICAÇÃO DA MESMA OCORRÊNCIA
            // =================================================

            const notificacaoExistente =
                await AppDataSource.query(
                    `
                    SELECT
                        id_notificacao
                    FROM notificacao
                    WHERE id_condutor = ?
                      AND tipo = 'ALUNO_TRES_FALTAS_CONSECUTIVAS'
                      AND entidade_tipo = 'PRESENCA'
                      AND entidade_id = ?
                    LIMIT 1
                    `,
                    [
                        id_condutor,
                        ultimaPresencaAusente.id_presenca
                    ]
                );


            if (
                Array.isArray(notificacaoExistente) &&
                notificacaoExistente.length > 0
            ) {

                continue;
            }


            // =================================================
            // CRIAR NOTIFICAÇÃO
            // =================================================

            console.log(
                `[notificacao] Aluno ${aluno.id_aluno} ` +
                `possui 3 faltas consecutivas.`
            );


            await this.serviceNotificacao.criar({

                id_condutor,

                tipo:
                    "ALUNO_TRES_FALTAS_CONSECUTIVAS",

                titulo:
                    "Aluno com 3 faltas consecutivas",

                mensagem:
                    `O aluno ${aluno.nome} ` +
                    `possui 3 faltas consecutivas ` +
                    `e deve ser verificado.`,

                prioridade: "ALTA",

                entidade_tipo: "PRESENCA",

                entidade_id:
                    ultimaPresencaAusente.id_presenca
            });
        }
    }
}