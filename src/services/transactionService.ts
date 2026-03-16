import { apiRequest } from "@/lib/http";
import { buildApiUrlObject } from "@/config/api";
import type { TollTransactionsResponse } from "@/types/transaction";

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  company_id?: string;
  post_id?: string;
  payment_mode?: string;
  date_from?: string;
  date_to?: string;
};

export const transactionService = {
  list(accessToken: string, params?: ListParams) {
    const url = buildApiUrlObject("/api/pos/transactions");
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.pageSize) url.searchParams.set("pageSize", String(params.pageSize));
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.company_id) url.searchParams.set("company_id", params.company_id);
    if (params?.post_id) url.searchParams.set("post_id", params.post_id);
    if (params?.payment_mode) url.searchParams.set("payment_mode", params.payment_mode);
    if (params?.date_from) url.searchParams.set("date_from", params.date_from);
    if (params?.date_to) url.searchParams.set("date_to", params.date_to);

    return apiRequest<TollTransactionsResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },
};
