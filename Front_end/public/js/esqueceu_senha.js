/* =======================================================
   esqueceu_senha.js
   Lógica exclusiva da tela de Esqueceu a Senha

   Endpoint: POST /auth/recuperar-senha → { email }
   Sucesso:  exibe alerta e volta para login.html
   ======================================================= */

var campEmailRecuperacao = document.getElementById('campEmailRecuperacao');
var erroEmailRecuperacao = document.getElementById('erroEmailRecuperacao');
var botaoEnviarLink = document.getElementById('botaoEnviarLink');
var botaoFechar = document.getElementById('botaoFechar');


/* -------------------------------------------------------
   FECHAR — volta para o login
------------------------------------------------------- */
botaoFechar.addEventListener('click', function () {
    window.location.href = 'login.html';
});


/* -------------------------------------------------------
   VALIDAÇÃO
------------------------------------------------------- */
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function limparErros() {
    erroEmailRecuperacao.textContent = '';
    campEmailRecuperacao.classList.remove('invalido');
}

function definirCarregando(carregando) {
    botaoEnviarLink.disabled = carregando;
    botaoEnviarLink.textContent = carregando ? 'Aguarde...' : 'Enviar link de recuperação';
}


/* -------------------------------------------------------
   ENVIAR LINK
   POST /auth/recuperar-senha → alerta → volta para login
------------------------------------------------------- */
botaoEnviarLink.addEventListener('click', async function () {
    limparErros();

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

    definirCarregando(true);

    try {
        await window.API.post('/auth/recuperar-senha', { email });

        showSuccess('Link enviado com sucesso');
        window.location.href = 'login.html';

    } catch (erro) {
        erroEmailRecuperacao.textContent = erro.message || 'Não foi possível enviar o link. Tente novamente.';
    } finally {
        definirCarregando(false);
    }
});

/* Enter no campo dispara o envio */
campEmailRecuperacao.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') botaoEnviarLink.click();
});