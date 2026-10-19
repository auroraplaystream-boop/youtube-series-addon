# YouTube Series PT-BR — Stremio + Luna

Servidor Node.js com addon de streams externos para Stremio e API JSON para Luna.

## Iniciar
1. Instale Node.js 20+ e execute `npm install`.
2. Crie uma chave **YouTube Data API v3** no Google Cloud e habilite a API.
3. Execute `YOUTUBE_API_KEY=SUA_CHAVE npm start` (Linux/macOS) ou defina a variável de ambiente no seu provedor de hospedagem.
4. Abra `http://localhost:7000/health` para testar.

## Stremio
Hospede o servidor em HTTPS público e instale `https://SEU-DOMINIO/manifest.json` no Stremio. O addon fornece **externalUrl** (abre YouTube), não URLs de mídia extraídas. Suporta IDs de episódio no formato `tt1234567:1:2`, consultando o nome da série no Cinemeta. Não adiciona catálogo próprio ao Stremio.

## Luna
`GET /api/luna/search?title=Nome%20da%20Serie&season=1&episode=2`

Resposta JSON com `results`, `url` e `embedUrl`. Use `embedUrl` apenas onde o player permitir iframe oficial do YouTube. Caso contrário, abra `url` externamente. O Luna deve passar os dados do episódio à API.

## Limitações
- Requer chave YouTube Data API v3 e consome cota; cada busca de `search.list` normalmente custa 100 unidades de quota.
- A classificação é heurística: nem todo vídeo encontrado será um episódio completo, correto ou em PT-BR.
- Disponibilidade, incorporação, região e anúncios dependem do YouTube.
- Não contorna DRM, não baixa vídeos e não fornece links diretos de mídia.
- A busca atual é para séries; playlists e busca por canais oficiais ainda não foram implementadas.
- Cache em memória dura 10 minutos.
