export type AuthRole =
  | "ADMIN_SYSTEME"
  | "SUPERVISEUR"
  | "AGENT_BUREAU"
  | "AGENT_TOLL";

export type AuthPost =
  | "KAMPEMBA"
  | "MIKAS"
  | "DITENGWA"
  | "MENDA"
  | "MULUNGWISI"
  | "LWAMBO"
  | "LWISHA CENTRE"
  | "EXCELLENT"
  | "RTE SHEMAF"
  | "KABOLA"
  | "KYANDWE"
  | "SASE"
  | "DIRECTION_GENERALE";

export type AuthUser = {
  id: string;
  username: string;
  role: AuthRole;
  post: AuthPost;
};

export type UserWithMeta = AuthUser & {
  createdAt?: string;
  updatedAt?: string;
};

export type UsersListResponse = {
  success: boolean;
  data: UserWithMeta[];
  total: number;
  page: number;
  pageSize: number;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type RegisterRequest = LoginRequest & {
  role: AuthRole;
  post: AuthPost;
};

export type LoginResponse = {
  success: boolean;
  user: AuthUser;
};

export type RegisterResponse = {
  success: boolean;
  user: AuthUser;
};

export type RefreshResponse = LoginResponse;

export type MeResponse = {
  success: boolean;
  user: AuthUser;
};

export type LogoutResponse = {
  success: boolean;
};

export type ResetPasswordResponse = {
  success: boolean;
  user: AuthUser;
  defaultPassword: string;
};

export type AuthErrorCode =
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_RATE_LIMITED"
  | "AUTH_UNAUTHORIZED"
  | "AUTH_USERNAME_EXISTS"
  | "AUTH_USER_NOT_FOUND"
  | "AUTH_PASSWORD_RESET_FAILED"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "ROUTE_NOT_FOUND";

export type AuthErrorPayload = {
  message: string;
  code?: AuthErrorCode;
};
