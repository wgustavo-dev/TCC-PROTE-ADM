/* =======================================================
   login.js
   Lógica exclusiva da tela de Login (login.html)

   Endpoint: POST /auth/login → { email, senha }
   Sucesso:  redireciona para index.html
   ======================================================= */

var campEmail = document.getElementById('campEmail');
var campSenha = document.getElementById('campSenha');
var erroEmail = document.getElementById('erroEmail');
var erroSenha = document.getElementById('erroSenha');
var erroLogin = document.getElementById('erroLogin');
var botaoEntrar = document.getElementById('botaoEntrar');
var botaoVerSenha = document.getElementById('botaoVerSenha');
var iconeOlhoAberto = document.getElementById('iconeOlhoAberto');
var iconeOlhoFechado = document.getElementById('iconeOlhoFechado');
var botaoFechar = document.getElementById('botaoFecharLogin');


/* -------------------------------------------------------
   FECHAR — recarrega a página
------------------------------------------------------- */
botaoFechar.addEventListener('click', function () {
    window.location.reload();
});


/* -------------------------------------------------------
   MOSTRAR / ESCONDER SENHA
------------------------------------------------------- */
botaoVerSenha.addEventListener('click', function () {
    var visivel = campSenha.type === 'text';
    campSenha.type = visivel ? 'password' : 'text';
    iconeOlhoAberto.style.display = visivel ? 'block' : 'none';
    iconeOlhoFechado.style.display = visivel ? 'none' : 'block';
});


/* -------------------------------------------------------
   VALIDAÇÃO
------------------------------------------------------- */
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function limparErros() {
    erroEmail.textContent = '';
    erroSenha.textContent = '';
    erroLogin.textContent = '';
    campEmail.classList.remove('invalido');
    campSenha.classList.remove('invalido');
}

function definirCarregando(carregando) {
    botaoEntrar.disabled = carregando;
    botaoEntrar.textContent = carregando ? 'Aguarde...' : 'Entrar';
}


/* -------------------------------------------------------
   LOGIN
   POST /auth/login → salva token → vai para index.html
------------------------------------------------------- */
botaoEntrar.addEventListener('click', async function () {
    limparErros();

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

    definirCarregando(true);

    try {
        var resposta = await window.API.post('/auth/login', { email, senha });

        /* Salva o token para as próximas requisições */
        if (resposta && resposta.token) {
            localStorage.setItem('prote_token', resposta.token);
        }

        window.location.replace('index.html');

    } catch (erro) {
        erroLogin.textContent = erro.message || 'E-mail ou senha incorretos.';
    } finally {
        definirCarregando(false);
    }
});

/* Enter nos campos dispara o login */
[campEmail, campSenha].forEach(function (campo) {
    campo.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') botaoEntrar.click();
    });
});