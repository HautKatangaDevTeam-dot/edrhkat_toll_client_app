import { apiRequest } from "@/lib/http";
import { buildApiUrlObject } from "@/config/api";
import type { PosKeyRegistryResponse } from "@/types/pos-key";

export const posKeyService = {
  list(accessToken: string) {
    const url = buildApiUrlObject("/api/pos/key-registry");
    return apiRequest<PosKeyRegistryResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },
};
