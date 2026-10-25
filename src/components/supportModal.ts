export class SupportModal {
  private container: HTMLElement | null = null;

  constructor() {
    this.createDom();
  }

  private createDom() {
    let el = document.getElementById('engelmobile-support-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'engelmobile-support-modal';
      el.className = 'support-modal-backdrop hidden';
      document.body.appendChild(el);
    }
    this.container = el;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.container?.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  public open() {
    if (!this.container) return;
    this.container.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.render();
  }

  public close() {
    if (this.container) {
      this.container.classList.add('hidden');
      this.container.innerHTML = '';
    }
    document.body.style.overflow = '';
  }

  private render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="support-modal-card animate-scale-up">
        <button class="modal-close-floating" id="support-modal-close-btn" title="Fechar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="support-badge-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none"></circle>
          </svg>
        </div>

        <h2 class="support-brand-title">EngelMobile</h2>
        <p class="support-brand-subtitle">Sistemas e Apps personalizados</p>

        <div class="support-contact-box">
          <div class="support-phone-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span class="support-phone-number">(51) 99740-3703</span>
          </div>

          <a 
            href="https://wa.me/5551997403703?text=Ol%C3%A1%20EngelMobile%2C%20gostaria%20de%20um%20app%20ou%20sistema%20personalizado!" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="btn-support-whatsapp"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 16.71c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.09-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.17 1.73 2.64 4.2 3.7.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.23-.19-.48-.31z"/>
            </svg>
            <span>Conversar no WhatsApp</span>
          </a>
        </div>

        <div class="support-features-list">
          <div class="support-feature-pill">📱 Aplicativos Mobile (PWA, Android, iOS)</div>
          <div class="support-feature-pill">💻 Sistemas Web & Catálogos Personalizados</div>
          <div class="support-feature-pill">⚡ Alta Performance & Soluções Sob Medida</div>
        </div>

        <p class="support-footer-note">Desenvolvimento e consultoria direta com a equipe EngelMobile.</p>
      </div>
    `;

    this.container.querySelector('#support-modal-close-btn')?.addEventListener('click', () => this.close());
  }
}

export const supportModal = new SupportModal();
