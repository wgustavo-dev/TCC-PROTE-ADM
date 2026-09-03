import { Response } from "express";
import { ServiceNotificacao } from "../services/service_notificacao";
import { AuthRequest } from "../middleware/authMiddleware";

export class ControllerNotificacao {

    private service =
        new ServiceNotificacao();


    // =========================================================
    // LISTAR NOTIFICAÇÕES
    // GET /api/notificacoes
    // =========================================================

    async listar(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const id_condutor =
                Number(req.user?.id);


            if (!id_condutor) {

                return res.status(401).json({
                    sucesso: false,
                    mensagem: "Usuário não autenticado."
                });

            }


            const apenasNaoLidas =
                req.query.apenasNaoLidas === "true";


            const notificacoes =
                await this.service.buscar(
                    id_condutor,
                    apenasNaoLidas
                );


            return res.status(200).json({
                sucesso: true,
                notificacoes
            });


        } catch (error) {

            console.error(
                "[notificacao] Erro ao listar notificações:",
                error
            );


            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao buscar notificações."
            });

        }

    }


    // =========================================================
    // CONTAR NÃO LIDAS
    // GET /api/notificacoes/nao-lidas
    // =========================================================

    async contarNaoLidas(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const id_condutor =
                Number(req.user?.id);


            if (!id_condutor) {

                return res.status(401).json({
                    sucesso: false,
                    mensagem: "Usuário não autenticado."
                });

            }


            const quantidade =
                await this.service.contarNaoLidas(
                    id_condutor
                );


            return res.status(200).json({
                sucesso: true,
                quantidade
            });


        } catch (error) {

            console.error(
                "[notificacao] Erro ao contar não lidas:",
                error
            );


            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao contar notificações."
            });

        }

    }


    // =========================================================
    // BUSCAR POR ID
    // GET /api/notificacoes/:id
    // =========================================================

    async buscarPorId(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const id_condutor =
                Number(req.user?.id);

            const id_notificacao =
                Number(req.params.id);


            if (!id_condutor) {

                return res.status(401).json({
                    sucesso: false,
                    mensagem: "Usuário não autenticado."
                });

            }


            if (!id_notificacao) {

                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID da notificação inválido."
                });

            }


            const notificacao =
                await this.service.buscarPorId(
                    id_notificacao,
                    id_condutor
                );


            if (!notificacao) {

                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Notificação não encontrada."
                });

            }


            return res.status(200).json({
                sucesso: true,
                notificacao
            });


        } catch (error) {

            console.error(
                "[notificacao] Erro ao buscar notificação:",
                error
            );


            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao buscar notificação."
            });

        }

    }


    // =========================================================
    // MARCAR COMO LIDA
    // PATCH /api/notificacoes/:id/lida
    // =========================================================

    async marcarComoLida(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const id_condutor =
                Number(req.user?.id);

            const id_notificacao =
                Number(req.params.id);


            if (!id_condutor) {

                return res.status(401).json({
                    sucesso: false,
                    mensagem: "Usuário não autenticado."
                });

            }


            if (!id_notificacao) {

                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID da notificação inválido."
                });

            }


            const notificacao =
                await this.service.marcarComoLida(
                    id_notificacao,
                    id_condutor
                );


            return res.status(200).json({
                sucesso: true,
                mensagem: "Notificação marcada como lida.",
                notificacao
            });


        } catch (error) {

            console.error(
                "[notificacao] Erro ao marcar como lida:",
                error
            );


            const mensagem =
                error instanceof Error
                    ? error.message
                    : "Erro ao marcar notificação como lida.";


            return res.status(500).json({
                sucesso: false,
                mensagem
            });

        }

    }


    // =========================================================
    // MARCAR COMO RESOLVIDA
    // PATCH /api/notificacoes/:id/resolver
    // =========================================================

    async marcarComoResolvida(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const id_condutor =
                Number(req.user?.id);

            const id_notificacao =
                Number(req.params.id);


            if (!id_condutor) {

                return res.status(401).json({
                    sucesso: false,
                    mensagem: "Usuário não autenticado."
                });

            }


            if (!id_notificacao) {

                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID da notificação inválido."
                });

            }


            const notificacao =
                await this.service.marcarComoResolvida(
                    id_notificacao,
                    id_condutor
                );


            return res.status(200).json({
                sucesso: true,
                mensagem: "Notificação resolvida com sucesso.",
                notificacao
            });


        } catch (error) {

            console.error(
                "[notificacao] Erro ao resolver notificação:",
                error
            );


            const mensagem =
                error instanceof Error
                    ? error.message
                    : "Erro ao resolver notificação.";


            return res.status(500).json({
                sucesso: false,
                mensagem
            });

        }

    }


    // =========================================================
    // MARCAR TODAS COMO LIDAS
    // PATCH /api/notificacoes/marcar-todas-lidas
    // =========================================================

    async marcarTodasComoLidas(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const id_condutor =
                Number(req.user?.id);


            if (!id_condutor) {

                return res.status(401).json({
                    sucesso: false,
                    mensagem: "Usuário não autenticado."
                });

            }


            const notificacoes =
                await this.service.marcarTodasComoLidas(
                    id_condutor
                );


            return res.status(200).json({
                sucesso: true,
                mensagem:
                    "Todas as notificações foram marcadas como lidas.",
                notificacoes
            });


        } catch (error) {

            console.error(
                "[notificacao] Erro ao marcar todas como lidas:",
                error
            );


            return res.status(500).json({
                sucesso: false,
                mensagem:
                    "Erro ao marcar notificações como lidas."
            });

        }

    }


    // =========================================================
    // EXCLUIR NOTIFICAÇÃO
    // DELETE /api/notificacoes/:id
    // =========================================================

    async excluir(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const id_condutor =
                Number(req.user?.id);

            const id_notificacao =
                Number(req.params.id);


            if (!id_condutor) {

                return res.status(401).json({
                    sucesso: false,
                    mensagem: "Usuário não autenticado."
                });

            }


            if (!id_notificacao) {

                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID da notificação inválido."
                });

            }


            const resultado =
                await this.service.excluir(
                    id_notificacao,
                    id_condutor
                );


            return res.status(200).json(
                resultado
            );


        } catch (error) {

            console.error(
                "[notificacao] Erro ao excluir notificação:",
                error
            );


            const mensagem =
                error instanceof Error
                    ? error.message
                    : "Erro ao excluir notificação.";


            return res.status(500).json({
                sucesso: false,
                mensagem
            });

        }

    }

}