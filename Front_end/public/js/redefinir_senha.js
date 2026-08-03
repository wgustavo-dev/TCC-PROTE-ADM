/* =======================================================
   redefinir_senha.js
   Lógica exclusiva da tela de Redefinir Senha

   O token vem via query string na URL:
   redefinir_senha.html?token=abc123

   Fml, para TESTAR sem back-end, tem q abrir:
   redefinir_senha.html?token=teste123

   Endpoint: POST /auth/redefinir_senha → { token, novaSenha }
   Sucesso:  redireciona para login.html
   ======================================================= */

var campNovaSenha = document.getElementById('campNovaSenha');
var campConfirmarSenha = document.getElementById('campConfirmarSenha');
var erroRedefinir = document.getElementById('erroRedefinir');
var botaoSalvarSenha = document.getElementById('botaoSalvarSenha');
var botaoVerNovaSenha = document.getElementById('botaoVerNovaSenha');
var botaoVerConfirmarSenha = document.getElementById('botaoVerConfirmarSenha');
var botaoFechar = document.getElementById('botaoFechar');
var reqMinimo = document.getElementById('reqMinimo');
var reqLetra = document.getElementById('reqLetra');
var reqNumero = document.getElementById('reqNumero');
var reqIguais = document.getElementById('reqIguais');


/* -------------------------------------------------------
   FECHAR — volta para o login
------------------------------------------------------- */
botaoFechar.addEventListener('click', function () {
    window.location.href = 'login.html';
});


/* -------------------------------------------------------
   MOSTRAR / ESCONDER SENHA
------------------------------------------------------- */
function configurarVerSenha(botao, campo) {
    botao.addEventListener('click', function () {
        campo.type = campo.type === 'text' ? 'password' : 'text';
    });
}

configurarVerSenha(botaoVerNovaSenha, campNovaSenha);
configurarVerSenha(botaoVerConfirmarSenha, campConfirmarSenha);


/* -------------------------------------------------------
   CHECKLIST DE REQUISITOS DA SENHA
   Atualiza em tempo real enquanto o usuário digita.
------------------------------------------------------- */
function marcarRequisito(elemento, atendido) {
    if (atendido) {
        elemento.classList.add('atendido');
        elemento.querySelector('svg').innerHTML =
            '<circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>';
    } else {
        elemento.classList.remove('atendido');
        elemento.querySelector('svg').innerHTML =
            '<circle cx="12" cy="12" r="10"/>';
    }
}

function atualizarChecklist() {
    var nova = campNovaSenha.value;
    var confirmar = campConfirmarSenha.value;

    marcarRequisito(reqMinimo, nova.length >= 8);
    marcarRequisito(reqLetra, /[a-zA-Z]/.test(nova));
    marcarRequisito(reqNumero, /[0-9]/.test(nova));
    marcarRequisito(reqIguais, nova.length > 0 && nova === confirmar);
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
   TOKEN DA URL
   Lê o ?token=... da query string.
   Para testar: redefinir_senha.html?token=teste123
------------------------------------------------------- */
function obterToken() {
    return new URLSearchParams(window.location.search).get('token') || '';
}


/* -------------------------------------------------------
   VALIDAÇÃO
------------------------------------------------------- */
function definirCarregando(carregando) {
    botaoSalvarSenha.disabled = carregando;
    botaoSalvarSenha.textContent = carregando ? 'Aguarde...' : 'Salvar nova senha';
}


/* -------------------------------------------------------
   SALVAR NOVA SENHA
   POST /auth/redefinir_senha → redireciona para login.html
------------------------------------------------------- */
botaoSalvarSenha.addEventListener('click', async function () {
    erroRedefinir.textContent = '';

    if (!senhaValida()) {
        erroRedefinir.textContent = 'Verifique os requisitos da senha antes de continuar.';
        return;
    }

    var token = obterToken();

    if (!token) {
        erroRedefinir.textContent = 'Link inválido ou expirado. Solicite um novo link.';
        return;
    }

    definirCarregando(true);

    try {
        await window.API.post('/auth/redefinir_senha', {
            token,
            novaSenha: campNovaSenha.value
        });

        await showSuccess('Senha redefinida com sucesso! Faça login com sua nova senha.');
        window.location.href = 'login.html';

    } catch (erro) {
        erroRedefinir.textContent = erro.message || 'Não foi possível redefinir a senha. Tente novamente.';
    } finally {
        definirCarregando(false);
    }
});


/* -------------------------------------------------------
   INICIALIZAÇÃO
   Verifica se tem token na URL. Se não tiver, redireciona
   para esqueceu_senha.html (link inválido ou expirado).
------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', function () {
    if (!obterToken()) {
        /* Sem token = acesso inválido — manda para esqueceu a senha */
        window.location.href = 'esqueceu_senha.html';
    }
});