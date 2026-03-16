export type DashboardSummary = {
  rangeDays: number;
  since: string;
  companies: { total: number; active: number; blocked: number };
  transactions: {
    total: number;
    totalAmount: number;
    byPaymentMode: Array<{ key: string; count: number; amount: number }>;
    topPosts: Array<{ key: string; count: number; amount: number }>;
    topCompanies: Array<{ companyId: string; companyName: string | null; count: number; amount: number }>;
  };
  devices: { total: number; active: number; inactive: number };
};

export type DashboardSummaryResponse = {
  success: boolean;
  data: DashboardSummary;
};

export type RevenueTimeseriesPoint = {
  period: string;
  totalAmount: number;
  totalCount: number;
};

export type RevenueTimeseries = {
  rangeDays: number;
  since: string;
  granularity: "day" | "week" | string;
  series: RevenueTimeseriesPoint[];
};

export type RevenueTimeseriesResponse = {
  success: boolean;
  data: RevenueTimeseries;
};
