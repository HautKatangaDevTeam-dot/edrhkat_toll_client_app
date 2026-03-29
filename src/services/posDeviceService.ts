import { apiRequest } from "@/lib/http";
import { buildApiUrlObject } from "@/config/api";
import type { PosDeviceResponse, PosDevicesResponse } from "@/types/pos-device";

export const posDeviceService = {
  list(accessToken: string, staleMinutes: number) {
    const url = buildApiUrlObject("/api/pos/devices");
    url.searchParams.set("stale_minutes", String(staleMinutes));

    return apiRequest<PosDevicesResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },

  update(
    accessToken: string,
    id: string,
    input: {
      label?: string | null;
      contactPhone?: string | null;
      assignedPost?: string | null;
      isActive?: boolean;
    }
  ) {
    const url = buildApiUrlObject(`/api/pos/devices/${id}`);
    return apiRequest<PosDeviceResponse>({
      path: url.toString(),
      method: "PATCH",
      accessToken,
      body: input,
    });
  },
};
