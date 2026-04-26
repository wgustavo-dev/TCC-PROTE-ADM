console.log('JS simples carregou');

/* ================================
   PEGAR ELEMENTOS
================================ */
const botao = document.getElementById('botaoNovoOrcamento');
const modal = document.getElementById('fundoModal');
const cancelar = document.getElementById('botaoCancelar');

/* ================================
   VERIFICAÇÃO
================================ */
console.log('botao:', botao);
console.log('modal:', modal);

/* ================================
   ABRIR MODAL
================================ */
if (botao) {
  botao.addEventListener('click', () => {
    console.log('clicou no botão');

    if (modal) {
      modal.classList.add('ativo');
    }
  });
}/* */

/* ================================
   FECHAR MODAL
================================ */
if (cancelar) {
  cancelar.addEventListener('click', () => {
    modal.classList.remove('ativo');
  });
}

/* ================================
   FECHAR CLICANDO FORA
================================ */
if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target.id === 'fundoModal') {
      modal.classList.remove('ativo');
    }
  });
}