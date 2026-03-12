export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export type HttpStatusCode = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 500;
