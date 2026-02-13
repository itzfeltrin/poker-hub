import { Database } from "bun:sqlite";

const db = new Database("poker-hub.sqlite", { create: true });

// Jogadores: id (UUID), nome
db.run(`
  CREATE TABLE IF NOT EXISTS jogadores (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL
  )
`);

// Partidas: id, data, buy-in, chips por jogador, se já finalizou
db.run(`
  CREATE TABLE IF NOT EXISTS partidas (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    buy_in REAL NOT NULL,
    chips_por_jogador INTEGER NOT NULL,
    finalizada INTEGER NOT NULL DEFAULT 0
  )
`);

// Participação na partida: jogador + chips iniciais e finais
db.run(`
  CREATE TABLE IF NOT EXISTS partida_jogadores (
    partida_id TEXT NOT NULL,
    jogador_id TEXT NOT NULL,
    chips_iniciais INTEGER NOT NULL,
    chips_finais INTEGER,
    PRIMARY KEY (partida_id, jogador_id),
    FOREIGN KEY (partida_id) REFERENCES partidas(id),
    FOREIGN KEY (jogador_id) REFERENCES jogadores(id)
  )
`);

export { db };
