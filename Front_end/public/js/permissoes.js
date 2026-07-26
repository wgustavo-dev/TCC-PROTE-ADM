/* =========================================================
   permissoes.js
   C3 — Sistema de permissões:
   Quando o usuário logado for MONITOR, apenas os módulos
   "Presença" e "Alunos" (este último somente para
   visualização, sem cadastrar/editar/excluir) permanecem
   acessíveis. Os demais itens do menu são ocultados e o
   acesso direto a qualquer outra página é redirecionado
   para presenca.html.

   Este script deve ser incluído em toda página protegida,
   logo após core/api.js.
   ========================================================= */
(function () {
  var PAGINAS_PERMITIDAS_MONITOR = ["presenca.html", "alunos.html"];
  var PAGINA_PADRAO_MONITOR = "presenca.html";

  function obterUsuario() {
    try {
      return JSON.parse(window.localStorage.getItem("prote_user") || "null");
    } catch (erro) {
      return null;
    }
  }

  var usuario = obterUsuario();

  if (!usuario || usuario.role !== "MONITOR") {
    return;
  }

  var paginaAtual = window.location.pathname.split("/").pop() || "index.html";

  // Bloqueia o acesso a qualquer página fora da lista permitida ao Monitor
  if (PAGINAS_PERMITIDAS_MONITOR.indexOf(paginaAtual) === -1) {
    window.location.replace(PAGINA_PADRAO_MONITOR);
    return;
  }

  // Some com os itens do menu que não sejam Presença ou Alunos
  function restringirMenu() {
    document.querySelectorAll(".nav-item").forEach(function (item) {
      var pagina = item.getAttribute("data-page");
      if (pagina !== "presenca" && pagina !== "alunos") {
        item.remove();
      }
    });
  }

  // Em todas as páginas do sistema esta tag <script> fica posicionada
  // no final do <body>, DEPOIS da <aside class="sidebar"> que contém
  // os itens de menu. Ou seja: no momento em que este código executa,
  // o parser HTML já criou os nós ".nav-item" no DOM — eles já existem,
  // não é preciso esperar nenhum evento para manipulá-los.
  //
  // A versão anterior esperava o evento "DOMContentLoaded" antes de
  // restringir o menu. Esse evento só dispara depois que o documento
  // INTEIRO termina de ser processado, então havia uma janela de tempo
  // em que o navegador já tinha desenhado o menu completo na tela
  // (com todos os módulos) antes do JavaScript finalmente removê-los —
  // esse era o "piscar" reportado ao trocar de página.
  //
  // Chamando restringirMenu() imediatamente, sem esperar nada, a
  // remoção acontece antes de o navegador ter chance de pintar o menu
  // completo na tela.
  restringirMenu();
})();
