/* =========================================================
   PROTE — SISTEMA DE NOTIFICAÇÕES
   ========================================================= */

(function () {

    "use strict";


    // =========================================================
    // ELEMENTOS
    // =========================================================

    const botao =
        document.getElementById("botaoNotificacoes");

    const painel =
        document.getElementById("painelNotificacoes");

    const contador =
        document.getElementById("contadorNotificacoes");

    const lista =
        document.getElementById("listaNotificacoes");

    const texto =
        document.getElementById("textoNotificacoes");

    const marcarTodas =
        document.getElementById("marcarTodasLidas");


    // =========================================================
    // VALIDAR ELEMENTOS
    // =========================================================

    if (
        !botao ||
        !painel ||
        !contador ||
        !lista
    ) {
        console.warn(
            "[notificacoes] Elementos do sistema não encontrados."
        );

        return;
    }


    // =========================================================
    // ESTADO
    // =========================================================

    let notificacoes = [];
    let carregando = false;

    /*
     * Filtro atualmente selecionado.
     *
     * todas
     * nao-lidas
     * lidas
     * criticas
     * resolvidas
     */

    let filtroAtual = "todas";


    // =========================================================
    // AUTENTICAÇÃO
    // =========================================================

    function obterHeaders() {

        const headers = {
            "Content-Type": "application/json"
        };

        const token =
            localStorage.getItem("prote_token") ||
            localStorage.getItem("token");

        if (token) {
            headers.Authorization =
                `Bearer ${token}`;
        }

        return headers;
    }


    // =========================================================
    // ABRIR / FECHAR
    // =========================================================

    botao.addEventListener(
        "click",
        function (evento) {

            evento.stopPropagation();

            const aberto =
                !painel.hasAttribute("hidden");

            if (aberto) {
                fecharPainel();
            } else {
                abrirPainel();
            }

        }
    );


    
function navegarParaNotificacao(notificacao) {
    const tipo = String(notificacao?.tipo || "").toUpperCase();
    const entidadeTipo = String(notificacao?.entidade_tipo || "").toUpperCase();
    const entidadeId = Number(notificacao?.entidade_id);

    if (!entidadeId) return;

    if (
        tipo === "DOCUMENTO_VENCIDO" ||
        tipo === "DOCUMENTO_VENCIMENTO" ||
        tipo === "DOCUMENTO_PROXIMO_VENCIMENTO" ||
        entidadeTipo === "DOCUMENTO"
    ) {
        window.location.href = `documentos.html?notificacao_documento=${entidadeId}`;
        return;
    }

    if (
        tipo === "MENSALIDADE_ATRASADA" ||
        tipo === "MENSALIDADE_PENDENTE" ||
        entidadeTipo === "MENSALIDADE"
    ) {
        window.location.href = `mensalidade.html?notificacao_mensalidade=${entidadeId}`;
        return;
    }

    if (tipo === "NOVO_ORCAMENTO" || entidadeTipo === "ORCAMENTO") {
        window.location.href = `orcamento.html?notificacao_orcamento=${entidadeId}`;
        return;
    }

    console.warn("[notificacoes] Nenhum destino definido para:", notificacao);
}

document.addEventListener(
        "click",
        function (evento) {

            if (
                !painel.contains(evento.target) &&
                !botao.contains(evento.target)
            ) {
                fecharPainel();
            }

        }
    );


    function abrirPainel() {

        painel.removeAttribute("hidden");

        botao.setAttribute(
            "aria-expanded",
            "true"
        );

        carregarNotificacoes();

    }


    function fecharPainel() {

        painel.setAttribute(
            "hidden",
            ""
        );

        botao.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    // =========================================================
    // BUSCAR NOTIFICAÇÕES
    // =========================================================

    async function carregarNotificacoes() {

        if (carregando) {
            return;
        }

        carregando = true;

        try {

            const resposta =
                await fetch(
                    "/api/notificacoes",
                    {
                        method: "GET",
                        headers: obterHeaders(),
                        credentials: "include",
                        cache: "no-store"
                    }
                );


            // =================================================
            // NÃO AUTENTICADO
            // =================================================

            if (resposta.status === 401) {

                console.warn(
                    "[notificacoes] Usuário não autenticado."
                );

                notificacoes = [];

                atualizarContador(0);

                renderizarNotificacoes();

                return;
            }


            // =================================================
            // LER RESPOSTA
            // =================================================

            const dados =
                await resposta.json().catch(
                    () => null
                );


            // =================================================
            // ERRO DA API
            // =================================================

            if (!resposta.ok) {

                console.error(
                    "[notificacoes] Resposta do servidor:",
                    dados
                );

                throw new Error(
                    dados?.mensagem ||
                    `Erro HTTP ${resposta.status}`
                );

            }


            // =================================================
            // INTERPRETAR DADOS
            // =================================================

            if (
                dados &&
                Array.isArray(
                    dados.notificacoes
                )
            ) {

                notificacoes =
                    dados.notificacoes;

            } else if (
                Array.isArray(dados)
            ) {

                notificacoes =
                    dados;

            } else if (
                dados &&
                Array.isArray(dados.data)
            ) {

                notificacoes =
                    dados.data;

            } else {

                notificacoes = [];

            }


            // =================================================
            // RENDERIZAR
            // =================================================

            renderizarNotificacoes();


        } catch (erro) {

            console.error(
                "[notificacoes] Erro ao carregar:",
                erro
            );


            lista.innerHTML = `
                <div class="notificacoes-erro">

                    <div class="notificacao-erro-icone">
                        !
                    </div>

                    <strong>
                        Não foi possível carregar as notificações.
                    </strong>

                    <span>
                        Tente novamente em alguns instantes.
                    </span>

                </div>
            `;


        } finally {

            carregando = false;

        }

    }


    // =========================================================
    // RENDERIZAR
    // =========================================================

    function renderizarNotificacoes() {

        /*
         * O contador do sino SEMPRE considera somente
         * notificações não lidas e não resolvidas.
         */

        const naoLidas =
            notificacoes.filter(
                notificacao =>
                    !Boolean(notificacao.lida) &&
                    !Boolean(notificacao.resolvida)
            );


        atualizarContador(
            naoLidas.length
        );


        // =====================================================
        // SUBTÍTULO
        // =====================================================

        if (texto) {

            if (naoLidas.length === 0) {

                texto.textContent =
                    "Nenhuma nova notificação";

            } else if (
                naoLidas.length === 1
            ) {

                texto.textContent =
                    "1 nova notificação";

            } else {

                texto.textContent =
                    `${naoLidas.length} novas notificações`;

            }

        }


        // =====================================================
        // APLICAR FILTRO
        // =====================================================

        const filtradas =
            aplicarFiltro(notificacoes);


        // =====================================================
        // NENHUMA NOTIFICAÇÃO NO FILTRO
        // =====================================================

        if (filtradas.length === 0) {

            lista.innerHTML =
                criarMensagemVazia();

            return;
        }


        // =====================================================
        // ORDENAR
        // =====================================================

        const ordenadas =
            [...filtradas].sort(
                ordenarNotificacoes
            );


        // =====================================================
        // HTML
        // =====================================================

        lista.innerHTML =
            ordenadas
                .map(
                    criarNotificacaoHTML
                )
                .join("");

    }


    // =========================================================
    // APLICAR FILTRO
    // =========================================================

    function aplicarFiltro(listaNotificacoes) {

        switch (filtroAtual) {

            // -------------------------------------------------
            // TODAS
            // -------------------------------------------------

            case "todas":

                /*
                 * "Todas" mostra tudo que ainda não foi
                 * resolvido.
                 */

                return listaNotificacoes.filter(
                    notificacao =>
                        !Boolean(
                            notificacao.resolvida
                        )
                );


            // -------------------------------------------------
            // NÃO LIDAS
            // -------------------------------------------------

            case "nao-lidas":

                return listaNotificacoes.filter(
                    notificacao =>
                        !Boolean(
                            notificacao.lida
                        ) &&
                        !Boolean(
                            notificacao.resolvida
                        )
                );


            // -------------------------------------------------
            // LIDAS
            // -------------------------------------------------

            case "lidas":

                return listaNotificacoes.filter(
                    notificacao =>
                        Boolean(
                            notificacao.lida
                        ) &&
                        !Boolean(
                            notificacao.resolvida
                        )
                );


            // -------------------------------------------------
            // CRÍTICAS
            // -------------------------------------------------

            case "criticas":

                return listaNotificacoes.filter(
                    notificacao =>
                        String(
                            notificacao.prioridade || ""
                        ).toUpperCase() === "CRITICA" &&
                        !Boolean(
                            notificacao.resolvida
                        )
                );


            // -------------------------------------------------
            // RESOLVIDAS
            // -------------------------------------------------

            case "resolvidas":

                return listaNotificacoes.filter(
                    notificacao =>
                        Boolean(
                            notificacao.resolvida
                        )
                );


            // -------------------------------------------------
            // PADRÃO
            // -------------------------------------------------

            default:

                return listaNotificacoes.filter(
                    notificacao =>
                        !Boolean(
                            notificacao.resolvida
                        )
                );

        }

    }


    // =========================================================
    // ORDENAR NOTIFICAÇÕES
    // =========================================================

    function ordenarNotificacoes(a, b) {

        /*
         * Hierarquia:
         *
         * CRÍTICA = 4
         * ALTA     = 3
         * MÉDIA    = 2
         * BAIXA    = 1
         */

        const prioridade = {
            CRITICA: 4,
            ALTA: 3,
            MEDIA: 2,
            BAIXA: 1
        };


        const prioridadeA =
            prioridade[
                String(
                    a.prioridade || "MEDIA"
                ).toUpperCase()
            ] || 2;


        const prioridadeB =
            prioridade[
                String(
                    b.prioridade || "MEDIA"
                ).toUpperCase()
            ] || 2;


        /*
         * Primeiro:
         * não lidas.
         */

        if (
            Boolean(a.lida) !==
            Boolean(b.lida)
        ) {

            return a.lida
                ? 1
                : -1;

        }


        /*
         * Depois:
         * maior prioridade.
         */

        if (
            prioridadeA !==
            prioridadeB
        ) {

            return prioridadeB -
                prioridadeA;

        }


        /*
         * Por último:
         * mais recentes.
         */

        const dataA =
            new Date(
                a.data_criacao
            ).getTime();

        const dataB =
            new Date(
                b.data_criacao
            ).getTime();

        return dataB - dataA;

    }


    // =========================================================
    // MENSAGEM VAZIA
    // =========================================================

    function criarMensagemVazia() {

        switch (filtroAtual) {

            case "nao-lidas":

                return `
                    <div class="notificacoes-vazio">

                        <div class="notificacao-vazio-icone">
                            ✓
                        </div>

                        <strong>
                            Tudo lido
                        </strong>

                        <span>
                            Você não possui notificações não lidas.
                        </span>

                    </div>
                `;


            case "lidas":

                return `
                    <div class="notificacoes-vazio">

                        <div class="notificacao-vazio-icone">
                            ✓
                        </div>

                        <strong>
                            Nenhuma notificação lida
                        </strong>

                        <span>
                            Não há notificações lidas pendentes.
                        </span>

                    </div>
                `;


            case "criticas":

                return `
                    <div class="notificacoes-vazio">

                        <div class="notificacao-vazio-icone">
                            ✓
                        </div>

                        <strong>
                            Nenhuma notificação crítica
                        </strong>

                        <span>
                            Não há notificações críticas pendentes.
                        </span>

                    </div>
                `;


            case "resolvidas":

                return `
                    <div class="notificacoes-vazio">

                        <div class="notificacao-vazio-icone">
                            ✓
                        </div>

                        <strong>
                            Nenhuma notificação resolvida
                        </strong>

                        <span>
                            Seu histórico de notificações resolvidas está vazio.
                        </span>

                    </div>
                `;


            default:

                return `
                    <div class="notificacoes-vazio">

                        <div class="notificacao-vazio-icone">
                            ✓
                        </div>

                        <strong>
                            Tudo em dia
                        </strong>

                        <span>
                            Você não possui notificações pendentes.
                        </span>

                    </div>
                `;

        }

    }


    // =========================================================
    // CONTADOR
    // =========================================================

    function atualizarContador(total) {

        if (total <= 0) {

            contador.hidden = true;
            contador.textContent = "0";

            return;
        }


        contador.hidden = false;

        contador.textContent =
            total > 99
                ? "99+"
                : String(total);

    }


    // =========================================================
    // HTML DA NOTIFICAÇÃO
    // =========================================================

    function criarNotificacaoHTML(
        notificacao
    ) {

        const prioridade =
            String(
                notificacao.prioridade ||
                "MEDIA"
            ).toLowerCase();


        const icone =
            obterIcone(
                notificacao.tipo
            );


        const data =
            formatarData(
                notificacao.data_criacao
            );


        const classeLida =
            notificacao.lida
                ? ""
                : "nao-lida";


        const classeResolvida =
            notificacao.resolvida
                ? "resolvida"
                : "";


        const id =
            Number(
                notificacao.id_notificacao
            );


        return `
            <div
                class="item-notificacao ${classeLida} ${classeResolvida}"
                data-id="${id}"
            >

                <div
                    class="notificacao-indicador ${prioridade}"
                >
                    ${icone}
                </div>


                <div
                    class="notificacao-conteudo"
                >

                    <div
                        class="notificacao-titulo"
                    >
                        ${escaparHTML(
                            notificacao.titulo
                        )}
                    </div>


                    <div
                        class="notificacao-mensagem"
                    >
                        ${escaparHTML(
                            notificacao.mensagem
                        )}
                    </div>


                    <div
                        class="notificacao-data"
                    >
                        ${data}
                    </div>


                    <span
                        class="notificacao-acao"
                    >
                        ${notificacao.resolvida ? "Resolvida ✓" : "Ver detalhes →"}
                    </span>

                </div>

            </div>
        `;

    }


    // =========================================================
    // ÍCONES
    // =========================================================

    function obterIcone(tipo) {

        switch (tipo) {

            case "DOCUMENTO_VENCIDO":
                return "⚠";

            case "DOCUMENTO_VENCIMENTO":
                return "◷";

            case "DOCUMENTO_PROXIMO_VENCIMENTO":
                return "◷";

            case "NOVO_ORCAMENTO":
                return "▣";

            case "MENSALIDADE_ATRASADA":
                return "$";

            case "MENSALIDADE_PENDENTE":
                return "$";

            default:
                return "●";

        }

    }


    // =========================================================
    // FORMATAR DATA
    // =========================================================

    function formatarData(data) {

        if (!data) {
            return "";
        }


        const dataObj =
            new Date(data);


        if (
            Number.isNaN(
                dataObj.getTime()
            )
        ) {

            return "";

        }


        return dataObj.toLocaleString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    // =========================================================
    // CLIQUE EM NOTIFICAÇÃO
    // =========================================================

    lista.addEventListener(
        "click",
        async function (evento) {

            const item =
                evento.target.closest(
                    ".item-notificacao"
                );

            if (!item) {
                return;
            }

            const id =
                Number(
                    item.dataset.id
                );

            if (!id) {
                return;
            }

            const notificacao =
                notificacoes.find(
                    notificacao =>
                        Number(
                            notificacao.id_notificacao
                        ) === id
                );

            if (!notificacao) {
                return;
            }

            // Notificação resolvida não precisa abrir novamente.
            if (Boolean(notificacao.resolvida)) {
                return;
            }

            try {

                // Ao abrir uma notificação não lida, ela passa para LIDA.
                if (!Boolean(notificacao.lida)) {

                    await marcarComoLida(id);

                    notificacao.lida = true;

                    notificacao.data_leitura =
                        new Date().toISOString();

                    renderizarNotificacoes();
                }

                // Depois da leitura, direciona para o registro relacionado.
                navegarParaNotificacao(notificacao);

            } catch (erro) {

                console.error(
                    "[notificacoes] Erro ao abrir notificação:",
                    erro
                );

            }

        }
    );


    // =========================================================
    // MARCAR COMO LIDA
    // =========================================================

    async function marcarComoLida(id) {

        const resposta =
            await fetch(
                `/api/notificacoes/${id}/lida`,
                {
                    method: "PATCH",
                    headers: obterHeaders(),
                    credentials: "include"
                }
            );


        const dados =
            await resposta.json().catch(
                () => null
            );


        if (!resposta.ok) {

            throw new Error(
                dados?.mensagem ||
                `Erro HTTP ${resposta.status}`
            );

        }


        return dados;

    }


    // =========================================================
    // MARCAR TODAS COMO LIDAS
    // =========================================================

    if (marcarTodas) {

        marcarTodas.addEventListener(
            "click",
            async function (evento) {

                evento.stopPropagation();


                try {

                    const resposta =
                        await fetch(
                            "/api/notificacoes/marcar-todas-lidas",
                            {
                                method: "PATCH",
                                headers: obterHeaders(),
                                credentials: "include"
                            }
                        );


                    const dados =
                        await resposta.json().catch(
                            () => null
                        );


                    if (!resposta.ok) {

                        throw new Error(
                            dados?.mensagem ||
                            `Erro HTTP ${resposta.status}`
                        );

                    }


                    notificacoes.forEach(
                        notificacao => {

                            if (
                                !notificacao.resolvida
                            ) {

                                notificacao.lida =
                                    true;

                                notificacao.data_leitura =
                                    new Date().toISOString();

                            }

                        }
                    );


                    renderizarNotificacoes();


                } catch (erro) {

                    console.error(
                        "[notificacoes] Erro ao marcar todas como lidas:",
                        erro
                    );

                }

            }
        );

    }


    // =========================================================
    // FILTROS
    // =========================================================

    function configurarFiltros() {

        /*
         * Procuramos botões com:
         *
         * data-filtro="todas"
         * data-filtro="nao-lidas"
         * data-filtro="lidas"
         * data-filtro="criticas"
         * data-filtro="resolvidas"
         */

        const filtros =
            painel.querySelectorAll(
                "[data-filtro]"
            );


        if (!filtros.length) {

            console.warn(
                "[notificacoes] Nenhum filtro encontrado no painel."
            );

            return;

        }


        filtros.forEach(
            filtro => {

                filtro.addEventListener(
                    "click",
                    function (evento) {

                        evento.stopPropagation();

                        filtroAtual =
                            filtro.dataset.filtro ||
                            "todas";


                        /*
                         * Atualiza estado visual.
                         */

                        filtros.forEach(
                            outroFiltro => {

                                outroFiltro.classList.toggle(
                                    "ativo",
                                    outroFiltro === filtro
                                );

                                outroFiltro.setAttribute(
                                    "aria-selected",
                                    outroFiltro === filtro
                                        ? "true"
                                        : "false"
                                );

                            }
                        );


                        renderizarNotificacoes();

                    }
                );

            }
        );


        /*
         * Filtro padrão.
         */

        filtros.forEach(
            filtro => {

                const ativo =
                    (
                        filtro.dataset.filtro ||
                        "todas"
                    ) === filtroAtual;


                filtro.classList.toggle(
                    "ativo",
                    ativo
                );


                filtro.setAttribute(
                    "aria-selected",
                    ativo
                        ? "true"
                        : "false"
                );

            }
        );

    }


    // =========================================================
    // SEGURANÇA
    // =========================================================

    function escaparHTML(texto) {

        if (
            texto === null ||
            texto === undefined
        ) {

            return "";

        }


        return String(texto)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    // =========================================================
    // INICIALIZAÇÃO
    // =========================================================

    configurarFiltros();

    carregarNotificacoes();


    // =========================================================
    // ATUALIZAÇÃO AUTOMÁTICA
    // =========================================================

    setInterval(
        carregarNotificacoes,
        60 * 1000
    );


})();