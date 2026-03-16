import type { Receipt, ReceiptChannel, ReceiptFinancialMode } from "@/types/receipt";
import type { TollTransaction, TollPaymentMode } from "@/types/transaction";

export type ReportFamily = "financial" | "passage";

export type ReportMetadata = {
  reportFamily?: ReportFamily;
  total?: number;
  page?: number;
  pageSize?: number;
  scopedPost?: string;
  companies?: Array<{ id: string; name: string }>;
  posts?: string[];
  dateFrom?: string;
  dateTo?: string;
};

export type TransactionReportParams = {
  date_from: string;
  date_to: string;
  post_id?: string;
  company_id?: string;
  payment_mode?: TollPaymentMode;
  search?: string;
  limit?: number;
};

export type ReceiptReportParams = {
  date_from: string;
  date_to: string;
  post_id?: string;
  company_id?: string;
  financial_mode?: ReceiptFinancialMode;
  channel?: ReceiptChannel;
  family?: ReportFamily;
  search?: string;
  limit?: number;
};

export type ReportTransactionsResponse = {
  success: boolean;
  data: TollTransaction[];
  total?: number;
  page?: number;
  pageSize?: number;
  scopedPost?: string;
  metadata?: ReportMetadata;
  meta?: ReportMetadata;
};

export type ReportReceiptsResponse = {
  success: boolean;
  data: Receipt[];
  total?: number;
  page?: number;
  pageSize?: number;
  metadata?: ReportMetadata;
  meta?: ReportMetadata;
};
