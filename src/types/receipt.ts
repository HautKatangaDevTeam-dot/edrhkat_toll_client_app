export type ReceiptTaxType = "TRANSPORT" | "TRANSFERT";

export const RECEIPT_FINANCIAL_MODES = ["NORMAL", "EXONERATED"] as const;

export type ReceiptFinancialMode = (typeof RECEIPT_FINANCIAL_MODES)[number];

export type ReceiptStatus = "ISSUED" | "CONSUMED" | "CANCELLED" | "VOID";

export const RECEIPT_BATCH_CORRECTION_MODES = [
  "TRANSFER_ALL",
  "MOVE_REMAINING",
] as const;

export type ReceiptBatchCorrectionMode =
  (typeof RECEIPT_BATCH_CORRECTION_MODES)[number];

export const RECEIPT_CHANNELS = [
  "COMPANY_BATCH",
  "SINGLE_TOLL",
  "EXCEPTIONAL_TOLL",
] as const;

export type ReceiptChannel = (typeof RECEIPT_CHANNELS)[number];

export type ReceiptBatch = {
  id: string;
  batchShortCode: string;
  batchQrPayload: string;
  companyId: string;
  companyName: string | null;
  companyCode: string | null;
  quantity: number;
  issuedCount: number;
  consumedCount: number;
  remainingCount: number;
  taxType: ReceiptTaxType;
  provenance: string | null;
  destination: string | null;
  financialMode: ReceiptFinancialMode;
  unitAmountUsd: number;
  totalTheoreticalUsd: number;
  totalPaidUsd: number;
  totalExoneratedUsd: number;
  paymentReference: string | null;
  note: string | null;
  issuedByUserId: string | null;
  issuedByUsername: string | null;
  issuedByRole: string | null;
  channel: ReceiptChannel;
  createdAt: string;
  updatedAt: string;
};

export type Receipt = {
  id: string;
  batchId: string | null;
  companyId: string | null;
  companyName: string | null;
  companyCode: string | null;
  shortCode: string;
  sequenceNo: number | null;
  status: ReceiptStatus;
  channel: ReceiptChannel;
  taxType: ReceiptTaxType;
  provenance: string | null;
  destination: string | null;
  financialMode: ReceiptFinancialMode;
  tariffAmountUsd: number;
  paidAmountUsd: number;
  exoneratedAmountUsd: number;
  consumedAt: string | null;
  consumedPost: string | null;
  consumedByUserId: string | null;
  createdAt: string;
};

export type ReceiptEvent = {
  id: string;
  receiptId: string;
  batchId: string | null;
  eventType: string;
  actorUserId: string | null;
  actorUsername: string | null;
  actorRole: string | null;
  sourceDeviceId: string | null;
  sourceDeviceType: string | null;
  postId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ReceiptBatchConsumptionEvent = {
  id: string;
  batchId: string;
  batchCode: string;
  quantityConsumed: number;
  actorUserId: string | null;
  actorUsername: string | null;
  actorRole: string | null;
  sourceDeviceId: string | null;
  sourceDeviceType: string | null;
  postId: string | null;
  localEventId: string | null;
  source: string | null;
  consumedAt: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ReceiptBatchCorrection = {
  id: string;
  sourceBatchId: string;
  targetBatchId: string | null;
  sourceBatchCode: string;
  targetBatchCode: string | null;
  sourceCompanyId: string;
  sourceCompanyName: string | null;
  sourceCompanyCode: string | null;
  targetCompanyId: string;
  targetCompanyName: string | null;
  targetCompanyCode: string | null;
  mode: ReceiptBatchCorrectionMode;
  reason: string;
  movedQuantity: number;
  sourceQuantityBefore: number;
  sourceQuantityAfter: number;
  targetQuantityAfter: number | null;
  actorUserId: string | null;
  actorUsername: string | null;
  actorRole: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ReceiptSummary = {
  batchCount: number;
  issuedCount: number;
  consumedCount: number;
  remainingCount: number;
  totalTheoreticalUsd: number;
  totalPaidUsd: number;
  totalExoneratedUsd: number;
};

export type ReceiptBatchListResponse = {
  success: boolean;
  data: ReceiptBatch[];
  total: number;
  page: number;
  pageSize: number;
  summary: ReceiptSummary;
};

export type ReceiptBatchDetailResponse = {
  success: boolean;
  batch: ReceiptBatch;
  events: ReceiptBatchConsumptionEvent[];
  corrections?: ReceiptBatchCorrection[];
};

export type ReceiptBatchLookupResponse = {
  success: boolean;
  batch: ReceiptBatch;
};

export type ReceiptBatchReceiptsResponse = {
  success: boolean;
  batch: ReceiptBatch;
  data: Receipt[];
  total: number;
  page: number;
  pageSize: number;
  events: ReceiptBatchConsumptionEvent[];
};

export type ReceiptLookupResponse = {
  success: boolean;
  receipt: Receipt;
  events: ReceiptEvent[];
};

export type ReceiptBatchCorrectionResponse = {
  success: boolean;
  correction: ReceiptBatchCorrection;
  sourceBatch: ReceiptBatch;
  targetBatch: ReceiptBatch | null;
};
