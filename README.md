# 🎬 CinePWA — Aplicativo de Filmes Autorizados e Domínio Público

Uma aplicação **PWA (Progressive Web App)** moderna, responsiva e de alta performance, desenvolvida em **HTML, CSS e TypeScript** com integração ao **Firebase** (Cloud Firestore + Authentication) e pronta para deploy contínuo via **GitHub + Netlify**.

O objetivo do CinePWA é oferecer um catálogo cultural 100% gratuito, sem anúncios e sem assinatura para o público brasileiro, reproduzindo filmes cuja exibição seja comprovadamente de domínio público ou devidamente autorizada por seus titulares legais.

---

## 🌟 Principais Recursos

### 1. Interface Pública Cinematográfica
- **Design Escuro Moderno**: Visual inspirado nos serviços líderes de streaming, com tipografia *Outfit* e *Inter*, efeito *glassmorphism* e acentos vibrantes.
- **Cards com Capas em Proporção Cinematográfica (2:3)**: Imagens em alta resolução, badges de gênero, selo de conformidade jurídica e ações rápidas no hover.
- **Banner em Destaque (Hero)**: Apresentação da principal obra em cartaz, com sinopse, ficha técnica e botão "Assistir Agora".
- **Busca em Tempo Real & Filtros de Categoria**: Pesquise instantaneamente por título, sinopse, ano ou gênero.
- **Modal de Detalhes Completo**: Apresenta sinopse detalhada, especificações técnicas e o **Quadro de Transparência e Licença**, com titular dos direitos, território e link do registro público.
- **Reprodutor de Vídeo Multiformato**: Suporte nativo a transmissões externas autorizadas via **Embed Iframe** (Internet Archive, YouTube, Vimeo), **MP4 direto** e **HLS (.m3u8)** com aceleração `hls.js`, tela cheia e tratamento amigável de indisponibilidade.
- **Minha Lista (Favoritos)**: Salve suas obras preferidas para assistir mais tarde (persistência local no navegador).

### 2. Progressive Web App (PWA)
- **Instalável no Celular e Computador**: Suporte ao evento nativo `beforeinstallprompt` com botão elegante de instalação.
- **Service Worker Inteligente**: Estratégia de cache do shell da aplicação para abertura instantânea e tela de fallback offline.
- **Proteção de Dados do Usuário**: Nenhum arquivo pesado de vídeo é forçado no cache offline do dispositivo do usuário.

### 3. Painel Administrativo com Governança Jurídica
- **Autenticação Segura**: Login via Firebase Auth (com modo de teste / demonstração offline integrado).
- **Tela 1 — Gerenciar Filmes**: Listagem completa com filtros por status (`draft`, `published`, `disabled`), busca interna, teste direto de reprodução, alteração de situação e exclusão.
- **Tela 2 — Cadastrar & Editar Filme**: Formulário completo de metadados com ferramenta de **Pré-visualização do Link** para validar o vídeo antes de salvar.
- **Tela 3 — Validação de Direitos & Licença**:
  - Cadastro de titular, tipo de licença, território, prazo de validade, comprovação documental e parecer da auditoria.
  - **Trava de Segurança Jurídica**: O sistema impede a publicação de obras cuja licença não esteja expressamente aprovada (`approved`). Filmes pendentes são salvos como Rascunho (`draft`).

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js (v18+) e npm instalados.

### Passos
```bash
# 1. Entre no diretório do projeto
cd cinepwa

# 2. Instale as dependências (já instaladas)
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

Abra a URL exibida no terminal (geralmente `http://localhost:5173`).

---

## 🔒 Como Configurar o Firebase Spark (Gratuito)

O CinePWA funciona imediatamente em **Modo Demonstração Offline** para que você teste todas as telas e o painel de imediato. Para conectá-lo ao Firebase na nuvem:

### 1. Criar o Projeto no Firebase
1. Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um novo projeto (ex: `cinepwa-brasil`).
2. Adicione um **Web App** (ícone `</>`) e copie as chaves de configuração.

### 2. Ativar o Firebase Authentication
1. No menu lateral, acesse **Authentication** > **Começar**.
2. Na aba **Sign-in method**, ative o provedor **E-mail/senha**.
3. Na aba **Users**, crie a conta de e-mail do seu administrador (ex: `admin@cinepwa.com` e sua senha forte). Copie o **User UID** gerado.

### 3. Ativar o Cloud Firestore
1. Acesse **Firestore Database** > **Criar banco de dados** (modo produção).
2. Na coleção `admins`, crie um documento cujo **ID do Documento seja exatamente o UID do seu administrador**:
   ```json
   {
     "email": "admin@cinepwa.com",
     "role": "admin",
     "active": true
   }
   ```
3. Na aba **Regras** (Rules) do Firestore, cole o conteúdo do arquivo `firestore.rules` fornecido no projeto e clique em **Publicar**.

### 4. Configurar as Variáveis de Ambiente
Crie um arquivo `.env` na raiz de `cinepwa` copiando o modelo `.env.example`:
```env
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:000000000000
```
Reinicie o servidor local (`npm run dev`). O CinePWA detectará automaticamente a conexão e sincronizará com o Firestore!

---

## 🌐 Publicação no GitHub + Netlify

1. **Subir para o GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: CinePWA release inicial"
   git remote add origin https://github.com/SEU-USUARIO/cinepwa.git
   git push -u origin main
   ```

2. **Conectar ao Netlify**:
   - Acesse o [Netlify](https://www.netlify.com/) e clique em **Add new site** > **Import an existing project** > **GitHub**.
   - Selecione o repositório `cinepwa`.
   - O arquivo `netlify.toml` já está configurado:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - Em **Site configuration** > **Environment variables**, adicione as mesmas variáveis do seu `.env` do Firebase.
   - Clique em **Deploy site**. O PWA estará disponível globalmente com HTTPS gratuito!

---

## ⚖️ Como Conseguir Filmes Legalmente

Para manter o CinePWA seguro e em total conformidade jurídica:

1. **Internet Archive ([archive.org/details/movies](https://archive.org/details/movies))**:
   - O CinePWA já vem pré-carregado com 5 obras em domínio público comprovadas (*A Noite dos Mortos-Vivos*, *Viagem à Lua*, *O Gabinete do Dr. Caligari*, *Metrópolis* e *O Imigrante*).
   - Ao buscar novos títulos, examine a ficha de licença e certifique-se de que a obra é de domínio público ou Creative Commons.
2. **Produtores Independentes Brasileiros**:
   - Negocie termos simples de exibição cultural não-comercial por escrito.
   - No painel administrativo, anexe o link do termo ou contrato no campo **Link para Comprovante / Registro de Licença**.
3. **Trava Ética**:
   - Nunca hospede listas IPTV, streams piratas ou contorne proteções DRM.
   - Use as fontes externas autorizadas, sem custos iniciais de servidores próprios de vídeo.
