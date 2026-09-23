export interface AppUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

export interface ApiError {
  error: string;
  message: string;
}
