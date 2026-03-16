import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/state/features/auth/authSlice";
import themeReducer from "@/state/features/theme/themeSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
    },
    devTools: process.env.NODE_ENV !== "production",
  });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
export type RootState = ReturnType<AppStore["getState"]>;
