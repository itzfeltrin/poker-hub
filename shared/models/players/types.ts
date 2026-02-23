/** API response types (snake_case) matching backend */

export interface ApiPlayer {
  id: string;
  name: string;
}

export interface ApiPlayerCreate {
  name: string;
}
