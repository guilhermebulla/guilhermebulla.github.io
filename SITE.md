# SITE.md — Contexto técnico para IA (BullaAcoustic)

Site: https://guilhermebulla.github.io (GitHub Pages; raiz do repo = site).
Este arquivo descreve o estado atual. O histórico de commits fica no git log.
Último SHA conferido: [preencher com o SHA do commit que alinhou mesa.html a app.css?v=6].
Antes de qualquer edição: confirmar o HEAD pela API de commits e ler os arquivos pinados no SHA. A listagem da API pode vir defasada; SHA citado pelo dono prevalece.

## 1. Identidade visual
- Tema escuro. Tokens em base.css: --bg #0f0f0f · --bg-elevated #171717 · --bg-card #1a1a1a · --border #2a2a2a · --text #f5f5f5 · --text-muted #a3a3a3.
- Dourado de ação: --gold #d4a853 · --gold-hover #b88d3e · --gold-soft rgba(212,168,83,.12).
- Fontes: Inter (corpo) e Playfair Display (títulos e logo).
- Estética: "essencial bem executado", sóbrio, premium, sem emojis em rótulos.
- base.css traz globais agressivos (header fixo, section 96px, footer #0a0a0a, .container 1200px). As páginas de app (pedidos, mesa) neutralizam isso no app.css.
- Canal: https://youtube.com/MrGuilhermeBulla (formato /user/ não usar).
- Favicon: SVG embutido (data URI) em todas as páginas.

## 2. Arquitetura
- index.html + index.css + script.js (módulos init*).
- repertorio.html + repertorio.css + repertorio.js, consumindo repertorio.json.
- conecte-se.html + conecte-se.css. Tokens locais (unificação com base.css é fase futura).
- repertorio.json: FONTE ÚNICA do repertório (~1.329 músicas; campos musica, artista, estilo[], idioma, ano). Não usar json-setlist.txt (obsoleto).
- Imagens: hero-bg.webp (index); og-image.jpg (Open Graph/Twitter, usado em index e conecte-se).
- Editor de repertório: repo PRIVADO guilhermebulla/editor-repertorio. Grava repertorio.json no site e no repo karaoke. Não buscar o arquivo dele na árvore do site.

### 2.1 App Pedidos ao vivo
- Fluxo: QR → pedidos.html (convidado pede, sem login) → Firestore (projeto bulla-pedidos, southamerica-east1) → mesa.html (painel do músico, login Firebase Auth e-mail/senha).
- Coleção pedidos: songId, title, artist, requester, requesterKey, status (fila | tocada | pulada), createdAt, finishedAt, ordem (int opcional, gravado em lote quando o músico reordena).
- app.css é compartilhado por pedidos.html e mesa.html, após base.css. Tokens locais --warn e --danger (exceção de hex). O footer é neutralizado com !important (ver pendência 1).
- Cache: cada HTML carrega app.css?v=N. Ao alterar app.css, incrementar N nos dois HTMLs.

#### Estado do cache
- pedidos.html: app.css?v=6
- mesa.html: app.css?v=6

## 3. Estado atual (no ar)

### 3.1 Chave de API ("Browser key (auto created by Firebase)", projeto bulla-pedidos)
- Application restrictions: Websites (HTTP referrers) com https://guilhermebulla.github.io/*. localhost removido.
- API restrictions: Restrict key, com 4 APIs: Identity Toolkit, Cloud Firestore, Token Service, Firebase Installations.
- pedidos.html e mesa.html usam a mesma apiKey.
- REGRA: nunca transcrever chave de API a partir de print ou OCR. Conferir sempre por Ctrl+F com o texto copiado do console.

### 3.2 Autenticação e Firestore
- Firebase Auth com provedor ÚNICO e-mail/senha. Google, GitHub, Anônimo e link de e-mail: desativados por decisão.
- Usuário do músico criado no console. Senha só no console; nunca enviar senha a ninguém nem ao chat.
- UID do músico: constante UID_MUSICO em mesa.html. Não é segredo; a proteção real está nas Rules.
- Persistência: sessionStorage do Firebase (SESSION). Login vale só na aba.
- Login com UID diferente: mostra "Conta sem permissão." e desloga.
- Domínios autorizados do Firebase Auth: localhost, bulla-pedidos.firebaseapp.com, bulla-pedidos.web.app, guilhermebulla.github.io. Esta lista é separada da restrição de referenciador da chave.
- Rules publicadas (26/11/2026), coleção pedidos:
  - read: if true (fila pública).
  - create: exige exatamente os 7 campos (songId, title, artist, requester, requesterKey, status, createdAt), com tipos e limites: status == 'fila'; title até 100; artist até 80; requester e requesterKey até 40; songId int >= 0; createdAt timestamp.
  - update, delete: if request.auth != null && request.auth.uid == UID_MUSICO.
- Teste negativo validado no Rules Playground: update sem autenticação é negado.
- Documento config/pin apagado do Firestore (26/11/2026). O login do músico não depende dele.

### 3.3 mesa.html
- Login: e-mail e senha (#email, #senha) → signInWithEmailAndPassword.
- Erros: "E-mail ou senha incorretos." para credenciais; "Muitas tentativas. Aguarde alguns minutos e tente de novo." para auth/too-many-requests. O código técnico aparece só no console (F12).
- Fila em tempo real (onSnapshot). Ordem manual vence; sem ordem, rodízio por requesterKey (menos atendidos primeiro; empate = chegada).
- Reordenação por ▲▼ à esquerda da posição. Cada movimento grava `ordem` para toda a fila, em batch.
- Card: posição, música, artista · solicitante, botões Tocada e Pular. Remover pela lixeira vermelha no canto, com confirm().
- Primeiro da fila destacado pela cor (sem rótulo).
- Histórico "Já rolaram" com horário. "Devolver à fila" nas puladas.

### 3.4 pedidos.html
- Nome salvo em localStorage (bullaNome). Campo com aria-label.
- Contador "Seus pedidos na fila: X de 3" (por nome digitado; âmbar ao atingir 3). Limite também checado em pedir().
- Busca: todos os termos precisam bater; máximo 20 resultados; resultados são <button> (focáveis por teclado); #resultado tem aria-live="polite".
- Estados da busca: "Nada encontrado", "Mais N resultado(s). Refine a busca.", repertório carregando, pede o nome antes de buscar.
- Fila pública: ordem manual > chegada. Pedido do próprio convidado destacado (.musica.eu, fundo dourado suave, borda dourada à esquerda) com a tag "É VOCÊ".
- Limite de 3 é por nome digitado, não por pessoa (não há login do convidado).

## 4. Decisões fechadas (não reabrir sem decisão explícita do dono)
- Sem drag & drop no toque. Reordenação só por ▲▼.
- Remover só pela lixeira, com confirmação.
- Primeiro da fila destacado pela cor, sem rótulo "Agora".
- Nome salvo no navegador; contador "X de 3" por nome digitado.
- Login do músico por Firebase Auth e-mail/senha. A proteção real está nas Rules.
- PIN antigo (config/pin) substituído pelo login e apagado. Não reabrir o PIN.
- Só provedor e-mail/senha. Não ativar Google, GitHub ou Anônimo sem decisão explícita.
- Mensagens de erro do login: curtas, sem código técnico na tela.
- Footer: o app aceita o footer do base.css (mudança visual aprovada pelo dono), e o !important do app.css será removido.

## 5. Pendências
1. Desacoplar app.css do base.css: remover o !important do footer, aceitando o footer do base.css. Antes do ANTES/DEPOIS, checar o impacto no base.css, que é compartilhado com o site principal. Incrementar ?v= nos dois HTMLs.
2. Opcional: folha de confirmação antes do pedido em pedidos.html.

## 6. Convenções de trabalho
- Ajustes: ANTES/DEPOIS com âncora exata. Alterar estritamente o solicitado.
- Erros: pedir o print ou a saída do F12 antes de propor correção.
- Leitura longa pode truncar: verificar se terminou (</html> ou última regra CSS).
- Quem faz os commits é o dono. A IA não tem escrita no repo.
- Toda alteração em app.css: incrementar ?v= em mesa.html e pedidos.html.
- Este arquivo é vivo: descreve o estado atual. Ao concluir uma pendência, ela sai da lista e o estado correspondente é atualizado.

## 7. Regras para IA
1. Ler base.css e app.css antes de propor qualquer estilo novo.
2. Nunca inventar hex ou fontes; usar as variáveis acima (exceção: --warn e --danger).
3. Alterar estritamente o solicitado.
4. Ler o arquivo real no repo antes de propor edição; pinar a leitura pelo SHA.
5. Marcas de equipamentos só em Rider Técnico; itinerância em termos amplos; Twitch nunca medida por seguidores.
6. Editor de repertório mora no repo PRIVADO editor-repertorio.
7. Mapa do ecossistema (site, karaoke, editor): README de perfil em github.com/guilhermebulla/guilhermebulla. Este SITE.md é a fonte técnica do site.
8. Nunca transcrever chave de API, senha ou UID a partir de print ou OCR.
9. Não ativar provedores de login sem decisão explícita do dono.
