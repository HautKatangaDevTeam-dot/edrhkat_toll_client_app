export type OverrideRecord = {
  id: string;
  deviceId: string;
  localId: string;
  tollTransactionId: string | null;
  companyId: string;
  companyName: string;
  postId: string;
  approvedByUserId: string;
  approvedByName: string;
  reason: string;
  walletBefore: number;
  walletAfter: number;
  negativeLimit: number;
  decisionAt: string;
  createdAt: string;
};

export type OverridesResponse = {
  success: true;
  data: OverrideRecord[];
  total: number;
  page: number;
  pageSize: number;
};
