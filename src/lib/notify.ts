import { toast } from "sonner";

import { ApiError } from "@/lib/http";

type NotifyOptions = {
  description?: string;
  duration?: number;
};

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 5500;

const toMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
};

export const notify = {
  success(message: string, options?: NotifyOptions) {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration ?? DEFAULT_DURATION,
    });
  },

  error(message: string, options?: NotifyOptions) {
    toast.error(message, {
      description: options?.description,
      duration: options?.duration ?? ERROR_DURATION,
    });
  },

  warning(message: string, options?: NotifyOptions) {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? DEFAULT_DURATION,
    });
  },

  info(message: string, options?: NotifyOptions) {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration ?? DEFAULT_DURATION,
    });
  },

  fromError(error: unknown, fallback: string, options?: NotifyOptions) {
    const message = toMessage(error, fallback);
    this.error(message, options);
  },
};
