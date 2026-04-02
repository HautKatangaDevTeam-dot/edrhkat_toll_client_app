import { AUTH_ENDPOINTS, buildApiUrl, buildApiUrlObject } from "@/config/api";
import { apiRequest } from "@/lib/http";
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UsersListResponse,
} from "@/types/auth";

export const authService = {
  register(input: RegisterRequest, accessToken?: string | null) {
    return apiRequest<RegisterResponse>({
      path: buildApiUrl(AUTH_ENDPOINTS.register),
      method: "POST",
      body: input,
      accessToken,
    });
  },
  login(input: LoginRequest) {
    return apiRequest<LoginResponse>({
      path: buildApiUrl(AUTH_ENDPOINTS.login),
      method: "POST",
      body: input,
    });
  },
  refresh(refreshToken?: string) {
    return apiRequest<RefreshResponse>({
      path: buildApiUrl(AUTH_ENDPOINTS.refresh),
      method: "POST",
      body: refreshToken ? { refreshToken } : {},
    });
  },
  listUsers(
    accessToken: string,
    params?: {
      search?: string;
      role?: string;
      post?: string;
      page?: number;
      pageSize?: number;
    }
  ) {
    const url = buildApiUrlObject("/api/auth/users");
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.role) url.searchParams.set("role", params.role);
    if (params?.post) url.searchParams.set("post", params.post);
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.pageSize) url.searchParams.set("pageSize", String(params.pageSize));

    return apiRequest<UsersListResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },
  resetPassword(accessToken: string, userId: string) {
    return apiRequest<ResetPasswordResponse>({
      path: buildApiUrl(`/api/auth/users/${userId}/reset-password`),
      method: "POST",
      body: {},
      accessToken,
    });
  },
  updateUser(
    accessToken: string,
    userId: string,
    input: UpdateUserRequest
  ) {
    return apiRequest<UpdateUserResponse>({
      path: buildApiUrl(`/api/auth/users/${userId}`),
      method: "PATCH",
      body: input,
      accessToken,
    });
  },
  me(accessToken?: string | null) {
    return apiRequest<MeResponse>({
      path: buildApiUrl(AUTH_ENDPOINTS.me),
      method: "GET",
      accessToken,
    });
  },
  logout(accessToken?: string | null) {
    return apiRequest<LogoutResponse>({
      path: buildApiUrl(AUTH_ENDPOINTS.logout),
      method: "POST",
      body: {},
      accessToken,
    });
  },
};
