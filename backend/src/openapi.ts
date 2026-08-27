export const openApiDoc = {
  openapi: "3.0.0",
  info: {
    title: "Poker Hub API",
    version: "1.0.0",
    description: "API to register players, games, and query history and profit/loss.",
  },
  paths: {
    "/": {
      get: {
        summary: "API info",
        description: "List available endpoints.",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "Poker Hub API" },
                    endpoints: {
                      type: "object",
                      properties: {
                        players: { type: "string", example: "/players" },
                        games: { type: "string", example: "/games" },
                        history: { type: "string", example: "/history" },
                        profit_loss: { type: "string", example: "/profit-loss" },
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
    "/players": {
      get: {
        summary: "List players",
        responses: {
          "200": {
            description: "List of players",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Player" },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create player",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", description: "Player name" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Player created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Player" },
              },
            },
          },
          "400": {
            description: "Name required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/players/{id}": {
      get: {
        summary: "Get player by ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Player",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Player" },
              },
            },
          },
          "404": {
            description: "Player not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      delete: {
        summary: "Delete player",
        description:
          "Deletes a player and their group memberships. Players referenced by games cannot be deleted.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                  },
                  required: ["success"],
                },
              },
            },
          },
          "404": {
            description: "Player not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "409": {
            description: "Player is referenced by games",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/games": {
      post: {
        summary: "Create game",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["buy_in", "chips_per_player", "player_ids"],
                properties: {
                  buy_in: { type: "number", description: "Buy-in value" },
                  chips_per_player: { type: "integer", description: "Chips per player" },
                  player_ids: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                    description: "Player IDs",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Game created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Game" },
              },
            },
          },
          "400": {
            description: "Invalid data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/games/{id}": {
      get: {
        summary: "Get game by ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Game with players",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Game" },
              },
            },
          },
          "404": {
            description: "Game not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      delete: {
        summary: "Soft-delete game",
        description:
          "Marks the game as deleted. It disappears from history, standings, profit/loss, and ledger; row data remains in the database.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", enum: [true] },
                  },
                  required: ["ok"],
                },
              },
            },
          },
          "404": {
            description: "Game not found (or already deleted)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/games/{id}/finalize": {
      patch: {
        summary: "Finalize game",
        description: "Set final chips per player and compute values.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["final_chips"],
                properties: {
                  final_chips: {
                    type: "object",
                    additionalProperties: { type: "number" },
                    description: "player_id -> final chips count",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Game finalized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Game" },
              },
            },
          },
          "400": {
            description: "Game already finalized or invalid data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Game not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/history": {
      get: {
        summary: "Game history",
        description: "List all games (most recent first).",
        responses: {
          "200": {
            description: "List of games",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Game" },
                },
              },
            },
          },
        },
      },
    },
    "/profit-loss": {
      get: {
        summary: "Profit and loss by player",
        description:
          "Returns P&L for the period. Use period=custom with start_date and end_date (ISO) for custom range.",
        parameters: [
          {
            name: "period",
            in: "query",
            schema: {
              type: "string",
              enum: ["last_7_days", "last_month", "last_year", "all_time", "custom"],
              default: "all_time",
            },
          },
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Required when period=custom",
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Required when period=custom",
          },
        ],
        responses: {
          "200": {
            description: "P&L per player",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    period: { type: "string" },
                    start_date: { type: "string", format: "date-time", nullable: true },
                    end_date: { type: "string", format: "date-time", nullable: true },
                    players: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ProfitLossItem" },
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
      Player: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
        },
      },
      Game: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          date: { type: "string", format: "date-time" },
          buy_in: { type: "number" },
          chips_per_player: { type: "integer" },
          finished: { type: "boolean" },
          players: {
            type: "array",
            items: {
              type: "object",
              properties: {
                player_id: { type: "string", format: "uuid" },
                name: { type: "string" },
                initial_chips: { type: "integer" },
                final_chips: { type: "integer", nullable: true },
              },
            },
          },
        },
      },
      ProfitLossItem: {
        type: "object",
        properties: {
          player_id: { type: "string", format: "uuid" },
          name: { type: "string" },
          total_buy_in: { type: "number" },
          total_cash_out: { type: "number" },
          profit_loss: { type: "number" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
} as const;
