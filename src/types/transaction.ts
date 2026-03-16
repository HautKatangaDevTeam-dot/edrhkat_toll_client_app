export const TOLL_PAYMENT_MODES = ["CASH", "CARD", "OTHER"] as const;

export type TollPaymentMode = (typeof TOLL_PAYMENT_MODES)[number];

export type TollTransaction = {
  id: string;
  deviceId: string;
  localId: string;
  companyId: string | null;
  companyCode: string | null;
  companyName: string | null;
  amountUsd: number;
  amountDue: number | null;
  amountPaid: number | null;
  paymentMode: TollPaymentMode;
  overrideUsed: boolean;
  postId: string;
  vehiclePlate: string | null;
  taxType: string | null;
  provenance: string | null;
  destination: string | null;
  agentId: string | null;
  agentName: string | null;
  transactionDate: string | null;
  carrierName: string | null;
  keyId: string | null;
  signature: string | null;
  createdAtLocal: string | null;
  updatedAtLocal: string | null;
  walletSnapshotBefore: number | null;
  walletSnapshotAfter: number | null;
  negativeLimitAtTime: number | null;
  exceptionalIssue: boolean;
  exceptionReason: string | null;
  createdAt: string;
};

export type TollTransactionsResponse = {
  success: true;
  data: TollTransaction[];
  total: number;
  page: number;
  pageSize: number;
};
