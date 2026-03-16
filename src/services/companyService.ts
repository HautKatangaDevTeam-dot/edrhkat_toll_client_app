import { apiRequest } from "@/lib/http";
import { buildApiUrl, buildApiUrlObject } from "@/config/api";
import type {
  BillingMode,
  CompaniesListResponse,
  CompanyResponse,
} from "@/types/company";

type CreateCompanyRequest = {
  name: string;
  code: string;
  billing_mode?: BillingMode;
};

type UpdateCompanyRequest = Partial<CreateCompanyRequest> & {
  is_active?: boolean;
};

export const companyService = {
  list(
    accessToken: string,
    params?: { search?: string; page?: number; pageSize?: number }
  ) {
    const url = buildApiUrlObject("/api/companies");
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.pageSize)
      url.searchParams.set("pageSize", String(params.pageSize));

    return apiRequest<CompaniesListResponse>({
      path: url.toString(),
      method: "GET",
      accessToken,
    });
  },
  create(accessToken: string, body: CreateCompanyRequest) {
    return apiRequest<CompanyResponse>({
      path: buildApiUrl("/api/companies"),
      method: "POST",
      body,
      accessToken,
    });
  },
  getOne(accessToken: string, id: string) {
    return apiRequest<CompanyResponse>({
      path: buildApiUrl(`/api/companies/${id}`),
      method: "GET",
      accessToken,
    });
  },
  update(accessToken: string, id: string, body: UpdateCompanyRequest) {
    return apiRequest<CompanyResponse>({
      path: buildApiUrl(`/api/companies/${id}`),
      method: "PATCH",
      body,
      accessToken,
    });
  },
};
