"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { FilterBar } from "@/components/admin/FilterBar";
import { ResourceSection } from "@/components/admin/ResourceSection";
import { AppShell } from "@/components/layouts/AppShell";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/http";
import { formatCompactUsd } from "@/lib/number-format";
import { companyService } from "@/services/companyService";
import { receiptService } from "@/services/receiptService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import type {
  ReceiptBatch,
  ReceiptFinancialMode,
  ReceiptSummary,
  ReceiptTaxType,
} from "@/types/receipt";

const PAGE_SIZE = 10;

const amountFmt = (value: number) => formatCompactUsd(value);
const dateTimeFmt = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function ReceiptBatchesPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, accessToken, refreshToken } = useAppSelector(
    (state) => state.auth
  );

  const [batches, setBatches] = useState<ReceiptBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [taxType, setTaxType] = useState<ReceiptTaxType | "ALL">("ALL");
  const [financialMode, setFinancialMode] = useState<
    ReceiptFinancialMode | "ALL"
  >("ALL");
  const [companyOptions, setCompanyOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<ReceiptSummary | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleLogout = () => {
    if (accessToken) {
      dispatch(logoutUser(accessToken));
    }
  };

  const fetchBatches = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);

    const load = async (token: string) => {
      const result = await receiptService.listBatches(token, {
        search: search || undefined,
        company_id: companyId || undefined,
        tax_type: taxType === "ALL" ? undefined : taxType,
        financial_mode: financialMode === "ALL" ? undefined : financialMode,
        page,
        pageSize: PAGE_SIZE,
      });
      setBatches(result.data ?? []);
      setTotal(result.total ?? 0);
      setSummary(result.summary ?? null);
    };

    try {
      await load(accessToken);
    } catch (err) {
      const isApiError = err instanceof ApiError;
      if (isApiError && err.status === 401 && refreshToken) {
        try {
          const refreshed = await dispatch(refreshSession()).unwrap();
          if (refreshed.accessToken) {
            await load(refreshed.accessToken);
          }
          return;
        } catch (refreshErr) {
          notify.fromError(refreshErr, "Session expiree.");
          return;
        }
      }
      notify.fromError(err, "Impossible de charger les lots de recus.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, companyId, dispatch, financialMode, page, refreshToken, search, taxType]);

  const fetchCompanies = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await companyService.list(accessToken, { page: 1, pageSize: 100 });
      setCompanyOptions(
        (result.data ?? [])
          .map((company) => ({ id: company.id, name: company.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch {
      // keep batch page functional even if company list fails
    }
  }, [accessToken]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="Lots de recus"
        pageSubtext="Suivi des batches, codes de verification et recus emis"
        userLabel={user?.username}
        userMeta={user ? `${user.role} · ${user.post}` : undefined}
        onLogout={handleLogout}
      >
        <div className="flex min-h-full flex-col gap-4">
          {summary ? (
            <div className="grid gap-3 md:grid-cols-4">
              <Card className="border-border/70">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Lots
                  </p>
                  <p className="text-2xl font-semibold text-foreground">
                    {summary.batchCount}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Recus emis
                  </p>
                  <p className="text-2xl font-semibold text-foreground">
                    {summary.issuedCount}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Theorique
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {amountFmt(summary.totalTheoreticalUsd)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Exonere
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {amountFmt(summary.totalExoneratedUsd)}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <ResourceSection
            title="Lots emis"
            description="Suivez les batches entreprise, leur code de verification et leurs montants."
            filters={
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/receipt-lookup">Recherche de recu</Link>
                  </Button>
                </div>
                <FilterBar className="md:grid-cols-[minmax(0,22rem)_12rem_10rem_12rem] md:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Societe, code batch, reference..."
                    className="h-9 pl-10"
                  />
                </div>

                <Select
                  value={companyId || "ALL"}
                  onValueChange={(value) => {
                    setCompanyId(value === "ALL" ? "" : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Toutes societes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes societes</SelectItem>
                    {companyOptions.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={taxType}
                  onValueChange={(value) => {
                    setTaxType(value as ReceiptTaxType | "ALL");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Taxe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous types</SelectItem>
                    <SelectItem value="TRANSPORT">TRANSPORT</SelectItem>
                    <SelectItem value="TRANSFERT">TRANSFERT</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={financialMode}
                  onValueChange={(value) => {
                    setFinancialMode(value as ReceiptFinancialMode | "ALL");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Mode financier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous modes</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="EXONERATED">Exonere</SelectItem>
                  </SelectContent>
                </Select>
                </FilterBar>
              </div>
            }
          >
            <CardContent className="p-0">
              {isLoading ? (
                <div className="px-6 py-14 text-sm text-muted-foreground">
                  Chargement des lots...
                </div>
              ) : batches.length === 0 ? (
                <div className="px-6 py-14 text-sm text-muted-foreground">
                  Aucun lot trouve.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Societe</TableHead>
                          <TableHead>Code batch</TableHead>
                          <TableHead>Cree le</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Quantite</TableHead>
                          <TableHead>Theorique</TableHead>
                          <TableHead>Paye</TableHead>
                          <TableHead>Exonere</TableHead>
                          <TableHead>Progression</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batches.map((batch) => (
                          <TableRow
                            key={batch.id}
                            className="cursor-pointer"
                            onClick={() => router.push(`/receipt-batches/${batch.id}`)}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-semibold text-foreground">
                                  {batch.companyName ?? "Societe"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {batch.companyCode ?? batch.paymentReference ?? "Sans reference"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-foreground">
                              {batch.batchShortCode}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {dateTimeFmt(batch.createdAt)}
                            </TableCell>
                            <TableCell>{batch.taxType}</TableCell>
                            <TableCell>{batch.financialMode}</TableCell>
                            <TableCell>{batch.quantity}</TableCell>
                            <TableCell>{amountFmt(batch.totalTheoreticalUsd)}</TableCell>
                            <TableCell>{amountFmt(batch.totalPaidUsd)}</TableCell>
                            <TableCell>{amountFmt(batch.totalExoneratedUsd)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {batch.consumedCount}/{batch.issuedCount} consommes
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
                    <span>
                      Page {page} / {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        Precedent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </ResourceSection>
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
