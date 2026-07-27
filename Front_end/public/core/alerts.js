(function () {
  const classes = {
    popup: "prote-alert",
    title: "prote-alert-title",
    confirmButton: "prote-alert-button",
    cancelButton: "prote-alert-cancel-button"
  };

  function mostrarAlerta(tipo, titulo, mensagem, opcoes = {}) {
    return Swal.fire({
      icon: tipo,
      title: titulo,
      text: mensagem,
      confirmButtonText: opcoes.confirmButtonText || "OK",
      cancelButtonText: opcoes.cancelButtonText || "Cancelar",
      showCancelButton: Boolean(opcoes.showCancelButton),
      customClass: classes,
      buttonsStyling: false
    });
  }

  window.mostrarAlerta = mostrarAlerta;
  window.showSuccess = (message) => mostrarAlerta("success", "Sucesso!", message);
  window.showError = (message) => mostrarAlerta("error", "Erro!", message);
  window.showWarning = (message) => mostrarAlerta("warning", "Atenção!", message);
  window.showConfirm = (message, opcoes = {}) => mostrarAlerta("warning", opcoes.title || "Confirmar ação", message, {
    showCancelButton: true,
    confirmButtonText: opcoes.confirmButtonText || "Confirmar",
    cancelButtonText: opcoes.cancelButtonText || "Cancelar"
  });

  function obterEstadoFormulario(formulario) {
    const estado = {};
    const campos = formulario.querySelectorAll("input, select, textarea");

    campos.forEach((campo) => {
      const chave = campo.name || campo.id;
      if (!chave) return;

      if (campo.type === "checkbox" || campo.type === "radio") {
        estado[chave] = campo.checked;
        return;
      }

      if (campo.type === "file") {
        estado[chave] = Array.from(campo.files || []).map((arquivo) => `${arquivo.name}:${arquivo.size}:${arquivo.lastModified}`);
        return;
      }

      estado[chave] = campo.value;
    });

    return JSON.stringify(estado);
  }

  window.registrarEstadoInicialFormulario = (formulario) => {
    if (!formulario) return;
    formulario.dataset.estadoInicial = obterEstadoFormulario(formulario);
  };

  window.verificarAlteracoesFormulario = (formulario) => {
    if (!formulario) return false;
    return formulario.dataset.estadoInicial !== obterEstadoFormulario(formulario);
  };

  window.confirmarFechamento = async (formulario) => {
    if (!window.verificarAlteracoesFormulario(formulario)) return true;

    const resposta = await window.showConfirm(
      "Existem alterações não salvas.\n\nDeseja realmente fechar este formulário?\n\nTodas as informações digitadas serão perdidas.",
      {
        confirmButtonText: "Fechar mesmo assim",
        cancelButtonText: "Continuar editando"
      }
    );

    return resposta.isConfirmed;
  };

  window.fecharModalSeguro = async (formulario, fechar) => {
    const deveFechar = await window.confirmarFechamento(formulario);
    if (deveFechar) fechar();
    return deveFechar;
  };
})();
