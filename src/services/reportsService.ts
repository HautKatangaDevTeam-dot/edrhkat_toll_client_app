import { apiRequest } from "@/lib/http";
import { buildApiUrlObject } from "@/config/api";
import type {
  ReceiptReportParams,
  ReportReceiptsResponse,
  ReportTransactionsResponse,
  TransactionReportParams,
} from "@/types/report";

export const reportsService = {
  transactions(accessToken: string, params: TransactionReportParams) {
    const url = buildApiUrlObject("/api/reports/transactions");
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        url.searchParams.set(key, String(val));
      }
    });

    return apiRequest<ReportTransactionsResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },

  receipts(accessToken: string, params: ReceiptReportParams) {
    const url = buildApiUrlObject("/api/reports/receipts");
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        url.searchParams.set(key, String(val));
      }
    });

    return apiRequest<ReportReceiptsResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },
};
