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

## Arquitetura
- index.html + index.css + script.js (7 módulos init*)
- repertorio.html + repertorio.css + repertorio.js — consome repertorio.json
- conecte-se.html — monolítico (HTML+CSS inline), sem base.css
- pedidos.html — app de pedidos ao vivo (Firebase Firestore), mesmo tema
- repertorio.json — FONTE ÚNICA de repertório (~1.329 músicas; campos: musica,
  artista, estilo[], idioma, ano). NÃO usar json-setlist.txt (obsoleto).

## Regras para IA
1. Ler base.css antes de propor qualquer estilo novo.
2. Nunca inventar hex/fontes — usar as variáveis acima.
3. Alterar ESTRITAMENTE o solicitado (regra do dono, 24/06/2026).
4. Ler o arquivo real no repo antes de propor edição; raw por branch pode vir
   defasado — pinar leitura pelo SHA do commit.
5. Marcas de equipamentos só em Rider Técnico; itinerância em termos amplos;
   Twitch nunca medida por seguidores.