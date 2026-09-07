/**
 * Uso (2 arquivos):
 *
 *   <script src="js/perfil-widget.js"></script>
 *   <script src="js/perfil-init.js"></script>
 *
 * O perfil-init.js continua igual, sem precisar de mudanças:
 *
 *   window.__PERFIL_WIDGET_MANUAL_INIT__ = true;
 *   PerfilWidget.init({
 *     userStorageKey: "prote_user",
 *     changePasswordUrl: "redefinir_senha.html",
 *     logoutUrl: "login.html",
 *   });
 *
 * POSICIONAMENTO
 * ---------------
 * O widget escolhe sozinho onde nascer, nesta ordem:
 *
 *   1) Se já existir no seu HTML um elemento
 *      <div id="perfil-widget-root"></div>
 *      (por exemplo, dentro do seu .sidebar-footer), o widget
 *      usa ESSE elemento e se comporta em modo "embutido":
 *      ocupa 100% da largura do container, sem flutuar por
 *      cima da página. É o que você já fez no seu index.html
 *      — não precisa configurar mais nada.
 *
 *   2) Senão, se você passar um seletor em `container` no
 *      PerfilWidget.init({...}), ele cria o elemento dentro
 *      desse seletor (mesmo efeito do item 1, útil se você
 *      não quiser mexer no HTML da sidebar):
 *
 *        PerfilWidget.init({ container: "#sidebar-perfil-slot" });
 *
 *   3) Senão, cria um botão fixo flutuando no canto inferior
 *      esquerdo da tela (comportamento padrão de antes).
 */

(function () {
  "use strict";

  var DEFAULT_CONFIG = {
    userStorageKey: "prote_user",
    changePasswordUrl: "redefinir_senha.html",
    logoutUrl: "login.html",
    logoutEndpoint: null,
    clearKeysOnLogout: ["prote_user", "prote_token", "usuarioLogado", "token", "authToken"],
    // Seletor CSS opcional: se definido, o widget nasce dentro
    // desse elemento (modo "embutido") em vez de flutuar fixo
    // sobre a página.
    container: null
  };

  var GENERIC_AVATAR_SVG =
    '<svg viewBox="0 0 24 24" width="56%" height="56%" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.34 0-10 1.68-10 5v3h20v-3c0-3.32-6.66-5-10-5z"/>' +
    "</svg>";

  var config = assign({}, DEFAULT_CONFIG);
  var injected = false;
  var els = {};

  // ---------- utilidades ----------

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i] || {};
      for (var key in src) {
        if (Object.prototype.hasOwnProperty.call(src, key)) target[key] = src[key];
      }
    }
    return target;
  }

  function getScriptDir() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("perfil-widget.js") !== -1) {
        return src.slice(0, src.lastIndexOf("/") + 1);
      }
    }
    return "";
  }

  function injectStyles() {
    if (document.getElementById("pw-styles")) return;
    var link = document.createElement("link");
    link.id = "pw-styles";
    link.rel = "stylesheet";
    link.href = getScriptDir() + "perfil-widget.css";
    document.head.appendChild(link);
  }

  // Decide ONDE o widget nasce e se ele fica em modo "embutido"
  // (dentro da sidebar, sem flutuar) ou "flutuante" (fixo na tela).
  // Ver a explicação completa no comentário do topo do arquivo.
  function resolveRoot() {
    // 1) Já existe <div id="perfil-widget-root"> no HTML? Usa ele.
    var existente = document.getElementById("perfil-widget-root");
    if (existente) {
      return { el: existente, embedded: true };
    }

    // 2) Foi passado um `container` na configuração? Cria dentro dele.
    if (config.container) {
      var pai = document.querySelector(config.container);
      if (pai) {
        var novo = document.createElement("div");
        novo.id = "perfil-widget-root";
        pai.appendChild(novo);
        return { el: novo, embedded: true };
      }
      console.warn('[PerfilWidget] Container "' + config.container + '" não encontrado; usando modo flutuante.');
    }

    // 3) Nenhum dos dois: cria flutuando fixo sobre a página.
    var flutuante = document.createElement("div");
    flutuante.id = "perfil-widget-root";
    document.body.appendChild(flutuante);
    return { el: flutuante, embedded: false };
  }

  // ---------- dados do usuário ----------

  function loadUser() {
    try {
      var raw = localStorage.getItem(config.userStorageKey);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {
      console.warn("[PerfilWidget] Não foi possível ler o usuário salvo:", e);
    }

    console.warn(
      '[PerfilWidget] Nenhum usuário encontrado em localStorage["' +
        config.userStorageKey +
        '"]. Exibindo dados de demonstração. ' +
        "Depois do login real, salve o usuário com PerfilWidget.setUser({...}) " +
        'ou localStorage.setItem("' +
        config.userStorageKey +
        '", JSON.stringify(usuario)).'
    );

    return {
      nome: "Usuário demonstração",
      cargo: "Perfil não configurado",
      email: "defina-um-usuario@seusite.com",
      permissao: "—",
      foto: null
    };
  }

  // Cargo/role: aceita os dois nomes de campo, caso sua API varie.
  function resolveCargo(user) {
    return (user && (user.cargo || user.role)) || "";
  }

  function primeiroNome(nome) {
    return String(nome || "Usuário").trim().split(/\s+/).filter(Boolean)[0] || "Usuário";
  }

  // Permissão exibida: usa "permissao" se vier pronta da API;
  // senão, deduz a partir do cargo/role (ajuste os casos abaixo
  // conforme os perfis do seu sistema).
  function resolvePermissao(user) {
    if (!user) return "—";
    if (user.permissao) return user.permissao;

    switch ((user.role || user.cargo || "").toUpperCase()) {
      case "CONDUTOR":
        return "Acesso Geral";
      case "MONITOR":
        return "Acesso Parcial";
      default:
        return user.role || user.cargo || "—";
    }
  }

  // ---------- construção do DOM ----------

  function buildAvatar(user, large) {
    var wrap = document.createElement("span");
    wrap.className = "pw-avatar" + (large ? " pw-avatar-lg" : "");

    if (user && user.foto) {
      var img = document.createElement("img");
      img.className = "pw-avatar-img";
      img.src = user.foto;
      img.alt = "";
      wrap.appendChild(img);
    } else {
      // Sem foto cadastrada: usa o ícone genérico (igual ao mockup),
      // em vez de iniciais coloridas.
      wrap.innerHTML = GENERIC_AVATAR_SVG;
    }
    return wrap;
  }

  function icon(pathHtml, extraClass) {
    return (
      '<svg class="pw-info-icon' + (extraClass ? " " + extraClass : "") + '" width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      pathHtml +
      "</svg>"
    );
  }

  function build() {
    injectStyles();

    var mount = resolveRoot();
    var root = mount.el;
    root.className = "pw-scope" + (mount.embedded ? " pw-embedded" : "");

    // HTML 100% estático (sem dados de usuário interpolados aqui).
    // Os dados dinâmicos são sempre inseridos depois via textContent/DOM.
    root.innerHTML =
      '<button type="button" id="pw-trigger" class="pw-trigger" aria-haspopup="true" aria-expanded="false">' +
      '  <span id="pw-avatar-trigger-slot"></span>' +
      '  <span class="pw-trigger-info">' +
      '    <span class="pw-trigger-name" id="pw-trigger-name"></span>' +
      '    <span class="pw-trigger-role" id="pw-trigger-role"></span>' +
      "  </span>" +
      '  <svg class="pw-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '    <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "  </svg>" +
      "</button>" +
      '<div id="pw-panel" class="pw-panel pw-scope" role="menu" aria-hidden="true" aria-label="Menu da conta">' +
      '  <div class="pw-panel-header">' +
      '    <span id="pw-avatar-panel-slot"></span>' +
      '    <div class="pw-panel-header-text">' +
      '      <div class="pw-panel-name" id="pw-panel-name"></div>' +
      '      <span class="pw-panel-role" id="pw-panel-role"></span>' +
      "    </div>" +
      "  </div>" +
      '  <div class="pw-panel-body">' +
      '    <div class="pw-info-row">' +
      icon('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>') +
      '      <div class="pw-info-text">' +
      '        <span class="pw-info-label">E-mail</span>' +
      '        <span class="pw-info-value" id="pw-email"></span>' +
      "      </div>" +
      "    </div>" +
      '    <div class="pw-info-row">' +
      icon('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>') +
      '      <div class="pw-info-text">' +
      '        <span class="pw-info-label">Senha</span>' +
      '        <span class="pw-info-value">••••••••</span>' +
      "      </div>" +
      '      <button type="button" id="pw-change-password" class="pw-link-btn">Alterar senha</button>' +
      "    </div>" +
      '    <div class="pw-info-row">' +
      icon('<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/>') +
      '      <div class="pw-info-text">' +
      '        <span class="pw-info-label">Permissão</span>' +
      '        <span class="pw-info-value" id="pw-permission"></span>' +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      '  <div class="pw-panel-footer">' +
      '    <button type="button" id="pw-logout" class="pw-logout-btn">' +
      icon(
        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
        "pw-logout-icon"
      ) +
      "      Sair da Conta" +
      "    </button>" +
      "  </div>" +
      "</div>";

    els = {
      root: root,
      trigger: root.querySelector("#pw-trigger"),
      panel: root.querySelector("#pw-panel"),
      avatarTriggerSlot: root.querySelector("#pw-avatar-trigger-slot"),
      avatarPanelSlot: root.querySelector("#pw-avatar-panel-slot"),
      triggerName: root.querySelector("#pw-trigger-name"),
      triggerRole: root.querySelector("#pw-trigger-role"),
      panelName: root.querySelector("#pw-panel-name"),
      panelRole: root.querySelector("#pw-panel-role"),
      email: root.querySelector("#pw-email"),
      permission: root.querySelector("#pw-permission"),
      changePassword: root.querySelector("#pw-change-password"),
      logout: root.querySelector("#pw-logout")
    };

    els.trigger.addEventListener("click", togglePanel);
    els.changePassword.addEventListener("click", function (e) {
      e.stopPropagation();
      window.location.href = config.changePasswordUrl;
    });
    els.logout.addEventListener("click", function (e) {
      e.stopPropagation();
      handleLogout();
    });

    // Modo embutido: a sidebar costuma ter "overflow" (pra rolar o
    // menu), o que cortaria o painel se ele ficasse preso lá dentro.
    // Solução: mover o painel pro <body> só quando for aberto, e
    // posicioná-lo com "position: fixed" ancorado no botão via JS
    // (função posicionarPainelEmbutido). Ele nunca é cortado, não
    // importa o overflow/scroll da sidebar. O botão continua dentro
    // da sidebar normalmente — só o cartão que abre é que "voa" pra
    // fora.
    if (mount.embedded) {
      document.body.appendChild(els.panel);
      els.panel.style.position = "fixed";
      els.panel.style.zIndex = "2147483000";
    }

    injected = true;
  }

  // ---------- renderização ----------

  function render(user) {
    if (!injected) build();

    if (els.avatarTriggerSlot.firstChild) els.avatarTriggerSlot.removeChild(els.avatarTriggerSlot.firstChild);
    els.avatarTriggerSlot.appendChild(buildAvatar(user, false));

    if (els.avatarPanelSlot.firstChild) els.avatarPanelSlot.removeChild(els.avatarPanelSlot.firstChild);
    els.avatarPanelSlot.appendChild(buildAvatar(user, true));

    var cargo = resolveCargo(user);

    els.triggerName.textContent = primeiroNome(user && user.nome);
    els.triggerRole.textContent = cargo;
    els.panelName.textContent = (user && user.nome) || "Usuário";
    els.panelRole.textContent = cargo || "—";
    els.email.textContent = (user && user.email) || "—";
    els.permission.textContent = resolvePermissao(user);
  }

  // ---------- abrir / fechar painel ----------

  // Calcula onde o painel portado (modo embutido) deve aparecer na
  // tela, sempre ancorado visualmente ao botão — mesmo que a sidebar
  // tenha rolado ou a janela tenha sido redimensionada.
  function posicionarPainelEmbutido() {
    if (els.panel.style.position !== "fixed") return; // só se aplica ao modo embutido/portado

    var rect = els.trigger.getBoundingClientRect();
    var largura = els.panel.offsetWidth || 300;
    var margem = 8;

    // Mantém o painel dentro da tela horizontalmente (útil em telas estreitas)
    var esquerda = Math.min(rect.left, window.innerWidth - largura - margem);
    esquerda = Math.max(margem, esquerda);

    els.panel.style.left = esquerda + "px";
    els.panel.style.bottom = window.innerHeight - rect.top + 12 + "px";
  }

  function openPanel() {
    posicionarPainelEmbutido();
    els.panel.classList.add("pw-panel-open");
    els.trigger.setAttribute("aria-expanded", "true");
    els.panel.setAttribute("aria-hidden", "false");
    document.addEventListener("click", handleOutsideClick, true);
    document.addEventListener("keydown", handleKeydown);
    // "true" (fase de captura) pega o scroll de dentro da sidebar também,
    // já que o evento de scroll não borbulha (bubble) normalmente.
    window.addEventListener("scroll", posicionarPainelEmbutido, true);
    window.addEventListener("resize", posicionarPainelEmbutido);
  }

  function closePanel() {
    els.panel.classList.remove("pw-panel-open");
    els.trigger.setAttribute("aria-expanded", "false");
    els.panel.setAttribute("aria-hidden", "true");
    document.removeEventListener("click", handleOutsideClick, true);
    document.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("scroll", posicionarPainelEmbutido, true);
    window.removeEventListener("resize", posicionarPainelEmbutido);
  }

  function togglePanel() {
    if (els.panel.classList.contains("pw-panel-open")) closePanel();
    else openPanel();
  }

  function handleOutsideClick(e) {
    // No modo embutido, o painel foi movido pra fora da "root" (ver
    // build()), então precisamos checar os dois separadamente.
    if (els.root.contains(e.target)) return;
    if (els.panel.contains(e.target)) return;
    closePanel();
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      closePanel();
      els.trigger.focus();
    }
  }

  // ---------- ações ----------

  function handleLogout() {
    els.logout.disabled = true;
    els.logout.textContent = "Saindo...";

    function finishLogout() {
      config.clearKeysOnLogout.forEach(function (key) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      window.location.href = config.logoutUrl;
    }

    if (config.logoutEndpoint) {
      fetch(config.logoutEndpoint, { method: "POST", credentials: "include" })
        .catch(function (err) {
          console.warn("[PerfilWidget] Falha ao avisar o servidor sobre o logout; saindo apenas localmente.", err);
        })
        .finally(finishLogout);
    } else {
      finishLogout();
    }
  }

  // ---------- API pública ----------

  window.PerfilWidget = {
    init: function (userConfig) {
      config = assign({}, DEFAULT_CONFIG, userConfig || {});
      render(loadUser());
    },
    setUser: function (user) {
      try {
        localStorage.setItem(config.userStorageKey, JSON.stringify(user));
      } catch (e) {
        console.warn("[PerfilWidget] Não foi possível salvar o usuário em localStorage:", e);
      }
      render(user);
    },
    destroy: function () {
      if (els.panel && els.panel.parentNode) els.panel.parentNode.removeChild(els.panel);
      if (els.root && els.root.parentNode) els.root.parentNode.removeChild(els.root);
      document.removeEventListener("click", handleOutsideClick, true);
      document.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("scroll", posicionarPainelEmbutido, true);
      window.removeEventListener("resize", posicionarPainelEmbutido);
      injected = false;
      els = {};
    }
  };

  if (!window.__PERFIL_WIDGET_MANUAL_INIT__) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        window.PerfilWidget.init();
      });
    } else {
      window.PerfilWidget.init();
    }
  }
})();
