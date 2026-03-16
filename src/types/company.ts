export type BillingMode = "PAYG" | "PREPAID" | "POSTPAID";

export type Company = {
  id: string;
  name: string;
  code: string;
  billingMode: BillingMode;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CompaniesListResponse = {
  success: boolean;
  data: Company[];
  total: number;
  page: number;
  pageSize: number;
};

export type CompanyResponse = {
  success: boolean;
  company: Company;
};
