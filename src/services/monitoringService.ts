import { apiRequest } from "@/lib/http";
import { buildApiUrlObject } from "@/config/api";
import type {
  HealthStatusResponse,
  MonitoringIncidentResponse,
  MonitoringIncidentsResponse,
} from "@/types/monitoring";

export const monitoringService = {
  listIncidents(
    accessToken: string,
    params: { status?: "active" | "resolved" | "all"; limit?: number } = {}
  ) {
    const url = buildApiUrlObject("/api/monitoring/incidents");
    if (params.status) {
      url.searchParams.set("status", params.status);
    }
    if (typeof params.limit === "number" && params.limit > 0) {
      url.searchParams.set("limit", String(params.limit));
    }

    return apiRequest<MonitoringIncidentsResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },

  resolveIncident(accessToken: string, id: string) {
    const url = buildApiUrlObject(`/api/monitoring/incidents/${id}/resolve`);
    return apiRequest<MonitoringIncidentResponse>({
      path: url.toString(),
      method: "PATCH",
      accessToken,
      body: {},
    });
  },

  health() {
    const url = buildApiUrlObject("/api/health");
    return apiRequest<HealthStatusResponse>({
      path: url.toString(),
      method: "GET",
    });
  },
};
