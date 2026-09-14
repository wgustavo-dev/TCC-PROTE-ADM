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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restringirMenu);
  } else {
    restringirMenu();
  }
})();
