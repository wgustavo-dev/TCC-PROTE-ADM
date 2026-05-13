import { initMenu } from '../core/menu.js';

initMenu();

const modal = document.getElementById('modal');
const btnNovo = document.getElementById('btnNovo');
const cancelar = document.getElementById('cancelar');
const tituloModal = document.getElementById('tituloModal');
const nome = document.getElementById('nome');
const avatarModal = document.getElementById('avatarModal');

function openModal(edicao = false) {
  tituloModal.textContent = edicao ? 'Editar responsável' : 'Novo responsável';
  modal.classList.remove('hidden');
}

btnNovo?.addEventListener('click', () => openModal(false));
cancelar?.addEventListener('click', () => modal.classList.add('hidden'));
document.querySelectorAll('.editar').forEach((btn) => btn.addEventListener('click', () => openModal(true)));

nome?.addEventListener('input', () => {
  const partes = nome.value.trim().split(/\s+/).filter(Boolean);
  avatarModal.textContent = (partes[0]?.[0] || 'S') + (partes[1]?.[0] || 'N');
});
