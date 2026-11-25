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

### App Pedidos ao vivo (23/11/2026)
- Fluxo: QR → pedidos.html (convidado pede) → Firestore (projeto bulla-pedidos,
  southamerica-east1) → mesa.html (painel do músico, PIN validado contra
  config/pin; write bloqueado nas Rules).
- Coleção pedidos: songId, title, artist, requester, requesterKey,
  status (fila|tocada|pulada), createdAt, finishedAt, ordem (int opcional;
  gravado em lote via batch quando o músico reordena).
- app.css (compartilhado por pedidos.html e mesa.html, após base.css):
  tokens locais --warn #F59E0B e --danger #DC2626 (única exceção de hex),
  header .app-header (pill "Voz & Violão" + logo Bulla/Acoustic dourado +
  divisor gradiente), glow de fundo body::before, cards .musica/.pedido/.hist,
  .num (numeração circular da fila), .me-tag ("É VOCÊ"),
  .toast (mensagens flutuantes; classes .aviso/.erro), footer neutralizado
  contra o vazamento do base.css (!important pontual),
  drag & drop (.arrastando/.sobre/.dica-drag).
- mesa.html: fila em tempo real (onSnapshot). Ordenação: campo ordem manual
  vence; sem ordem, rodízio por requesterKey (menos atendidos primeiro;
  empate = chegada). Cards arrastáveis (drag & drop) — ao soltar, grava ordem
  em batch; o público vê a nova ordem ao vivo. Numeração 1,2,3... nos cards.
  Histórico "Já rolaram" com horário; botão "Devolver à fila" em puladas
  (update: status fila + finishedAt FieldValue.delete()).
- pedidos.html: máx. 3 pedidos ativos por requesterKey; confirmações via toast;
  fila pública ordena por ordem manual > chegada e mostra numeração igual à
  mesa (sem reproduzir o rodízio completo — limitação conhecida).
- Security Rules fase 2: create só com status=='fila'; read/update/delete
  abertos (dívida técnica anotada: blindagem real = Firebase Auth, fase futura).
- apiKey do Firebase não é segredo; segurança mora nas Rules.
- Decisões fechadas não se reabrir: PIN alfanumérico; mesa.html + histórico na
  mesma página; fila pública mostra nome de quem pediu; sem emojis em rótulos.

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