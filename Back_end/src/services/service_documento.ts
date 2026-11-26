
import { AppDataSource } from "../config/database";
import { Documento } from "../models/model_documento";
import { Notificacao } from "../models/model_notificacao";
import { ServiceNotificacao } from "./service_notificacao";

export type StatusDocumento =
    | "Em dia"
    | "Vence em breve"
    | "Vence hoje"
    | "Vencido";

const serviceNotificacao = new ServiceNotificacao();


// =========================================================
// TRATAR DATAS SEM PROBLEMAS DE FUSO HORÁRIO
// =========================================================

function obterDataLocal(data?: Date | string | null) {

    if (!data) return null;

    let ano: number;
    let mes: number;
    let dia: number;

    if (data instanceof Date) {

        if (isNaN(data.getTime())) return null;

        ano = data.getUTCFullYear();
        mes = data.getUTCMonth() + 1;
        dia = data.getUTCDate();

    } else {

        const dataIso = String(data).slice(0, 10);

        const partes = dataIso.split("-").map(Number);

        if (partes.length !== 3) return null;

        [ano, mes, dia] = partes;

    }

    if (!ano || !mes || !dia) return null;

    const dataLocal = new Date(ano, mes - 1, dia);

    // Evita aceitar datas inválidas, como 31/02.
    if (
        dataLocal.getFullYear() !== ano ||
        dataLocal.getMonth() !== mes - 1 ||
        dataLocal.getDate() !== dia
    ) {
        return null;
    }

    dataLocal.setHours(0, 0, 0, 0);

    return dataLocal;
}


// =========================================================
// CALCULAR DIAS RESTANTES
// =========================================================

export function calcularDiasRestantes(
    dataValidade?: Date | string | null
) {

    const validade = obterDataLocal(dataValidade);

    if (!validade) return null;

    const hoje = new Date();

    hoje.setHours(0, 0, 0, 0);

    return Math.round(
        (validade.getTime() - hoje.getTime()) /
        (1000 * 60 * 60 * 24)
    );

}


// =========================================================
// CALCULAR STATUS DO DOCUMENTO
// =========================================================

export function calcularStatusDocumento(
    dataValidade?: Date | string | null
): StatusDocumento {

    const diasRestantes = calcularDiasRestantes(dataValidade);

    if (diasRestantes === null) return "Em dia";

    if (diasRestantes < 0) return "Vencido";

    if (diasRestantes === 0) return "Vence hoje";

    if (diasRestantes <= 7) return "Vence em breve";

    return "Em dia";

}


// =========================================================
// INCLUIR STATUS NO DOCUMENTO
// =========================================================

export function incluirStatusDocumento(documento: Documento) {

    const diasRestantes =
        calcularDiasRestantes(documento.data_validade);

    return {
        ...documento,
        status: calcularStatusDocumento(documento.data_validade),
        diasRestantes,
    };

}


// =========================================================
// SERVICE DOCUMENTO
// =========================================================

export class ServiceDocumento {

    private documentoRepository =
        AppDataSource.getRepository(Documento);

    private notificacaoRepository =
        AppDataSource.getRepository(Notificacao);


    // =====================================================
    // RESOLVER NOTIFICAÇÕES ANTIGAS DO DOCUMENTO
    // =====================================================

    private async resolverNotificacoesDocumento(
        id_documento: number,
        id_condutor: number
    ) {

        const notificacoes =
            await this.notificacaoRepository.find({
                where: {
                    id_condutor,
                    entidade_tipo: "DOCUMENTO",
                    entidade_id: id_documento,
                    resolvida: false,
                },
            });

        if (notificacoes.length === 0) return;

        const agora = new Date();

        notificacoes.forEach(notificacao => {

            notificacao.lida = true;

            notificacao.resolvida = true;

            if (!notificacao.data_leitura) {
                notificacao.data_leitura = agora;
            }

            notificacao.data_resolucao = agora;

        });

        await this.notificacaoRepository.save(notificacoes);

    }


    // =====================================================
    // GERAR / ATUALIZAR NOTIFICAÇÕES DO DOCUMENTO
    // =====================================================

    private async sincronizarNotificacao(documento: Documento) {

        // Sem condutor não existe destinatário para a notificação.
        if (!documento.id_condutor) return;

        const status =
            calcularStatusDocumento(documento.data_validade);

        const diasRestantes =
            calcularDiasRestantes(documento.data_validade);

        // Documento sem validade ou em dia:
        // resolve eventuais notificações antigas.
        if (status === "Em dia") {

            await this.resolverNotificacoesDocumento(
                documento.id_documento,
                documento.id_condutor
            );

            return;

        }

        let tipo: string;
        let titulo: string;
        let mensagem: string;
        let prioridade: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";


        // =================================================
        // DOCUMENTO VENCIDO
        // =================================================

        if (status === "Vencido") {

            tipo = "DOCUMENTO_VENCIDO";

            titulo = `Documento vencido: ${documento.tipo_documento}`;

            mensagem =
                `O documento ${documento.tipo_documento} está vencido. ` +
                "Regularize a documentação o quanto antes.";

            prioridade = "CRITICA";

        }

        // =================================================
        // DOCUMENTO QUE VENCE HOJE
        // =================================================

        else if (status === "Vence hoje") {

            tipo = "DOCUMENTO_VENCE_HOJE";

            titulo = `Documento vence hoje: ${documento.tipo_documento}`;

            mensagem =
                `O documento ${documento.tipo_documento} vence hoje. ` +
                "Providencie a renovação.";

            prioridade = "ALTA";

        }

        // =================================================
        // DOCUMENTO PRÓXIMO DO VENCIMENTO
        // =================================================

        else {

            tipo = "DOCUMENTO_PROXIMO_VENCIMENTO";

            titulo = `Documento próximo do vencimento: ${documento.tipo_documento}`;

            mensagem =
                `O documento ${documento.tipo_documento} vencerá em ` +
                `${diasRestantes} dia(s). Providencie a renovação.`;

            prioridade = "MEDIA";

        }


        // =================================================
        // CRIAR OU ATUALIZAR NOTIFICAÇÃO
        // =================================================

        await serviceNotificacao.criar({

            id_condutor: documento.id_condutor,

            tipo,

            titulo,

            mensagem,

            prioridade,

            entidade_tipo: "DOCUMENTO",

            entidade_id: documento.id_documento,

        });

    }


    // =====================================================
    // LISTAR DOCUMENTOS
    // =====================================================

    async listar() {

        const documentos =
            await this.documentoRepository.find({
                relations: {
                    condutor: true,
                },
            });

        return documentos.map(incluirStatusDocumento);

    }


    // =====================================================
    // BUSCAR DOCUMENTO POR ID
    // =====================================================

    async buscarPorID(id: number) {

        const documento =
            await this.documentoRepository.findOne({
                where: {
                    id_documento: id,
                },
                relations: {
                    condutor: true,
                },
            });

        if (!documento) {
            throw new Error("Documento não encontrado");
        }

        return incluirStatusDocumento(documento);

    }


    // =====================================================
    // CRIAR DOCUMENTO
    // =====================================================

    async criar(dados: Partial<Documento>) {

        const documento =
            this.documentoRepository.create(dados);

        const documentoSalvo =
            await this.documentoRepository.save(documento);

        await this.sincronizarNotificacao(documentoSalvo);

        return incluirStatusDocumento(documentoSalvo);

    }


    // =====================================================
    // ATUALIZAR DOCUMENTO
    // =====================================================

    async atualizar(
        id: number,
        dados: Partial<Documento>
    ) {

        const documento =
            await this.documentoRepository.findOne({
                where: {
                    id_documento: id,
                },
            });

        if (!documento) {
            throw new Error("Documento não encontrado");
        }

        const condutorAnterior = documento.id_condutor;

        this.documentoRepository.merge(documento, dados);

        const documentoSalvo =
            await this.documentoRepository.save(documento);

        // Se o documento mudou de condutor,
        // resolve a notificação vinculada ao condutor anterior.
        if (
            condutorAnterior &&
            condutorAnterior !== documentoSalvo.id_condutor
        ) {

            await this.resolverNotificacoesDocumento(
                documentoSalvo.id_documento,
                condutorAnterior
            );

        }

        await this.sincronizarNotificacao(documentoSalvo);

        return incluirStatusDocumento(documentoSalvo);

    }


    // =====================================================
    // EXCLUIR DOCUMENTO
    // =====================================================

    async deletar(id_documento: number) {

        const documento =
            await this.documentoRepository.findOneBy({
                id_documento,
            });

        if (!documento) {
            throw new Error("Documento não encontrado");
        }

        if (documento.id_condutor) {

            await this.resolverNotificacoesDocumento(
                documento.id_documento,
                documento.id_condutor
            );

        }

        await this.documentoRepository.remove(documento);

        return {
            message: "Documento excluído com sucesso",
        };

    }

}
