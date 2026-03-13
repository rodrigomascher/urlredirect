export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}
