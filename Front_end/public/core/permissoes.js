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
  var PAGINAS_MENU_MONITOR = ["presenca", "alunos"];
  var GRUPOS_MENU = [
    {
      titulo: "Resumo",
      paginas: ["dashboard", "presenca"]
    },
    {
      titulo: "Financeiro",
      paginas: ["mensalidades", "orcamento", "despesas"]
    },
    {
      titulo: "Clientes",
      paginas: ["responsaveis", "alunos", "escolas"]
    },
    {
      titulo: "Administração",
      paginas: ["documentos", "acessos"]
    }
  ];

  var ROTULOS_MENU = {
    dashboard: "Painel"
  };

  function obterUsuario() {
    try {
      return JSON.parse(window.localStorage.getItem("prote_user") || "null");
    } catch (erro) {
      return null;
    }
  }

  function usuarioEhMonitor(usuario) {
    return Boolean(usuario && usuario.role === "MONITOR");
  }

  function atualizarRotuloItem(item) {
    var pagina = item.getAttribute("data-page");
    var rotulo = ROTULOS_MENU[pagina];

    if (!rotulo) {
      return;
    }

    var texto = Array.prototype.find.call(item.childNodes, function (node) {
      return node.nodeType === Node.TEXT_NODE && node.textContent.trim();
    });

    if (texto) {
      texto.textContent = "\n          " + rotulo + "\n        ";
    } else {
      item.appendChild(document.createTextNode(rotulo));
    }
  }

  function organizarMenu(monitor) {
    var nav = document.querySelector(".nav");

    if (!nav) {
      return;
    }

    var itensPorPagina = {};

    Array.prototype.forEach.call(nav.querySelectorAll(".nav-item"), function (item) {
      var pagina = item.getAttribute("data-page");

      if (!pagina) {
        return;
      }

      atualizarRotuloItem(item);

      if (monitor && PAGINAS_MENU_MONITOR.indexOf(pagina) === -1) {
        item.remove();
        return;
      }

      itensPorPagina[pagina] = item;
    });

    Array.prototype.forEach.call(nav.querySelectorAll(".nav-section-title"), function (titulo) {
      titulo.remove();
    });

    var fragmento = document.createDocumentFragment();

    GRUPOS_MENU.forEach(function (grupo) {
      var itensVisiveis = grupo.paginas
        .map(function (pagina) {
          return itensPorPagina[pagina];
        })
        .filter(Boolean);

      if (!itensVisiveis.length) {
        return;
      }

      var titulo = document.createElement("span");
      titulo.className = "nav-section-title";
      titulo.textContent = grupo.titulo;
      fragmento.appendChild(titulo);

      itensVisiveis.forEach(function (item) {
        fragmento.appendChild(item);
      });
    });

    nav.innerHTML = "";
    nav.appendChild(fragmento);
  }

  function configurarIndicadorRolagemMenu() {
    var sidebar = document.getElementById("sidebar");
    var nav = document.querySelector(".nav");

    if (!sidebar || !nav) {
      return;
    }

    var indicador = sidebar.querySelector(".nav-scroll-hint");

    if (!indicador) {
      indicador = document.createElement("div");
      indicador.className = "nav-scroll-hint";
      indicador.setAttribute("aria-hidden", "true");
      indicador.innerHTML =
        '<span class="nav-scroll-hint-icon">↓</span>' +
        '<span>Role para baixo para visualizar todos os módulos</span>';
      sidebar.appendChild(indicador);
    }

    function atualizar() {
      var footer = sidebar.querySelector(".sidebar-footer");
      if (footer) {
        sidebar.style.setProperty("--sidebar-footer-height", footer.offsetHeight + "px");
      }

      var temConteudoOculto = nav.scrollHeight - nav.clientHeight - nav.scrollTop > 8;
      indicador.classList.toggle("visivel", temConteudoOculto);
      nav.classList.toggle("tem-conteudo-oculto", temConteudoOculto);
    }

    nav.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);

    setTimeout(atualizar, 0);
    setTimeout(atualizar, 250);
  }

  function fecharMenuMobile() {
    var sidebar = document.getElementById("sidebar");
    var fundoEscuro = document.getElementById("fundoEscuro");
    var botaoMenu = document.getElementById("botaoMenu");

    if (window.innerWidth > 700 || !sidebar) {
      return;
    }

    sidebar.classList.remove("aberta");

    if (fundoEscuro) {
      fundoEscuro.classList.remove("visivel");
      fundoEscuro.classList.remove("ativo");
    }

    if (botaoMenu) {
      botaoMenu.classList.remove("aberto");
      botaoMenu.setAttribute("aria-label", "Abrir menu");
    }
  }

  function configurarFechamentoMenu() {
    document.querySelectorAll(".nav-item").forEach(function (item) {
      item.addEventListener("click", fecharMenuMobile);
    });
  }

  function iniciarInterfaceCompartilhada() {
    var usuario = obterUsuario();
    var monitor = usuarioEhMonitor(usuario);
    var paginaAtual = window.location.pathname.split("/").pop() || "index.html";

    if (monitor && PAGINAS_PERMITIDAS_MONITOR.indexOf(paginaAtual) === -1) {
      window.location.replace(PAGINA_PADRAO_MONITOR);
      return;
    }

    organizarMenu(monitor);
    configurarIndicadorRolagemMenu();
    configurarFechamentoMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarInterfaceCompartilhada);
  } else {
    iniciarInterfaceCompartilhada();
  }
})();
