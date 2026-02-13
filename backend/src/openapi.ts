export const openApiDoc = {
  openapi: "3.0.0",
  info: {
    title: "Poker Hub API",
    version: "1.0.0",
    description: "API para registrar jogadores, partidas e consultar histórico e lucros/perdas.",
  },
  paths: {
    "/": {
      get: {
        summary: "API info",
        description: "Lista endpoints disponíveis.",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    nome: { type: "string", example: "Poker Hub API" },
                    endpoints: {
                      type: "object",
                      properties: {
                        jogadores: { type: "string", example: "/jogadores" },
                        partidas: { type: "string", example: "/partidas" },
                        historico: { type: "string", example: "/historico" },
                        lucros_perdas: { type: "string", example: "/lucros-perdas" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/jogadores": {
      get: {
        summary: "Listar jogadores",
        responses: {
          "200": {
            description: "Lista de jogadores",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Jogador" },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Criar jogador",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nome"],
                properties: {
                  nome: { type: "string", description: "Nome do jogador" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Jogador criado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Jogador" },
              },
            },
          },
          "400": {
            description: "Nome obrigatório",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Erro" },
              },
            },
          },
        },
      },
    },
    "/jogadores/{id}": {
      get: {
        summary: "Obter jogador por ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Jogador",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Jogador" },
              },
            },
          },
          "404": {
            description: "Jogador não encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Erro" },
              },
            },
          },
        },
      },
    },
    "/partidas": {
      post: {
        summary: "Criar partida",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["buy_in", "chips_por_jogador", "jogador_ids"],
                properties: {
                  buy_in: { type: "number", description: "Valor do buy-in" },
                  chips_por_jogador: { type: "integer", description: "Fichas por jogador" },
                  jogador_ids: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                    description: "IDs dos jogadores",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Partida criada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Partida" },
              },
            },
          },
          "400": {
            description: "Dados inválidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Erro" },
              },
            },
          },
        },
      },
    },
    "/partidas/{id}": {
      get: {
        summary: "Obter partida por ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Partida com jogadores",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Partida" },
              },
            },
          },
          "404": {
            description: "Partida não encontrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Erro" },
              },
            },
          },
        },
      },
    },
    "/partidas/{id}/finalizar": {
      patch: {
        summary: "Finalizar partida",
        description: "Define chips finais por jogador e calcula valores.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["chips_finais"],
                properties: {
                  chips_finais: {
                    type: "object",
                    additionalProperties: { type: "number" },
                    description: "jogador_id -> quantidade de fichas finais",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Partida finalizada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Partida" },
              },
            },
          },
          "400": {
            description: "Partida já finalizada ou dados inválidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Erro" },
              },
            },
          },
          "404": {
            description: "Partida não encontrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Erro" },
              },
            },
          },
        },
      },
    },
    "/historico": {
      get: {
        summary: "Histórico de partidas",
        description: "Lista todas as partidas (mais recentes primeiro).",
        responses: {
          "200": {
            description: "Lista de partidas",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Partida" },
                },
              },
            },
          },
        },
      },
    },
    "/lucros-perdas": {
      get: {
        summary: "Lucros e perdas por jogador",
        description:
          "Retorna P&L no período. Use periodo=personalizado com data_inicio e data_fim (ISO) para intervalo customizado.",
        parameters: [
          {
            name: "periodo",
            in: "query",
            schema: {
              type: "string",
              enum: ["ultimos_7_dias", "ultimo_mes", "ultimo_ano", "todo_periodo", "personalizado"],
              default: "todo_periodo",
            },
          },
          {
            name: "data_inicio",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Obrigatório quando periodo=personalizado",
          },
          {
            name: "data_fim",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Obrigatório quando periodo=personalizado",
          },
        ],
        responses: {
          "200": {
            description: "P&L por jogador",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    periodo: { type: "string" },
                    data_inicio: { type: "string", format: "date-time", nullable: true },
                    data_fim: { type: "string", format: "date-time", nullable: true },
                    jogadores: {
                      type: "array",
                      items: { $ref: "#/components/schemas/LucroPerda" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Jogador: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          nome: { type: "string" },
        },
      },
      Partida: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          data: { type: "string", format: "date-time" },
          buy_in: { type: "number" },
          chips_por_jogador: { type: "integer" },
          finalizada: { type: "boolean" },
          jogadores: {
            type: "array",
            items: {
              type: "object",
              properties: {
                jogador_id: { type: "string", format: "uuid" },
                nome: { type: "string" },
                chips_iniciais: { type: "integer" },
                chips_finais: { type: "integer", nullable: true },
              },
            },
          },
        },
      },
      LucroPerda: {
        type: "object",
        properties: {
          jogador_id: { type: "string", format: "uuid" },
          nome: { type: "string" },
          total_entrada: { type: "number" },
          total_saida: { type: "number" },
          lucro_perda: { type: "number" },
        },
      },
      Erro: {
        type: "object",
        properties: {
          erro: { type: "string" },
        },
      },
    },
  },
} as const;
