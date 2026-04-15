import { buildApiUrl, buildApiUrlObject } from "@/config/api";
import { apiRequest } from "@/lib/http";
import type {
  ReceiptBatchCorrectionMode,
  ReceiptBatchCorrectionResponse,
  ReceiptBatchDetailResponse,
  ReceiptBatchLookupResponse,
  ReceiptBatchListResponse,
  ReceiptBatchReceiptsResponse,
  ReceiptFinancialMode,
  ReceiptLookupResponse,
  ReceiptStatus,
  ReceiptTaxType,
} from "@/types/receipt";

export const receiptService = {
  listBatches(
    accessToken: string,
    params?: {
      search?: string;
      company_id?: string;
      tax_type?: ReceiptTaxType;
      financial_mode?: ReceiptFinancialMode;
      page?: number;
      pageSize?: number;
    }
  ) {
    const url = buildApiUrlObject("/api/receipts/batches");
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.company_id) url.searchParams.set("company_id", params.company_id);
    if (params?.tax_type) url.searchParams.set("tax_type", params.tax_type);
    if (params?.financial_mode) {
      url.searchParams.set("financial_mode", params.financial_mode);
    }
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.pageSize) url.searchParams.set("pageSize", String(params.pageSize));

    return apiRequest<ReceiptBatchListResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },

  getBatch(accessToken: string, id: string) {
    return apiRequest<ReceiptBatchDetailResponse>({
      path: buildApiUrl(`/api/receipts/batches/${id}`),
      method: "GET",
      accessToken,
    });
  },

  correctBatchCompany(
    accessToken: string,
    id: string,
    body: {
      target_company_id: string;
      mode: ReceiptBatchCorrectionMode;
      reason: string;
    }
  ) {
    return apiRequest<ReceiptBatchCorrectionResponse>({
      path: buildApiUrl(`/api/receipts/batches/${id}/correct-company`),
      method: "POST",
      body,
      accessToken,
    });
  },

  lookupBatch(accessToken: string, code: string) {
    const url = buildApiUrlObject("/api/receipts/batches/lookup");
    url.searchParams.set("code", code);

    return apiRequest<ReceiptBatchLookupResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },

  listBatchReceipts(
    accessToken: string,
    id: string,
    params?: { status?: ReceiptStatus; page?: number; pageSize?: number }
  ) {
    const url = buildApiUrlObject(`/api/receipts/batches/${id}/receipts`);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.pageSize) url.searchParams.set("pageSize", String(params.pageSize));

    return apiRequest<ReceiptBatchReceiptsResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },

  lookup(accessToken: string, code: string) {
    const url = buildApiUrlObject("/api/receipts/lookup");
    url.searchParams.set("code", code);

    return apiRequest<ReceiptLookupResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },
};
