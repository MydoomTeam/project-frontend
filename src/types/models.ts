export interface Player {
  id: number;
  username: string;
  email: string;
  role: string;
  last_access_date: string;
  global_elo: number;
  avatar_url?: string | null;
}

export interface SessionResponse {
  access_token: string;
  token_type: string;
  player: Player;
}

export type EliminationType =
  | "Eliminación Sencilla"
  | "Eliminación Doble"
  | "Round Robin"
  | "Swiss";

export type TournamentStatus =
  | "Pendiente"
  | "Listo para iniciar"
  | "En curso"
  | "Finalizado";

export type MatchStatus = "Pendiente" | "Programado" | "En curso" | "Finalizado";

export interface Tournament {
  id: number;
  name: string;
  elimination_type: EliminationType;
  game_name?: string | null;
  game_category?: string | null;
  participant_target?: number | null;
  rounds: number;
  round_duration_minutes?: number | null;
  uses_score?: boolean;
  status: TournamentStatus;
  start_date?: string | null;
  end_date?: string | null;
  language?: string | null;
  region?: string | null;
  creator_id: number;
  creator_name?: string;
  creator_avatar_url?: string | null;
  total_participants?: number;
}

export interface Match {
  id: number;
  tournament_id: number;
  round: number;
  position: number;
  bracket_type: "ganadores" | "perdedores" | "gran_final";
  player1_id: number | null;
  player2_id: number | null;
  winner_id: number | null;
  next_match_id?: number | null;
  score_player1?: number | null;
  score_player2?: number | null;
  score_detail?: string | null;
  scheduled_datetime?: string | null;
  result?: string | null;
  status: MatchStatus;
}

export interface BracketResponse {
  tournament_id: number;
  tournament_status: string;
  matches: Match[];
}

export interface RankingItem {
  position: number;
  player_id: number;
  wins: number;
  global_elo: number;
}

export interface AlertItem {
  id: number;
  event_type: string;
  message: string;
  created_at: string;
  status: "nueva" | "reconocida";
}

export interface AlertActivityItem {
  id: number;
  action: string;
  action_label?: string | null;
  created_at: string;
  description?: string | null;
  tournament_id?: number | null;
  tournament_name?: string | null;
}

export interface AlertPanelStats {
  total: number;
  new: number;
  acknowledged: number;
  critical: number;
}

export interface AlertPanelResponse {
  items: AlertItem[];
  stats: AlertPanelStats;
  history: AlertActivityItem[];
}

export interface PlayerTournamentHistoryItem {
  id: number;
  name: string;
  elimination_type: EliminationType;
  rounds: number;
  status: TournamentStatus;
  is_creator: boolean;
  registration_status: string | null;
}

export interface PlayerLookupItem {
  id: number;
  username: string;
  global_elo: number;
  avatar_url?: string | null;
}

export interface EloHistoryItem {
  id: number;
  match_id: number;
  player_id: number;
  previous_elo: number;
  current_elo: number;
  change_date: string;
}

export type RegistrationStatus = "Por confirmar" | "Confirmado" | "Rechazado" | "Cancelada";

export interface TournamentRegistration {
  id: number;
  tournament_id: number;
  player_id: number;
  username: string;
  email: string;
  status: RegistrationStatus;
  registration_date?: string | null;
  elo_seed?: number | null;
}