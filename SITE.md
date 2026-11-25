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

### App Pedidos ao vivo (atualizado 25/11/2026)
- Fluxo: QR → pedidos.html (convidado pede) → Firestore (projeto bulla-pedidos, southamerica-east1) → mesa.html (painel do músico, PIN validado contra config/pin; write bloqueado nas Rules).
- Coleção pedidos: songId, title, artist, requester, requesterKey, status (fila|tocada|pulada), createdAt, finishedAt, ordem (int opcional; gravado em lote quando o músico reordena com ▲▼).
- app.css (compartilhado por pedidos.html e mesa.html, após base.css): tokens locais --warn #F59E0B e --danger #DC2626 (exceção de hex); header .app-header; glow body::before; cards .musica/.pedido/.hist; .num; .me-tag; .toast; .contador-pedidos; .lixeira; footer neutralizado com !important pontual.
- CACHE: pedidos.html e mesa.html carregam app.css?v=N. Toda alteração em app.css exige incrementar N nos dois HTMLs.

#### mesa.html
- Fila em tempo real (onSnapshot). Ordem manual vence; sem ordem, rodízio por requesterKey (menos atendidos primeiro; empate = chegada).
- Reordenação só por ▲▼ à esquerda da posição. Drag & drop removido (não funciona no toque). Cada movimento grava `ordem` para todos os itens da fila, em batch.
- Card: posição, música, artista · solicitante, botões Tocada e Pular. Remover é uma lixeira vermelha pequena no canto superior direito, com confirm().
- Primeiro da fila destacado pela cor (sem rótulo "Agora"). Título da seção: "Fila · N na fila".
- Histórico "Já rolaram" com horário. "Devolver à fila" em puladas, com min-height 48px.
- PIN validado contra config/pin (sessionStorage).

#### pedidos.html
- Nome salvo em localStorage (chave bullaNome) e restaurado ao abrir. Campo com aria-label.
- Contador "Seus pedidos na fila: X de 3" (por nome digitado). Fica âmbar ao atingir 3. A checagem de envio continua em pedir().
- Busca: todos os termos precisam bater; máximo 20 resultados; "Nada encontrado" quando não há resultado; "Mais N resultado(s). Refine a busca." quando há extras; mensagem de repertório carregando; pede o nome antes de buscar.
- Fila pública: ordem manual > chegada; "É VOCÊ" quando o nome digitado confere.
- Limite de pedidos é por nome digitado, não por pessoa (sem Firebase Auth, fase futura).

#### Decisões fechadas (25/11/2026)
- Sem drag & drop no toque. Reordenação por ▲▼ sem menu nem folha de ações.
- Remover só pela lixeira, com confirmação.
- Destaque do primeiro da fila pela cor, sem rótulo.
- PIN alfanumérico; mesa.html e histórico na mesma página; fila pública mostra o nome de quem pediu; sem emojis em rótulos.

#### Commits relevantes
- 2fd31e8: ▲▼ à esquerda da posição; drag removido.
- 1f36aa3: nome salvo no navegador.
- 2a02e60: contador "X de 3".
- 331b852: app.css?v=4 em pedidos.html.
- c23a734: busca por palavras, estado vazio e aviso de extras.
- Mesa com app.css?v=3 e lixeira validados no celular (SHA a registrar).

#### Pendências do app (em ordem)
1. Acessibilidade: resultados da busca focáveis por teclado (hoje são divs com clique); <main> nas telas de app.
2. Destaque do próprio pedido na fila pública, no padrão do karaokê (fundo dourado suave, borda dourada à esquerda, nome em dourado).
3. Desacoplar app.css do base.css (remover os !important). Baixa urgência.
4. Opcional, após teste: folha de confirmação antes do pedido.

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
