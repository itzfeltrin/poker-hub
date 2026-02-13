# Poker Hub – API

API em português para registrar jogadores, partidas e consultar histórico e lucros/perdas.

## Como rodar

```bash
bun install
bun run dev
```

Servidor em `http://localhost:3000`.

## Endpoints

### Jogadores (`/jogadores`)

- **GET /jogadores** – Lista todos os jogadores
- **POST /jogadores** – Cria jogador  
  Body: `{ "nome": "Nome do Jogador" }`  
  Retorna o jogador com `id` (UUID) e `nome`
- **GET /jogadores/:id** – Retorna um jogador

### Partidas (`/partidas`)

- **POST /partidas** – Cria nova partida  
  Body: `{ "buy_in": 100, "chips_por_jogador": 1000, "jogador_ids": ["uuid1", "uuid2"] }`
- **GET /partidas/:id** – Retorna uma partida com jogadores e chips
- **PATCH /partidas/:id/finalizar** – Finaliza a partida com chips finais  
  Body: `{ "chips_finais": { "jogador_id": 1500, "outro_id": 500 } }`  
  O valor recebido por cada jogador é calculado proporcionalmente ao total de chips (pool = buy_in × número de jogadores).

### Histórico (`/historico`)

- **GET /historico** – Lista todas as partidas (mais recentes primeiro), com jogadores e chips iniciais/finais

### Lucros e perdas (`/lucros-perdas`)

- **GET /lucros-perdas** – P&L por jogador  
  Query: `periodo` = `ultimos_7_dias` | `ultimo_mes` | `ultimo_ano` | `todo_periodo` | `personalizado`  
  Para `personalizado`: `data_inicio` e `data_fim` em ISO (ex: `2025-01-01T00:00:00.000Z`).

Exemplo: `GET /lucros-perdas?periodo=ultimo_mes`

Resposta inclui por jogador: `total_entrada`, `total_saida`, `lucro_perda`.

## Persistência

SQLite em `poker-hub.sqlite` na pasta do backend (criado automaticamente). Tabelas: `players`, `games`, `game_players`. Se você tinha um banco antigo (tabelas em português), apague o arquivo `.sqlite` para começar do zero.
