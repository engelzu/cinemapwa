let deferredInstallPrompt: any = null;

export function registerPWA() {
  // Limpar caches do SW antigo se houver
  if ('caches' in window) {
    caches.keys().then(keys => {
      keys.forEach(k => {
        if (k !== 'cinepwa-v3') caches.delete(k);
      });
    });
  }

  // Registrar Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          registration.update();
          console.log('✅ Service Worker do CinePWA registrado com sucesso:', registration.scope);
        })
        .catch(error => {
          console.warn('⚠️ Falha ao registrar Service Worker:', error);
        });
    });
  }

  // Capturar evento de instalação do PWA
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir o banner automático padrão do navegador para usar o nosso botão estético
    e.preventDefault();
    deferredInstallPrompt = e;

    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.classList.remove('hidden');
      installBtn.onclick = async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('🎉 Usuário aceitou instalar o CinePWA!');
        }
        deferredInstallPrompt = null;
        installBtn.classList.add('hidden');
      };
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('📲 CinePWA instalado como aplicativo!');
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.classList.add('hidden');
    deferredInstallPrompt = null;
  });
}
