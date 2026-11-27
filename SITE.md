# SITE.md: documento técnico vivo (BullaAcoustic)

Atualizado em 27/11/2026, com base em 623827 (11:17 UTC).
Site: https://guilhermebulla.github.io (GitHub Pages; repo raiz = site).
Este arquivo descreve o estado atual. Histórico fica no git.
Se o código divergir daqui, o código vence e este arquivo deve ser corrigido.
Configurações do Firebase Console (Rules publicadas, restrições da chave) não estão no repo: são relatadas pelo dono e devem ser confirmadas no console.

## 1. Convenções de trabalho
- Antes de qualquer alteração: confirmar o HEAD pelo endpoint do commit (commits/{sha}), ler os arquivos pinados nesse SHA e declarar a base usada.
- A listagem commits?sha=main pode vir defasada. SHA citado pelo dono prevalece, com declaração.
- Ajustes: ANTES/DEPOIS com âncora exata. Alterar só o solicitado.
- Erros: pedir print ou saída do F12 antes de propor correção.
- O dono faz os commits. A IA não tem escrita no repo.
- Chave de API, senha e UID: nunca transcrever de print. Conferir por Ctrl+F.
- Repo editor-repertorio é privado. Não buscar arquivos dele na árvore do site.
- Cache: cada app.css e fila.js alterado sobe de versão nas duas telas (pedidos.html e mesa.html) no mesmo commit.
- Ao fechar uma pendência, atualizar este arquivo no mesmo commit.

## 2. Identidade visual (definida em base.css; não reinventar)
- Tema escuro: --bg #0f0f0f · --bg-elevated #171717 · --bg-card #1a1a1a
- --border #2a2a2a · --text #f5f5f5 · --text-muted #a3a3a3
- Dourado de ação: --gold #d4a853 · --gold-hover #b88d3e · --gold-soft rgba(212,168,83,.12)
- Fontes: Inter (corpo) e Playfair Display (títulos e logo)
- Estética: essencial bem executado. Sóbrio, premium. Sem emojis em rótulos de conteúdo.
- Exceções de cor em app.css: --warn #F59E0B e --danger #DC2626.
- URL canônica do canal: https://youtube.com/MrGuilhermeBulla (sem /user/).
- Favicon: SVG embutido (data URI) em todas as páginas.

## 3. Arquitetura de arquivos
- index.html + index.css + script.js (módulos init*).
- repertorio.html + repertorio.css + repertorio.js. Consome repertorio.json.
- conecte-se.html + conecte-se.css. Tokens locais (unificação com base.css é fase futura, com teste visual). O 1º botão aponta para pedidos.html.
- pedidos.html (convidado): base.css, app.css?v=9, fila.js?v=3.
- mesa.html (músico): base.css, app.css?v=9, fila.js?v=3.
- base.css: estilos compartilhados (header, section, footer, container).
- app.css: estilos exclusivos de pedidos.html e mesa.html. Carregado após base.css. Rodapé sem !important: aceita a cascata.
- fila.js: ordenação única da fila (window.BullaFila.ordenarFila(todos, showAtual, apoios)). Usado pelas duas telas.
- repertorio.json: fonte única do repertório (~1.329 músicas). Campos: musica, artista, estilo[], idioma, ano. json-setlist.txt é obsoleto.
- Assets: hero-bg.webp (usado no index); og-image.jpg (og:image e twitter:image em index e conecte-se).

## 4. App Pedidos ao vivo

### 4.1 Fluxo
QR impresso → conecte-se.html (1º botão) → pedidos.html (convidado pede, sem login) → Firestore (projeto bulla-pedidos, southamerica-east1) → mesa.html (painel do músico, com login).

### 4.2 Coleção pedidos
- Campos no create (8): songId (int ≥ 0), title (1 a 100), artist (1 a 80), requester (1 a 40), requesterKey (1 a 40), status (= 'fila'), createdAt (timestamp), show (int ≥ 1).
- status: fila | tocada | pulada. finishedAt é gravado ao marcar tocada ou pulada.
- ordem (int, opcional): gravado em lote quando o músico reordena com ▲▼. Ao tocar ou pular um pedido, o campo é removido dos demais pendentes do show. O próprio pedido ainda guarda o valor (ver 5.5).
- requesterKey = nome normalizado (ver 4.4).
- Pedido devolvido à fila mantém os apoios que já tinha.

### 4.3 Subcoleção pedidos/{id}/apoios/{chave}
- Campos (4): requester, requesterKey, show, createdAt.
- O ID do documento é o nome normalizado. Um apoio por nome por pedido.
- Create só com pedido em status fila e mesmo show do pedido. Update negado. Delete só pelo músico. Leitura pública.

### 4.4 Normalização (função normalizar, pedidos.html)
NFD, remove diacríticos, minúsculas, "/" vira espaço, trim, espaços colapsados. Usada em: busca (título e artista), contador, "É VOCÊ", limite, duplicidade, requesterKey e ID do apoio.

### 4.5 pedidos.html (convidado)
- Nome salvo em localStorage (bullaNome).
- Com nome confirmado (Enter ou saída do campo): chip "Pedindo como: [nome] / Alterar" e busca liberada.
- Sem nome: campo visível e busca desabilitada. Alterar reabre o campo e bloqueia a busca até confirmar. Esvaziar e confirmar remove o nome salvo.
- Contador "Seus pedidos na fila: X de 3", do show atual. MAX_PEDIDOS_POR_PESSOA é declarada uma vez, no topo do script.
- Busca: todos os termos precisam bater; máximo de 20 resultados; ignora acento e caixa. Tolerância a erro de digitação: fora.
- Toque duplo: uma escolha por vez (flag pedindo).
- Ordem de checagem ao escolher música:
  1. Mesma música do mesmo nome no show: "Você já pediu esta música". Bloqueia, mesmo se já foi tocada ou pulada.
  2. Mesma música pendente de outra pessoa no show: vira apoio, com "Juntos somos mais! Seu pedido se juntou ao de [nome]!".
  3. Limite de 3 pendentes do show: aviso.
  4. Grava o pedido.
- Apoio (coração) na fila pública: exige nome preenchido. Repetir: "Você já apoiou esta música". Apoio não conta no limite.
- Fila pública: só show atual e status fila. Ordem: ordem manual > rodízio do show > apoios > chegada. "É VOCÊ" no pedido do próprio nome.
- Tocados e pulados ficam legíveis pela leitura pública da coleção (decisão de 26/11: manter).

### 4.6 mesa.html (músico)
- Login por e-mail e senha (Firebase Auth), sessão SESSION. Só o UID do músico entra.
- Fila em tempo real: show atual e status fila. Mesma ordem da fila pública.
- ▲▼ grava ordem em batch para os itens da fila.
- Tocada e Pular gravam status e finishedAt, em batch, e removem ordem dos demais pendentes do show.
- Lixeira com confirmação.
- Card: título; artista · solicitante · ♥ apoios. Botões Tocada e Pular.
- Já rolaram: tocadas e puladas do show atual. Puladas têm "Devolver à fila" (ver 5.5).
- Iniciar novo show: confirmação ("Os pedidos pendentes serão encerrados..."). Grava show/atual com numero + 1.

### 4.7 Firebase
- Projeto: bulla-pedidos.
- Authentication: só E-mail/senha. Anônimo, Google e GitHub desativados.
- Rules: texto versionado em "Rules do Firestore.md" (commit a84ecaf). Console deve ser idêntico. Relatado pelo dono; não verificado pela IA.
  - pedidos: leitura pública; create com validação; update e delete só pelo músico.
  - pedidos/{id}/apoios: leitura pública; create com validação e pedido em fila do mesmo show; update negado; delete só pelo músico.
  - show/{doc}: leitura pública; escrita só pelo músico.
- Browser key: restrição de aplicativo sites guilhermebulla.github.io/*. localhost removido em 26/11; propagação a confirmar. Restrição de API: 4 APIs. A chave fica nos dois HTMLs; conferir por Ctrl+F.
- Domínios autorizados: localhost, bulla-pedidos.firebaseapp.com, bulla-pedidos.web.app, guilhermebulla.github.io.
- Limite de 3 e duplicidade são validados só no navegador. As Rules não contam pedidos nem comparam músicas. Aceito para uso social; não tratar como proteção real.

## 5. Divergências e pontos abertos
1. Pedidos pendentes criados antes da normalização com acento (chave "joão") não entram na contagem de quem digita "joao". Mitigação: encerrar o show em andamento ou ajustar pelo console.
2. Nome que normaliza para "." ou ".." gera ID de apoio inválido; a ação mostra "Falha ao apoiar". Caso raro, não tratado.
3. Código sem efeito: ramo "Digite seu nome acima" na busca. Não é alcançado com a busca desabilitada. Remover é opcional.
4. Leitura pública de pedidos expõe tocados e pulados com o nome de quem pediu. Decisão mantida; reabrir só por decisão do dono.
5. "Devolver à fila" reaproveita ordem antiga: a pulada conserva o campo ordem e volta ao topo da fila. Correção proposta, pendente de aplicação.
6. Fila pública e mesa leem a coleção inteira, de todos os shows. Filtro por show e status é proposta pendente de aplicação.
7. Restrição de localhost na Browser key: confirmar propagação e testar pedidos e mesa.

## 6. Decisões fechadas (não reabrir sem decisão explícita do dono)
- Sem drag & drop. Reordenação por ▲▼. Remoção só pela lixeira, com confirmação.
- Sem confirmação antes do pedido.
- Rodízio por show. Fila encerra entre shows.
- Duplicidade: mesma música (título e artista normalizados), mesmo nome, mesmo show, bloqueada mesmo após tocada ou pulada.
- Apoio: só em pedidos pendentes. Um por nome normalizado por pedido por show. Não conta no limite. Visível na mesa e na fila pública. Desempata só dentro do mesmo nível de rodízio.
- Ordem manual (▲▼) vale dentro do ciclo atual. Ao concluir um pedido (tocada ou pulada), a ordem manual dos demais pendentes é zerada e o rodízio volta a valer (decisão de 27/11, opção b).
- Limite de 3 pendentes por nome, por show, validado no navegador.
- Busca e nome ignoram acento e caixa. Tolerância a erro de digitação: fora.
- Chip "Pedindo como": camada de atrito, não barreira.
- Login do músico por e-mail e senha. Sem Google, GitHub ou login anônimo.
- Repertório: sem gospel (laicidade profissional). Marcas de equipamento só no Rider Técnico.

## 7. Pendências técnicas
1. Acessibilidade: busca navegável por teclado e resultados lidos pelo leitor de tela. Revisar uso de <main> em pedidos.html.
2. Aplicar correção de "Devolver à fila" (5.5).
3. Aplicar filtro por show e status na fila pública e na mesa (5.6).
4. Testes do apoio ainda não relatados: rodízio com apoios e Rule negando apoio em pedido tocado.
5. Confirmar propagação da restrição de localhost na Browser key.
6. Limpeza de código: ramo morto da busca (5.3); normalizar, esc e configuração do Firebase duplicados entre as telas; variável chaveApoio é igual a meuNome em pedidos.html.

## 8. Limites de leitura (ferramenta de leitura por URL)
Medido em 26/11/2026, SHA 506e8c1. Hipótese, não garantia: a leitura por URL corta arquivos a partir de ~12 KB.

Truncam na leitura por URL (pedir o .txt completo antes de propor ANTES/DEPOIS):
- repertorio.js (48 KB)
- index.html (31 KB)
- repertorio.css (21 KB)
- index.css (21 KB)
- repertorio.html (14 KB)
- pedidos.html (13 KB)
- script.js (13 KB)
- repertorio.json (209 KB, não testado por URL; presumido truncado; só relevante se o repertório for editado)

Lidos inteiros por URL (não precisam de .txt): app.css, base.css, conecte-se.css, conecte-se.html, mesa.html, fila.js, SITE.md, Rules do Firestore.md.

Regra de uso: arquivo em .txt enviado pelo dono é a fonte preferencial. Não consultar a API para conferir SHA de .txt, salvo pedido explícito.
