export type Jogador = {
  id: string;
  nome: string;
};

export type Partida = {
  id: string;
  data: string;
  buy_in: number;
  chips_por_jogador: number;
  finalizada: boolean;
};

export type PartidaJogador = {
  partida_id: string;
  jogador_id: string;
  chips_iniciais: number;
  chips_finais: number | null;
};

export type PartidaComJogadores = Partida & {
  jogadores: Array<{
    jogador_id: string;
    nome: string;
    chips_iniciais: number;
    chips_finais: number | null;
  }>;
};

export type LucroPerda = {
  jogador_id: string;
  nome: string;
  total_entrada: number;
  total_saida: number;
  lucro_perda: number;
};

export enum PeriodoFiltro {
  Ultimos7Dias = "ultimos_7_dias",
  UltimoMes = "ultimo_mes",
  UltimoAno = "ultimo_ano",
  TodoPeriodo = "todo_periodo",
  Personalizado = "personalizado",
}
