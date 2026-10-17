(function () {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registerServiceWorker = () => {
    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/" })
      .catch((error) => {
        console.warn("Falha ao registrar o service worker:", error);
      });
  };

  if (document.readyState === "complete") {
    registerServiceWorker();
    return;
  }

  window.addEventListener("load", registerServiceWorker);

  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    const button = document.getElementById("pwa-install-button");
    if (button) {
      button.hidden = false;
      button.addEventListener("click", async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        button.hidden = true;
      }, { once: true });
    }
  });
})();
