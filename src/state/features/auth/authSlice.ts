import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { authService } from "@/services/authService";
import { ApiError, COOKIE_SESSION_SENTINEL } from "@/lib/http";
import type {
  AuthErrorPayload,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "@/types/auth";
import type { RootState } from "@/state/store";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: AuthErrorPayload | null;
};

const toAuthErrorPayload = (error: unknown, fallbackMessage: string): AuthErrorPayload => {
  if (error instanceof ApiError) {
    return {
      message: error.message || fallbackMessage,
      code: error.code as AuthErrorPayload["code"],
    };
  }

  if (error instanceof Error) {
    return { message: error.message || fallbackMessage };
  }

  return { message: fallbackMessage };
};

const AUTH_STORAGE_KEY = "edrhk.at.auth";

const loadStoredAuth = (): Partial<AuthState> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      user: parsed.user ?? null,
      accessToken: null,
      refreshToken: parsed.refreshToken ? COOKIE_SESSION_SENTINEL : null,
    };
  } catch {
    return {};
  }
};

const persistAuth = (state: AuthState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      user: state.user,
      refreshToken: state.refreshToken ? true : null,
    }),
  );
};

const clearStoredAuth = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

const stored = loadStoredAuth();

const initialState: AuthState = {
  user: stored.user ?? null,
  accessToken: stored.accessToken ?? null,
  refreshToken: stored.refreshToken ?? null,
  status: "idle",
  error: null,
};

export const registerUser = createAsyncThunk(
  "auth/register",
  async (payload: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authService.register(payload);
      return response;
    } catch (error) {
      return rejectWithValue(
        toAuthErrorPayload(error, "Echec de l'enregistrement.")
      );
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (payload: LoginRequest, { rejectWithValue }) => {
    try {
      await authService.login(payload);
      const session = await authService.me();
      return {
        success: true as const,
        user: session.user,
        accessToken: COOKIE_SESSION_SENTINEL,
        refreshToken: COOKIE_SESSION_SENTINEL,
      };
    } catch (error) {
      return rejectWithValue(
        toAuthErrorPayload(error, "Echec de la connexion.")
      );
    }
  },
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (accessToken: string, { rejectWithValue }) => {
    try {
      await authService.logout(accessToken);
      return true;
    } catch (error) {
      return rejectWithValue(
        toAuthErrorPayload(error, "Echec de la deconnexion.")
      );
    }
  },
);

export const refreshSession = createAsyncThunk(
  "auth/refreshSession",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const refreshToken = state.auth.refreshToken;
      if (!refreshToken) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }
      const response = await authService.refresh(
        refreshToken === COOKIE_SESSION_SENTINEL ? undefined : refreshToken
      );
      return {
        ...response,
        accessToken: COOKIE_SESSION_SENTINEL,
        refreshToken: COOKIE_SESSION_SENTINEL,
      };
    } catch (error) {
      return rejectWithValue(
        toAuthErrorPayload(error, "Session expiree. Veuillez vous reconnecter.")
      );
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthState(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = "idle";
      state.error = null;
      clearStoredAuth();
    },
    hydrateAuthState(state) {
      const next = loadStoredAuth();
      state.user = next.user ?? null;
      state.accessToken = next.accessToken ?? null;
      state.refreshToken = next.refreshToken ?? null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.accessToken = null;
        state.refreshToken = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as AuthErrorPayload) ?? null;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.accessToken = COOKIE_SESSION_SENTINEL;
        state.refreshToken = COOKIE_SESSION_SENTINEL;
        persistAuth(state);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as AuthErrorPayload) ?? null;
      })
      .addCase(refreshSession.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.status = "idle";
        clearStoredAuth();
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        state.user = action.payload.user;
        state.accessToken = COOKIE_SESSION_SENTINEL;
        state.refreshToken = COOKIE_SESSION_SENTINEL;
        persistAuth(state);
      })
      .addCase(refreshSession.rejected, (state, action) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.status = "idle";
        state.error = (action.payload as AuthErrorPayload) ?? null;
        clearStoredAuth();
      });
  },
});

export const { clearAuthState, hydrateAuthState } = authSlice.actions;
export default authSlice.reducer;
