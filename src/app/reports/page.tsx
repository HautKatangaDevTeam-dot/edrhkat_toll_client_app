"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { AUTH_POSTS } from "@/constants/auth";
import { DateFilterField } from "@/components/admin/DateFilterField";
import { AppShell } from "@/components/layouts/AppShell";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/http";
import { companyService } from "@/services/companyService";
import { reportsService } from "@/services/reportsService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import type { ReportFamily, ReportMetadata, ReportReceiptsResponse } from "@/types/report";
import {
  RECEIPT_CHANNELS,
  RECEIPT_FINANCIAL_MODES,
  type Receipt,
  type ReceiptChannel,
  type ReceiptFinancialMode,
} from "@/types/receipt";

const LIMITS = [100, 250, 500, 750, 1000];
const CHANNEL_LABELS: Record<ReceiptChannel, string> = {
  COMPANY_BATCH: "Lot entreprise",
  SINGLE_TOLL: "Genere au peage",
  EXCEPTIONAL_TOLL: "Exceptionnel",
};
const TOLL_ONLY_CHANNELS: ReceiptChannel[] = ["SINGLE_TOLL", "EXCEPTIONAL_TOLL"];
const REPORT_FAMILY_LABELS: Record<ReportFamily, string> = {
  financial: "Financier",
  passage: "Passages",
};

const ReportPdfPreview = dynamic(
  () =>
    import("@/components/reports/ReportPdfPreview").then(
      (m) => m.ReportPdfPreview
    ),
  { ssr: false }
);

export default function ReportsPage() {
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken } = useAppSelector(
    (state) => state.auth
  );

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availablePosts, setAvailablePosts] = useState<string[]>(AUTH_POSTS);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [postId, setPostId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [financialMode, setFinancialMode] =
    useState<ReceiptFinancialMode | "ALL">("ALL");
  const [channel, setChannel] = useState<ReceiptChannel | "ALL">("ALL");
  const [limit, setLimit] = useState<number>(500);
  const [reportFamily, setReportFamily] = useState<ReportFamily>("financial");
  const [companyOptions, setCompanyOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [meta, setMeta] = useState<ReportMetadata>({});
  const exoneratedDisabled =
    channel !== "ALL" && TOLL_ONLY_CHANNELS.includes(channel);

  const handleLogout = () => {
    if (accessToken) {
      dispatch(logoutUser(accessToken));
    }
  };

  const normalizeMetadata = useCallback(
    (res: ReportReceiptsResponse): ReportMetadata => {
      const responseMeta = (res.metadata || res.meta || {}) as ReportMetadata & {
        filters?: { date_from?: string; date_to?: string };
      };
      return {
        total: res.total ?? responseMeta.total,
        page: res.page ?? responseMeta.page,
        pageSize: res.pageSize ?? responseMeta.pageSize,
        scopedPost: responseMeta.scopedPost,
        reportFamily:
          (responseMeta.reportFamily as ReportFamily | undefined) ?? reportFamily,
        companies: responseMeta.companies,
        posts: responseMeta.posts,
        dateFrom:
          responseMeta.dateFrom ?? responseMeta.filters?.date_from ?? dateFrom,
        dateTo:
          responseMeta.dateTo ?? responseMeta.filters?.date_to ?? dateTo,
      };
    },
    [dateFrom, dateTo, reportFamily]
  );

  const applyMetadata = useCallback((nextMeta: ReportMetadata) => {
    if (nextMeta.companies?.length) {
      setCompanyOptions(
        Array.from(
          new Map(
            nextMeta.companies.map((c) => [c.id, { id: c.id, name: c.name }])
          ).values()
        ).sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    if (nextMeta.posts?.length) {
      setAvailablePosts(Array.from(new Set(nextMeta.posts)).sort());
    }
    setMeta(nextMeta);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const loadCompanies = async (token: string) => {
      const res = await companyService.list(token, { page: 1, pageSize: 100 });
      setCompanyOptions(
        (res.data ?? [])
          .map((c) => ({ id: c.id, name: c.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    };

    loadCompanies(accessToken).catch(async (err) => {
      if (err instanceof ApiError && err.status === 401 && refreshToken) {
        try {
          const refreshed = await dispatch(refreshSession()).unwrap();
          if (refreshed.accessToken) {
            await loadCompanies(refreshed.accessToken);
          }
        } catch {
          // ignore bootstrap failures here
        }
      }
    });
  }, [accessToken, dispatch, refreshToken]);

  useEffect(() => {
    if (exoneratedDisabled && financialMode === "EXONERATED") {
      setFinancialMode("NORMAL");
    }
  }, [exoneratedDisabled, financialMode]);

  const generateReport = useCallback(async () => {
    if (!accessToken) return;
    if (!dateFrom || !dateTo) {
      notify.warning("Veuillez choisir une periode.");
      return;
    }
    if (exoneratedDisabled && financialMode === "EXONERATED") {
      notify.warning(
        "Les recus generes au peage et exceptionnels ne peuvent etre qu'en mode NORMAL."
      );
      return;
    }

    const load = async (token: string) => {
      const res = await reportsService.receipts(token, {
        date_from: dateFrom,
        date_to: dateTo,
        post_id: postId || undefined,
        company_id: companyId || undefined,
        financial_mode:
          financialMode === "ALL" ? undefined : financialMode,
        channel: channel === "ALL" ? undefined : channel,
        family: reportFamily,
        limit,
      });
      setReceipts(res.data ?? []);
      applyMetadata(normalizeMetadata(res));
    };

    setIsLoading(true);
    try {
      await load(accessToken);
      notify.success("Rapport genere.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && refreshToken) {
        try {
          const refreshed = await dispatch(refreshSession()).unwrap();
          if (refreshed.accessToken) {
            await load(refreshed.accessToken);
            return;
          }
        } catch {
          // fall through
        }
      }
      notify.fromError(err, "Impossible de generer le rapport.");
    } finally {
      setIsLoading(false);
    }
  }, [
    accessToken,
    applyMetadata,
    channel,
    companyId,
    dateFrom,
    dateTo,
    normalizeMetadata,
    dispatch,
    exoneratedDisabled,
    financialMode,
    limit,
    postId,
    refreshToken,
    reportFamily,
  ]);

  const chips = useMemo(() => {
    const items: string[] = [];
    if (dateFrom) items.push(`Du ${dateFrom}`);
    if (dateTo) items.push(`Au ${dateTo}`);
    if (postId) items.push(`Poste ${postId}`);
    if (companyId) {
      const company = companyOptions.find((item) => item.id === companyId);
      items.push(`Societe ${company?.name ?? companyId}`);
    }
    items.push(`Famille ${REPORT_FAMILY_LABELS[reportFamily]}`);
    if (financialMode !== "ALL") items.push(`Mode ${financialMode}`);
    if (channel !== "ALL") items.push(`Canal ${CHANNEL_LABELS[channel]}`);
    items.push(`Limite ${limit}`);
    return items;
  }, [
    channel,
    companyId,
    companyOptions,
    dateFrom,
    dateTo,
    financialMode,
    limit,
    postId,
    reportFamily,
  ]);

  const selectedCompanyName = useMemo(() => {
    if (!companyId) return undefined;
    return companyOptions.find((item) => item.id === companyId)?.name;
  }, [companyId, companyOptions]);

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="Rapports"
        pageSubtext="Exports des recus"
        userLabel={user ? user.username : undefined}
        userMeta={user ? `${user.role} · ${user.post}` : undefined}
        onLogout={handleLogout}
      >
        <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center py-6">
          <div className="flex w-full flex-col gap-4">
            <Card>
              <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date debut</Label>
                  <DateFilterField value={dateFrom} onChange={setDateFrom} />
                </div>
                <div className="space-y-2">
                  <Label>Date fin</Label>
                  <DateFilterField value={dateTo} onChange={setDateTo} />
                </div>
                <div className="space-y-2">
                  <Label>Type de rapport</Label>
                  <Select
                    value={reportFamily}
                    onValueChange={(v) => setReportFamily(v as ReportFamily)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Rapport financier</SelectItem>
                      <SelectItem value="passage">Rapport des passages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Societe</Label>
                  <Select
                    value={companyId || "ALL"}
                    onValueChange={(v) => setCompanyId(v === "ALL" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Toutes</SelectItem>
                      {companyOptions.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{reportFamily === "financial" ? "Poste d'emission" : "Poste de passage"}</Label>
                  <Select
                    value={postId || "ALL"}
                    onValueChange={(v) => setPostId(v === "ALL" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous</SelectItem>
                      {availablePosts.map((post) => (
                        <SelectItem key={post} value={post}>
                          {post}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mode financier</Label>
                  <Select
                    value={financialMode}
                    onValueChange={(v) =>
                      setFinancialMode(v as ReceiptFinancialMode | "ALL")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous</SelectItem>
                      {RECEIPT_FINANCIAL_MODES.map((mode) => (
                        <SelectItem
                          key={mode}
                          value={mode}
                          disabled={exoneratedDisabled && mode === "EXONERATED"}
                        >
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {exoneratedDisabled ? (
                    <p className="text-xs text-muted-foreground">
                      Ce canal accepte uniquement le mode NORMAL.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select
                    value={channel}
                    onValueChange={(v) =>
                      setChannel(v as ReceiptChannel | "ALL")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous</SelectItem>
                      {RECEIPT_CHANNELS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {CHANNEL_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2 md:max-w-xs">
                  <Label>Limite</Label>
                  <Select
                    value={String(limit)}
                    onValueChange={(v) => setLimit(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIMITS.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:justify-center">
                  <Button
                    onClick={generateReport}
                    disabled={isLoading}
                    className="min-w-40"
                  >
                    {isLoading ? "Generation..." : "Generer"}
                  </Button>
                  <ReportPdfPreview
                    kind="receipts"
                    transactions={[]}
                    receipts={receipts}
                    chips={chips}
                    meta={meta}
                    companyName={selectedCompanyName}
                    generatedBy={user?.username}
                    isDisabled={receipts.length === 0}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
