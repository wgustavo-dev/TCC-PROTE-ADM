/* =======================================================
   login.js
   Lógica da página de login do PROTE
   Telas: Login → Esqueceu a Senha → Redefinir Senha

   Endpoints esperados no back-end:
   POST /auth/login           → { email, senha }
   POST /auth/recuperar-senha → { email }
   POST /auth/redefinir-senha → { token, novaSenha }

   Adapte os endpoints conforme seu back-end.
   ======================================================= */


/* -------------------------------------------------------
   REFERÊNCIAS AOS ELEMENTOS
------------------------------------------------------- */

/* Telas */
var telaLogin = document.getElementById('telaLogin');
var telaEsqueceuSenha = document.getElementById('telaEsqueceuSenha');
var telaRedefinirSenha = document.getElementById('telaRedefinirSenha');

/* Campos — Login */
var campEmail = document.getElementById('campEmail');
var campSenha = document.getElementById('campSenha');
var erroEmail = document.getElementById('erroEmail');
var erroSenha = document.getElementById('erroSenha');
var erroLogin = document.getElementById('erroLogin');

/* Campos — Esqueceu a senha */
var campEmailRecuperacao = document.getElementById('campEmailRecuperacao');
var erroEmailRecuperacao = document.getElementById('erroEmailRecuperacao');

/* Campos — Redefinir senha */
var campNovaSenha = document.getElementById('campNovaSenha');
var campConfirmarSenha = document.getElementById('campConfirmarSenha');
var erroRedefinir = document.getElementById('erroRedefinir');

/* Botões — Login */
var botaoEntrar = document.getElementById('botaoEntrar');
var botaoEsqueceuSenha = document.getElementById('botaoEsqueceuSenha');
var botaoVerSenha = document.getElementById('botaoVerSenha');
var iconeOlhoAberto = document.getElementById('iconeOlhoAberto');
var iconeOlhoFechado = document.getElementById('iconeOlhoFechado');

/* Botões — Esqueceu a senha */
var botaoEnviarLink = document.getElementById('botaoEnviarLink');
var botaoVoltarLogin = document.getElementById('botaoVoltarLogin');
var botaoVoltarLoginLink = document.getElementById('botaoVoltarLoginLink');

/* Botões — Redefinir senha */
var botaoSalvarSenha = document.getElementById('botaoSalvarSenha');
var botaoVoltarEsqueceu = document.getElementById('botaoVoltarEsqueceu');
var botaoVoltarLoginRedefinir = document.getElementById('botaoVoltarLoginRedefinir');
var botaoVerNovaSenha = document.getElementById('botaoVerNovaSenha');
var botaoVerConfirmarSenha = document.getElementById('botaoVerConfirmarSenha');

/* Botões fechar */
var botaoFecharLogin = document.getElementById('botaoFecharLogin');
var botaoFecharEsqueceu = document.getElementById('botaoFecharEsqueceu');
var botaoFecharRedefinir = document.getElementById('botaoFecharRedefinir');

/* Checklist de senha */
var reqMinimo = document.getElementById('reqMinimo');
var reqLetra = document.getElementById('reqLetra');
var reqNumero = document.getElementById('reqNumero');
var reqIguais = document.getElementById('reqIguais');


/* -------------------------------------------------------
   NAVEGAÇÃO ENTRE TELAS
   Esconde todas e exibe apenas a solicitada.
------------------------------------------------------- */
function mostrarTela(tela) {
    telaLogin.style.display = 'none';
    telaEsqueceuSenha.style.display = 'none';
    telaRedefinirSenha.style.display = 'none';
    tela.style.display = 'flex';
}

botaoEsqueceuSenha.addEventListener('click', function () {
    campEmailRecuperacao.value = campEmail.value; /* pré-preenche com o e-mail já digitado */
    limparErrosEsqueceu();
    mostrarTela(telaEsqueceuSenha);
});

botaoVoltarLogin.addEventListener('click', function () { mostrarTela(telaLogin); });
botaoVoltarLoginLink.addEventListener('click', function () { mostrarTela(telaLogin); });
botaoVoltarEsqueceu.addEventListener('click', function () { mostrarTela(telaEsqueceuSenha); });
botaoVoltarLoginRedefinir.addEventListener('click', function () { mostrarTela(telaLogin); });


/* Botões fechar — como é a primeira tela, apenas recarrega */
[botaoFecharLogin, botaoFecharEsqueceu, botaoFecharRedefinir].forEach(function (btn) {
    if (!btn) return;
    btn.addEventListener('click', function () {
        window.location.reload();
    });
});


/* -------------------------------------------------------
   MOSTRAR / ESCONDER SENHA (olho)
------------------------------------------------------- */
botaoVerSenha.addEventListener('click', function () {
    var visivel = campSenha.type === 'text';
    campSenha.type = visivel ? 'password' : 'text';
    iconeOlhoAberto.style.display = visivel ? 'block' : 'none';
    iconeOlhoFechado.style.display = visivel ? 'none' : 'block';
});

function configurarVerSenha(botao, campo) {
    botao.addEventListener('click', function () {
        campo.type = campo.type === 'text' ? 'password' : 'text';
    });
}

configurarVerSenha(botaoVerNovaSenha, campNovaSenha);
configurarVerSenha(botaoVerConfirmarSenha, campConfirmarSenha);


/* -------------------------------------------------------
   UTILITÁRIOS DE VALIDAÇÃO
------------------------------------------------------- */
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function limparErrosLogin() {
    erroEmail.textContent = '';
    erroSenha.textContent = '';
    erroLogin.textContent = '';
    campEmail.classList.remove('invalido');
    campSenha.classList.remove('invalido');
}

function limparErrosEsqueceu() {
    erroEmailRecuperacao.textContent = '';
    campEmailRecuperacao.classList.remove('invalido');
}

function limparErrosRedefinir() {
    erroRedefinir.textContent = '';
}

function definirCarregando(botao, carregando, textoOriginal) {
    botao.disabled = carregando;
    botao.textContent = carregando ? 'Aguarde...' : textoOriginal;
}


/* -------------------------------------------------------
   CHECKLIST DE REQUISITOS DA SENHA
   Atualiza em tempo real conforme o usuário digita.
------------------------------------------------------- */
function atualizarChecklist() {
    var nova = campNovaSenha.value;
    var confirmar = campConfirmarSenha.value;

    marcarRequisito(reqMinimo, nova.length >= 8);
    marcarRequisito(reqLetra, /[a-zA-Z]/.test(nova));
    marcarRequisito(reqNumero, /[0-9]/.test(nova));
    marcarRequisito(reqIguais, nova.length > 0 && nova === confirmar);
}

function marcarRequisito(elemento, atendido) {
    if (atendido) {
        elemento.classList.add('atendido');
        /* Troca o círculo vazio por um checkmark */
        elemento.querySelector('svg').innerHTML =
            '<circle cx="12" cy="12" r="10"/>' +
            '<polyline points="9 12 11 14 15 10"/>';
    } else {
        elemento.classList.remove('atendido');
        elemento.querySelector('svg').innerHTML =
            '<circle cx="12" cy="12" r="10"/>';
    }
}

campNovaSenha.addEventListener('input', atualizarChecklist);
campConfirmarSenha.addEventListener('input', atualizarChecklist);

function senhaValida() {
    var nova = campNovaSenha.value;
    return (
        nova.length >= 8 &&
        /[a-zA-Z]/.test(nova) &&
        /[0-9]/.test(nova) &&
        nova === campConfirmarSenha.value
    );
}


/* -------------------------------------------------------
   TELA 1 — LOGIN
   POST /auth/login → redireciona para index.html
------------------------------------------------------- */
botaoEntrar.addEventListener('click', async function () {
    limparErrosLogin();

    var email = campEmail.value.trim();
    var senha = campSenha.value;
    var valido = true;

    if (!email) {
        erroEmail.textContent = 'Informe seu e-mail.';
        campEmail.classList.add('invalido');
        valido = false;
    } else if (!validarEmail(email)) {
        erroEmail.textContent = 'E-mail inválido.';
        campEmail.classList.add('invalido');
        valido = false;
    }

    if (!senha) {
        erroSenha.textContent = 'Informe sua senha.';
        campSenha.classList.add('invalido');
        valido = false;
    }

    if (!valido) return;

    definirCarregando(botaoEntrar, true, 'Entrar');

    try {
        /*
           Adapte o endpoint conforme seu back-end.
           Esperado: POST /auth/login com { email, senha }
           Resposta esperada: { token, usuario } ou similar
        */
        const resposta = await window.API.post('/auth/login', { email, senha });

        /*
           Salva o token para uso nas próximas requisições.
           O ideal é que o api.js leia esse token automaticamente
           e adicione no header Authorization de cada requisição.
        */
        if (resposta && resposta.token) {
            localStorage.setItem('prote_token', resposta.token);
        }

        /* Redireciona para o dashboard */
        window.location.href = 'index.html';

    } catch (erro) {
        erroLogin.textContent = erro.message || 'E-mail ou senha incorretos.';
    } finally {
        definirCarregando(botaoEntrar, false, 'Entrar');
    }
});

/* Permite submeter com Enter nos campos */
[campEmail, campSenha].forEach(function (campo) {
    campo.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') botaoEntrar.click();
    });
});


/* -------------------------------------------------------
   TELA 2 — ESQUECEU A SENHA
   POST /auth/recuperar-senha → exibe mensagem de sucesso
------------------------------------------------------- */
botaoEnviarLink.addEventListener('click', async function () {
    limparErrosEsqueceu();

    var email = campEmailRecuperacao.value.trim();

    if (!email) {
        erroEmailRecuperacao.textContent = 'Informe seu e-mail.';
        campEmailRecuperacao.classList.add('invalido');
        return;
    }

    if (!validarEmail(email)) {
        erroEmailRecuperacao.textContent = 'E-mail inválido.';
        campEmailRecuperacao.classList.add('invalido');
        return;
    }

    definirCarregando(botaoEnviarLink, true, 'Enviar link de recuperação');

    try {
        /*
           Adapte o endpoint conforme seu back-end.
           Esperado: POST /auth/recuperar-senha com { email }
        */
        await window.API.post('/auth/recuperar-senha', { email });

        alert('Link enviado! Verifique sua caixa de entrada.');

    } catch (erro) {
        erroEmailRecuperacao.textContent = erro.message || 'Não foi possível enviar o link. Tente novamente.';
    } finally {
        definirCarregando(botaoEnviarLink, false, 'Enviar link de recuperação');
    }
});

campEmailRecuperacao.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') botaoEnviarLink.click();
});


/* -------------------------------------------------------
   TELA 3 — REDEFINIR SENHA
   POST /auth/redefinir-senha → redireciona para login

   O token normalmente vem via query string na URL:
   ex: login.html?token=abc123
   Lemos ele aqui e enviamos junto com a nova senha.
------------------------------------------------------- */
function obterTokenDaURL() {
    return new URLSearchParams(window.location.search).get('token') || '';
}

botaoSalvarSenha.addEventListener('click', async function () {
    limparErrosRedefinir();

    if (!senhaValida()) {
        erroRedefinir.textContent = 'Verifique os requisitos da senha antes de continuar.';
        return;
    }

    var token = obterTokenDaURL();

    if (!token) {
        erroRedefinir.textContent = 'Link inválido ou expirado. Solicite um novo link.';
        return;
    }

    definirCarregando(botaoSalvarSenha, true, 'Salvar nova senha');

    try {
        /*
           Adapte o endpoint conforme seu back-end.
           Esperado: POST /auth/redefinir-senha com { token, novaSenha }
        */
        await window.API.post('/auth/redefinir-senha', {
            token,
            novaSenha: campNovaSenha.value
        });

        alert('Senha redefinida com sucesso! Faça login com sua nova senha.');
        mostrarTela(telaLogin);

    } catch (erro) {
        erroRedefinir.textContent = erro.message || 'Não foi possível redefinir a senha. Tente novamente.';
    } finally {
        definirCarregando(botaoSalvarSenha, false, 'Salvar nova senha');
    }
});


/* -------------------------------------------------------
   INICIALIZAÇÃO
   Se a URL tiver ?token=..., vai direto para a tela
   de redefinição de senha (fluxo do link por e-mail).
------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', function () {
    if (obterTokenDaURL()) {
        mostrarTela(telaRedefinirSenha);
    }
});