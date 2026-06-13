export interface Player {
id: number;
username: string;
email: string;
role: string;
last_access_date: string;
global_elo: number;
}

export interface SessionResponse {
access_token: string;
token_type: string;
player: Player;
}

export interface Tournament {
id: number;
name: string;
elimination_type: "Eliminación Sencilla" | "Eliminación Doble" | "Round Robin" | "Swiss";
rounds: number;
status: "Pendiente" | "Listo para iniciar" | "En curso" | "Finalizado";
creator_id: number;
creator_name?: string;
total_participants?: number;
}

export interface Match {
id: number;
tournament_id: number;
round: number;
position: number;
bracket_type: "ganadores" | "perdedores";
player1_id: number | null;
player2_id: number | null;
winner_id: number | null;
status: "Programado" | "Finalizado";
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