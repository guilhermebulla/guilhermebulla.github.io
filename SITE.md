# SITE.md — Documento técnico vivo (BullaAcoustic)

Atualizado em 26/11/2026, com base em dab0f54.
Site: https://guilhermebulla.github.io (GitHub Pages; repo raiz = site).
Este arquivo descreve o estado atual. Histórico fica no git.
Se o código divergir daqui, o código vence e este arquivo deve ser corrigido.
Configurações do Firebase Console (Rules, restrições da chave) não estão no repo: são relatadas pelo dono e devem ser confirmadas no console.

## 1. Convenções de trabalho
- Antes de propor qualquer alteração: confirmar o HEAD pela API de commits, ler os arquivos pinados no SHA e declarar a base usada.
- A listagem da API pode vir defasada. SHA citado pelo dono prevalece, com declaração.
- Ajustes: ANTES/DEPOIS com âncora exata. Alterar só o solicitado.
- Erros: pedir print ou saída do F12 antes de propor correção.
- O dono faz os commits. A IA não tem escrita no repo.
- Chave de API, senha e UID: nunca transcrever de print ou OCR. Conferir por Ctrl+F com o texto copiado do console.
- Repo do editor de repertório (editor-repertorio) é privado. Não buscar arquivos dele na árvore do site.
- Ao fechar uma pendência, atualizar este arquivo no mesmo commit.

## 2. Identidade visual (definida em base.css; não reinventar)
- Tema escuro: --bg #0f0f0f · --bg-elevated #171717 · --bg-card #1a1a1a
- --border #2a2a2a · --text #f5f5f5 · --text-muted #a3a3a3
- Dourado de ação: --gold #d4a853 · --gold-hover #b88d3e · --gold-soft rgba(212,168,83,.12)
- Fontes: Inter (corpo) e Playfair Display (títulos e logo)
- Estética: essencial bem executado. Sóbrio, premium, sem emojis em rótulos.
- Botões: .btn-primary (dourado) e .btn-outline. Foco visível em dourado.
- Exceções de cor: --warn #F59E0B e --danger #DC2626, em app.css.
- URL canônica do canal: https://youtube.com/MrGuilhermeBulla (sem /user/).
- Favicon: SVG embutido (data URI) em todas as páginas.

## 3. Arquitetura de arquivos
- index.html + index.css + script.js (módulos init*).
- repertorio.html + repertorio.css + repertorio.js. Consome repertorio.json.
- conecte-se.html + conecte-se.css. Tokens locais (unificação com base.css é fase futura, após teste visual). O 1º botão aponta para pedidos.html.
- pedidos.html (convidado). Carrega base.css e app.css?v=6.
- mesa.html (músico). Carrega base.css e app.css?v=5.
- base.css: estilos compartilhados. Traz header fixo, section 96px, footer #0a0a0a e .container 1200px. Páginas de app neutralizam esses globais.
- app.css: estilos exclusivos de pedidos.html e mesa.html. Carregado após base.css.
- repertorio.json: fonte única do repertório (~1.329 músicas). Campos: musica, artista, estilo[], idioma, ano. json-setlist.txt é obsoleto e não deve ser usado.
- Assets: hero-bg.webp (1024x1024, usado no index); og-image.jpg (1200x630, og:image e twitter:image em index.html e conecte-se.html). Redes sociais podem manter cache do card por horas.

## 4. App Pedidos ao vivo

### 4.1 Fluxo
QR impresso → conecte-se.html (1º botão) → pedidos.html (convidado pede, sem login) → Firestore (projeto bulla-pedidos, southamerica-east1) → mesa.html (painel do músico, com login).

### 4.2 Coleção pedidos
- Campos gravados no create (7): songId, title, artist, requester, requesterKey, status, createdAt.
- status: fila | tocada | pulada.
- finishedAt: gravado ao marcar como tocada ou pulada.
- ordem (int, opcional): gravado em lote quando o músico reordena com ▲▼.
- requesterKey = nome digitado em minúsculas.

### 4.3 pedidos.html (convidado)
- Nome salvo em localStorage (chave bullaNome) e restaurado ao abrir. Campo com aria-label.
- Contador "Seus pedidos na fila: X de 3", que fica âmbar no limite. Calculado pelo nome digitado.
- Limite de 3 pedidos por nome: validado no navegador em pedir(), por leitura de requesterKey com status fila. A regra do Firestore valida formato e tamanho, não contagem.
- Busca: todos os termos precisam bater. Máximo de 20 resultados. Estados: pede o nome antes de buscar, "Repertório ainda carregando", "Nada encontrado" e "Mais N resultado(s). Refine a busca.". Resultados são botões focáveis. Região aria-live.
- Fila pública: ordem manual > chegada. Sem rodízio (ver divergência 5.1). "É VOCÊ" quando o nome confere. Destaque do próprio pedido (.musica.eu).
- Toast com aria-live para confirmação e erros.

### 4.4 mesa.html (músico)
- Login: e-mail e senha (signInWithEmailAndPassword), persistência SESSION (vale só na aba).
- Só entra a conta com UID igual à constante UID_MUSICO. Outra conta recebe "Conta sem permissão." e é deslogada.
- Erros: "E-mail ou senha incorretos." e, para auth/too-many-requests, mensagem própria de espera.
- Fila em tempo real (onSnapshot). Ordem: ordem manual > rodízio por requesterKey (quem foi atendido menos vai primeiro) > chegada.
- ▲▼ à esquerda da posição. Cada movimento grava ordem para todos os itens da fila, em batch. ▲ desativado no primeiro, ▼ no último.
- Primeiro da fila destacado pela cor, sem rótulo.
- Card: música, artista · solicitante; botões Tocada e Pular; lixeira vermelha no canto superior direito com confirm().
- Histórico "Já rolaram", com horário. Puladas têm "Devolver à fila" (min-height 48px).
- Título da seção: "Fila · N na fila".

### 4.5 Firebase
- Projeto: bulla-pedidos.
- Authentication: provedor único E-mail/senha. Anônimo, Google e GitHub desativados (decisão de 26/11).
- Usuário do músico criado no console. Senha só no console.
- Domínios autorizados: localhost, bulla-pedidos.firebaseapp.com, bulla-pedidos.web.app, guilhermebulla.github.io.
- Rules publicadas em 26/11 (relatado pelo dono; teste negativo validado):
  - read: true na coleção pedidos (fila pública).
  - create: exige os 7 campos, tipos e limites (title até 100, artist até 80, requester e requesterKey até 40) e status == 'fila'.
  - update e delete: só com auth.uid igual ao UID do músico.
- Documento config/pin: apagado (relatado pelo dono). O PIN foi substituído pelo login.
- Browser key (criada automaticamente pelo Firebase):
  - Restrição de aplicativo: sites, https://guilhermebulla.github.io/*. localhost removido em 26/11; propagação pendente de confirmação.
  - Restrição de API: 4 APIs (Identity Toolkit, Cloud Firestore, Token Service, Firebase Installations).
  - A chave fica nos dois HTMLs do app (pedidos.html e mesa.html). Conferir por Ctrl+F.
- UID do músico: constante no mesa.html. Não é segredo. A proteção real está nas Rules.

### 4.6 Cache (app.css)
- Estado atual: pedidos.html em app.css?v=6; mesa.html em app.css?v=5.
- Convenção: a definir (ver pendência 2 e divergência 5.2).

## 5. Divergências conhecidas (abertas)
1. Ordem da fila: mesa.html aplica rodízio quando não há ordem manual; pedidos.html não aplica. O convidado pode ver ordem diferente da mesa. Decisão pendente.
2. Convenção de cache: a regra anterior exigia incremento nos dois HTMLs a cada mudança de app.css. O estado atual trata cada HTML separadamente. Decisão pendente.
3. app.css usa !important no footer para neutralizar o footer do base.css. Base.css é compartilhado. Decisão pendente (pendência 1).
4. Restrição de localhost na Browser key: aguardando propagação. Verificar teste em pedidos e mesa após propagação.

## 6. Decisões fechadas (não reabrir sem decisão explícita do dono)
- Sem drag & drop. Reordenação por ▲▼. Remoção só pela lixeira, com confirmação.
- Sem folha de ações nem menu por item.
- Primeiro da fila destacado pela cor, sem rótulo "Agora".
- Limite de 3 pedidos por nome, validado no navegador.
- Fila pública mostra o nome de quem pediu. Sem emojis em rótulos.
- Login do músico por Firebase Auth e-mail/senha. PIN removido. A proteção real está nas Rules.
- Não ativar Google, GitHub nem login anônimo sem decisão explícita do dono.
- Repertório: sem gospel (laicidade profissional). Marcas de equipamento só no Rider Técnico (regra de conteúdo, não de código).

## 7. Pendências
1. Desacoplar app.css do base.css: remover !important do footer. Opções: (a) aceitar o footer do base.css; (b) manter o visual com a cascata atual. Recomendação: (b). Checar impacto no base.css (compartilhado) antes de alterar.
2. Definir a convenção de cache de app.css (seção 4.6) e aplicar nos dois HTMLs.
3. Opcional: folha de confirmação antes do pedido em pedidos.html. Sem decisão.
4. Confirmar a propagação da restrição de localhost e testar pedidos e mesa no celular.
5. Definir a ordem da fila pública (divergência 1).
6. Atualizar este SITE.md ao fechar cada item acima.

## 8. Ecossistema (fora deste repo)
- Karaokê offline (repo karaoke): kit local próprio, sincronizado por repertorio.json. Não faz parte do site.
- Editor de repertório (repo privado editor-repertorio): grava repertorio.json no site e espelha no karaoke.
- Perfil e README-mestre: repo guilhermebulla/guilhermebulla.
