var campNovaSenha = document.getElementById('campNovaSenha');
var campConfirmarSenha = document.getElementById('campConfirmarSenha');
var erroRedefinir = document.getElementById('erroRedefinir');
var botaoSalvarSenha = document.getElementById('botaoSalvarSenha');
var botaoVerNovaSenha = document.getElementById('botaoVerNovaSenha');
var botaoVerConfirmarSenha = document.getElementById('botaoVerConfirmarSenha');

var reqMinimo = document.getElementById('reqMinimo');
var reqLetra = document.getElementById('reqLetra');
var reqNumero = document.getElementById('reqNumero');
var reqIguais = document.getElementById('reqIguais');


/* =======================================================
   MOSTRAR / ESCONDER SENHA
======================================================= */

function configurarVerSenha(botao, campo) {
    if (!botao || !campo) return;

    botao.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (campo.type === 'password') {
            campo.type = 'text';
            botao.setAttribute('aria-label', 'Ocultar senha');
        } else {
            campo.type = 'password';
            botao.setAttribute('aria-label', 'Mostrar senha');
        }
    });
}

configurarVerSenha(botaoVerNovaSenha, campNovaSenha);
configurarVerSenha(botaoVerConfirmarSenha, campConfirmarSenha);


/* =======================================================
   CHECKLIST DA SENHA
======================================================= */

function marcarRequisito(elemento, atendido) {
    if (!elemento) return;

    var svg = elemento.querySelector('svg');

    elemento.classList.toggle('atendido', atendido);

    if (svg) {
        if (atendido) {
            svg.innerHTML =
                '<circle cx="12" cy="12" r="10"></circle>' +
                '<polyline points="7 12 10 15 17 8"></polyline>';
        } else {
            svg.innerHTML =
                '<circle cx="12" cy="12" r="10"></circle>';
        }
    }
}


function atualizarChecklist() {
    var nova = campNovaSenha.value;
    var confirmar = campConfirmarSenha.value;

    marcarRequisito(reqMinimo, nova.length >= 8);

    marcarRequisito(
        reqLetra,
        /[a-zA-Z]/.test(nova)
    );

    marcarRequisito(
        reqNumero,
        /[0-9]/.test(nova)
    );

    marcarRequisito(
        reqIguais,
        nova.length > 0 &&
        confirmar.length > 0 &&
        nova === confirmar
    );
}


if (campNovaSenha) {
    campNovaSenha.addEventListener('input', atualizarChecklist);
}

if (campConfirmarSenha) {
    campConfirmarSenha.addEventListener('input', atualizarChecklist);
}


/* =======================================================
   VALIDAR SENHA
======================================================= */

function senhaValida() {
    var nova = campNovaSenha.value;
    var confirmar = campConfirmarSenha.value;

    return (
        nova.length >= 8 &&
        /[a-zA-Z]/.test(nova) &&
        /[0-9]/.test(nova) &&
        nova === confirmar
    );
}


/* =======================================================
   PEGAR TOKEN DA URL
======================================================= */

function obterToken() {
    return new URLSearchParams(
        window.location.search
    ).get('token') || '';
}


/* =======================================================
   ESTADO DE CARREGAMENTO
======================================================= */

function definirCarregando(carregando) {
    botaoSalvarSenha.disabled = carregando;

    var texto = botaoSalvarSenha.querySelector('#textoBotaoSalvar');

    if (texto) {
        texto.textContent = carregando
            ? 'Aguarde...'
            : 'Salvar nova senha';
    }
}


/* =======================================================
   SALVAR NOVA SENHA
======================================================= */

if (botaoSalvarSenha) {

    botaoSalvarSenha.addEventListener(
        'click',
        async function () {

            erroRedefinir.textContent = '';

            if (!senhaValida()) {

                erroRedefinir.textContent =
                    'Verifique os requisitos da senha antes de continuar.';

                return;
            }


            var token = obterToken();

            if (!token) {

                erroRedefinir.textContent =
                    'Link inválido ou expirado. Solicite um novo link.';

                return;
            }


            definirCarregando(true);


            try {

                await window.API.post(
                    '/auth/redefinir_senha',
                    {
                        token: token,
                        novaSenha: campNovaSenha.value
                    }
                );


                await showSuccess(
                    'Senha redefinida com sucesso! Faça login com sua nova senha.'
                );


                window.location.href = 'login.html';


            } catch (erro) {

                console.error(
                    'Erro ao redefinir senha:',
                    erro
                );

                erroRedefinir.textContent =
                    erro.message ||
                    'Não foi possível redefinir a senha. Tente novamente.';


            } finally {

                definirCarregando(false);

            }

        }
    );

}


/* =======================================================
   INICIALIZAÇÃO
======================================================= */

window.addEventListener(
    'DOMContentLoaded',
    function () {

        atualizarChecklist();

        if (!obterToken()) {

            window.location.href =
                'esqueceu_senha.html';

        }

    }
);