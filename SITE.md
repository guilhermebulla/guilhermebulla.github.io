# SITE.md — Contexto técnico para IA (BullaAcoustic)

Site publicado: https://guilhermebulla.github.io (GitHub Pages, repo raiz = site).

## Identidade visual (OBRIGATÓRIA — definida em base.css, não reinventar)
- Tema escuro: --bg #0f0f0f · --bg-elevated #171717 · --bg-card #1a1a1a
- --border #2a2a2a · --text #f5f5f5 · --text-muted #a3a3a3
- Dourado único de ação: --gold #d4a853 · --gold-hover #b88d3e · --gold-soft rgba(212,168,83,.12)
- Fontes: Inter (corpo) + Playfair Display (títulos, logo)
- Estética: "essencial bem executado" — sóbrio, premium, sem emojis em rótulos
- Botões: .btn-primary (dourado), .btn-outline; focus-visible outline dourado
- Sempre usar base.css via <link>; estilos específicos em <arquivo>.css separado
- ATENÇÃO: base.css traz globais agressivos (header fixo c/ nav, section 96px,
  footer estilizado #0a0a0a, .container 1200px). Páginas sem esse layout
  (conecte-se, app pedidos/mesa) neutralizam ou evitam o import — ver app.css
  footer !important e conecte-se.css tokens locais. Exceção documentada.
- URL canônica do canal: https://youtube.com/MrGuilhermeBulla (sem /user/).
  Formato /user/ é artefato de sessão logada — não usar. Favicon em todas as
  páginas: SVG embutido (data URI), não favicon.ico.

## Arquitetura
- index.html + index.css + script.js (7 módulos init*)
- repertorio.html + repertorio.css + repertorio.js — consome repertorio.json
- conecte-se.html + conecte-se.css — CSS extraído do monolítico (25/11/2026),
  fidelidade visual preservada; tokens ainda locais (unificação com base.css
  é fase futura, após teste visual). Botão "Pedir música ao vivo" (1º da
  lista, âncora pedidos.html) como conveniência do QR impresso.
- repertorio.json — FONTE ÚNICA de repertório (~1.329 músicas; campos: musica,
  artista, estilo[], idioma, ano). NÃO usar json-setlist.txt (obsoleto).

### Assets de imagem (25/11/2026)
- hero-bg.webp (1024x1024, ~69 KB) — hero do index.html. PNG de 1,57 MB
  removido; compressão feita localmente pelo dono (qualidade <85;
  transparency/embed color profile não alteram o tamanho).
- og-image.jpg (1200x630, ~113 KB) — card Open Graph/Twitter; composição
  manual no Photoshop pelo dono (fundo oil paint, glow dourado no canto
  sup. direito, foto do músico mascarada com layer mask + feather no canto
  inf. esquerdo, wordmark Playfair Display). Substitui og-image.png (884 KB).
- FECHADO (25/11/2026, commit 5b16239 + ajuste og): index.html e
  conecte-se.html apontam og:image/twitter:image para og-image.jpg;
  og-image.png apagado do repo. Validar card final no WhatsApp ou
  opengraph.xyz (redes fazem cache; card velho pode persistir por horas).

### App Pedidos ao vivo (atualizado 26/11/2026)
- Fluxo: QR → pedidos.html (convidado pede, sem login) → Firestore (projeto
  bulla-pedidos, southamerica-east1) → mesa.html (painel do músico, login
  com Firebase Auth e-mail/senha).
- Coleção pedidos: songId, title, artist, requester, requesterKey, status (fila|tocada|pulada), createdAt, finishedAt, ordem (int opcional; gravado em lote quando o músico reordena com ▲▼).
- app.css (compartilhado por pedidos.html e mesa.html, após base.css): tokens locais --warn #F59E0B e --danger #DC2626 (exceção de hex); header .app-header; glow body::before; cards .musica/.pedido/.hist; .num; .me-tag; .toast; .contador-pedidos; .lixeira; footer neutralizado com !important pontual.
- CACHE: pedidos.html e mesa.html carregam app.css?v=N. Toda alteração em app.css exige incrementar N nos dois HTMLs. (Estado no commit 7ee0662: mesa.html em v=4; pedidos.html em v=5.)

#### Autenticação e Rules (atualizado 26/11/2026)
- Mecanismo: Firebase Auth, provedor ÚNICO E-mail/senha. Ativos desativados por decisão: Anônimo, Google, GitHub e demais. Link de e-mail (sem senha) desativado.
- Usuário do músico criado no console (Authentication > Usuários). Senha só no console; NÃO enviar senha a ninguém nem ao chat.
- UID do músico: constante UID_MUSICO no mesa.html. Não é segredo; a proteção real está nas Rules.
- Persistência: sessionStorage do Firebase (SESSION) — login vale só na aba.
- Login de conta com UID diferente: mostra "Conta sem permissão." e desloga.
- Domínios autorizados: localhost, bulla-pedidos.firebaseapp.com, bulla-pedidos.web.app, guilhermebulla.github.io (custom, adicionado 26/11/2026).
- Rules publicadas (26/11/2026), coleção pedidos:
  - read: if true (fila pública)
  - create: if request.resource.data.status == 'fila'
  - update, delete: if request.auth != null && request.auth.uid == UID_MUSICO
  - Coleção config (PIN antigo) fora das Rules.
- Risco aberto: create aceita campos e tamanhos arbitrários. Pendência de endurecimento (validar chaves e tamanho de title/artist/requester), após o show.

#### Chave de API (Browser key, auto created by Firebase)
- Identity Toolkit API ativada no projeto bulla-pedidos (confirmado pelo dono).
- Restrição de aplicativo: Nenhum (sem referenciador HTTP).
- Restrição de API: leituras divergentes entre prints ("Não restringir" e "Restringir", com 15 e 25 APIs). Confirmar na tela antes de qualquer alteração.
- REGRA: nunca transcrever a chave de API a partir de print ou OCR. Para conferir, copiar pelo botão do console e fazer Ctrl+F no arquivo do GitHub. Isso causou o erro auth/api-key-not-valid de 26/11/2026: chave com caracteres trocados em arquivo.
- Estado da mesa após a correção: o dono relatou acesso normalizado. Mesa e pedidos devem ser confirmados por Ctrl+F antes de considerar fechado.

#### mesa.html
- Login: e-mail e senha (campos #email e #senha) → signInWithEmailAndPassword. Mensagem de erro atual: "E-mail ou senha incorretos. [código]" (TEMPORÁRIA, para diagnóstico; voltar à mensagem curta depois do show ou após teste confirmado).
- PIN antigo (config/pin) SUBSTITUÍDO pelo login. Documento config/pin ainda deve ser apagado do Firestore (pendência).
- Fila em tempo real (onSnapshot). Ordem manual vence; sem ordem, rodízio por requesterKey (menos atendidos primeiro; empate = chegada).
- Reordenação só por ▲▼ à esquerda da posição. Drag & drop removido (não funciona no toque). Cada movimento grava `ordem` para todos os itens da fila, em batch.
- Card: posição, música, artista · solicitante, botões Tocada e Pular. Remover é uma lixeira vermelha pequena no canto superior direito, com confirm().
- Primeiro da fila destacado pela cor (sem rótulo "Agora"). Título da seção: "Fila · N na fila".
- Histórico "Já rolaram" com horário. "Devolver à fila" em puladas, com min-height 48px.

#### pedidos.html
- Nome salvo em localStorage (chave bullaNome) e restaurado ao abrir. Campo com aria-label.
- Contador "Seus pedidos na fila: X de 3" (por nome digitado). Fica âmbar ao atingir 3. A checagem de envio continua em pedir().
- Busca: todos os termos precisam bater; máximo 20 resultados; "Nada encontrado" quando não há resultado; "Mais N resultado(s). Refine a busca." quando há extras; mensagem de repertório carregando; pede o nome antes de buscar.
- Fila pública: ordem manual > chegada; "É VOCÊ" quando o nome digitado confere.
- Limite de pedidos é por nome digitado, não por pessoa (o convidado não tem login).

#### Decisões fechadas
- 25/11/2026: sem drag & drop no toque. Reordenação por ▲▼ sem menu nem folha de ações.
- 25/11/2026: remover só pela lixeira, com confirmação.
- 25/11/2026: destaque do primeiro da fila pela cor, sem rótulo.
- 25/11/2026: fila pública mostra o nome de quem pediu; sem emojis em rótulos.
- 25/11/2026 (SUBSTITUÍDA em 26/11/2026): PIN alfanumérico validado em config/pin. Substituído por login Firebase Auth e-mail/senha. Não reabrir o PIN.
- 26/11/2026: Google, GitHub e Anônimo não ativados. Só E-mail/senha. Não reabrir sem decisão explícita do dono.

#### Commits relevantes
- 2fd31e8: ▲▼ à esquerda da posição; drag removido.
- 1f36aa3: nome salvo no navegador.
- 2a02e60: contador "X de 3".
- 331b852: app.css?v=4 em pedidos.html.
- c23a734: busca por palavras, estado vazio e aviso de extras.
- c044268 (26/11/2026): mesa.html com login e-mail/senha no lugar do PIN; inclui firebase-auth-compat.
- 60bf054 (26/11/2026): mensagem de erro com código técnico (temporária).
- 7ee0662 (26/11/2026): troca a apiKey em pedidos.html (única alteração do commit, segundo a API).

#### Pendências do app (em ordem)
1. Confirmar login na mesa e ações de escrita (▲▼, Tocada, Pular, lixeira, Devolver) no celular. Se "permission-denied", revisar o UID nas Rules.
2. Confirmar por Ctrl+F que mesa.html e pedidos.html têm a mesma apiKey do console.
3. Restringir a Browser key (somente após o item 1): APIs Identity Toolkit, Cloud Firestore, Token Service e Firebase Installations; referenciador https://guilhermebulla.github.io/*. Testar antes de salvar.
4. Voltar a mensagem de erro do login à forma curta, sem o código técnico.
5. Apagar o documento config/pin no Firestore.
6. Teste negativo no Rules Playground: update em pedidos sem autenticação deve ser negado.
7. Tratar auth/too-many-requests com mensagem própria.
8. Endurecer a regra create (campos e tamanhos) após o show.
9. Acessibilidade: resultados da busca focáveis por teclado (hoje são divs com clique); <main> nas telas de app.
10. Destaque do próprio pedido na fila pública, no padrão do karaokê (fundo dourado suave, borda dourada à esquerda, nome em dourado).
11. Desacoplar app.css do base.css (remover os !important). Baixa urgência.
12. Opcional, após teste: folha de confirmação antes do pedido.
13. Atualizar este SITE.md ao fim da lista.

### Editor de repertório e sincronia dupla (ATUALIZADO 25/11/2026)
- Editor migrou para REPO PRIVADO guilhermebulla/editor-repertorio
  (25/11/2026; fechava as pendências e/f anteriores: "#" no nome e PAT
  em página pública). Ele edita o repertorio.json via API do GitHub e
  grava em DOIS repos: site (fonte única) e karaoke
  (guilhermebulla/karaoke/repertorio.json, SHA buscado na hora).
  Falha no karaoke não desfaz a gravação do site — toast de aviso.
- PAT classic escopo repo em localStorage, agora em página privada.
  Verificação pendente: nome do arquivo HTML do editor no repo privado
  e primeiro boot pós-migração (config ghConfig pode precisar de ajuste
  de repo/path/branch).
- Kit local (C:\karaoke): arquivo local só atualiza via
  sincroniza-repertorio.js (baixa JSON pinado pelo HEAD) + gera-letras.js.
- repertorio.json do site segue como FONTE ÚNICA; o do karaoke é cópia.

## Regras para IA
1. Ler base.css e app.css antes de propor qualquer estilo novo.
2. Nunca inventar hex/fontes — usar as variáveis acima (exceção: --warn/--danger).
3. Alterar ESTRITAMENTE o solicitado (regra do dono, 24/06/2026).
4. Ler o arquivo real no repo antes de propor edição; raw por branch pode vir
   defasado — pinar leitura pelo SHA do commit.
5. Marcas de equipamentos só em Rider Técnico; itinerância em termos amplos;
   Twitch nunca medida por seguidores.
6. Editor de repertório mora no repo PRIVADO editor-repertorio — não buscar
   arquivo dele na árvore do site.
7. Mapa do ecossistema (site + karaoke + editor): README de perfil em
   github.com/guilhermebulla/guilhermebulla — ponto de entrada para IAs e
   humanos; o SITE.md continua sendo a fonte técnica detalhada do site.
8. Toda alteração em app.css: incrementar ?v= em mesa.html e pedidos.html.
9. Antes de editar, confirmar o HEAD pela API de commits e ler o arquivo pinado no SHA. A listagem da API pode vir defasada: quando um SHA citado pelo dono não aparece nela, use o SHA citado e declare isso.
10. Nunca transcrever chave de API, senha ou UID a partir de print ou OCR. Conferir sempre por Ctrl+F com o texto copiado do console.
11. Não ativar provedores de login (Google, GitHub, Anônimo) sem decisão explícita do dono.
