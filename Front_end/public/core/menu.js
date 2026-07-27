export function initMenu() {
  const botaoMenu = document.getElementById('botaoMenu');
  const sidebar = document.getElementById('sidebar');
  const fundoEscuro = document.getElementById('fundoEscuro');

  if (!botaoMenu || !sidebar || !fundoEscuro) return;

  function abrirSidebar() {
    sidebar.classList.add('aberta');
    fundoEscuro.classList.add('visivel');
    botaoMenu.classList.add('aberto');
    botaoMenu.setAttribute('aria-label', 'Fechar menu');
  }

  function fecharSidebar() {
    sidebar.classList.remove('aberta');
    fundoEscuro.classList.remove('visivel');
    botaoMenu.classList.remove('aberto');
    botaoMenu.setAttribute('aria-label', 'Abrir menu');
  }

  botaoMenu.addEventListener('click', () => {
    sidebar.classList.contains('aberta') ? fecharSidebar() : abrirSidebar();
  });

  fundoEscuro.addEventListener('click', fecharSidebar);

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 700) fecharSidebar();
    });
});
}
///