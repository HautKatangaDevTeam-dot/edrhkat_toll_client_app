import { apiRequest } from "@/lib/http";
import { buildApiUrlObject } from "@/config/api";
import type { DashboardSummaryResponse, RevenueTimeseriesResponse } from "@/types/dashboard";

export const dashboardService = {
  summary(accessToken: string, days?: number | null) {
    const url = buildApiUrlObject("/api/dashboard/summary");
    if (typeof days === "number" && days > 0) {
      url.searchParams.set("days", String(days));
    }

    return apiRequest<DashboardSummaryResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },

  revenueTimeseries(
    accessToken: string,
    params: { days: number; granularity?: "day" | "week" }
  ) {
    const url = buildApiUrlObject("/api/dashboard/timeseries/revenue");
    url.searchParams.set("days", String(params.days));
    if (params.granularity) {
      url.searchParams.set("granularity", params.granularity);
    }

    return apiRequest<RevenueTimeseriesResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },
};
