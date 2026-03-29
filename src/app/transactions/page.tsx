"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { DateFilterField } from "@/components/admin/DateFilterField";
import { FilterBar } from "@/components/admin/FilterBar";
import { ResourceSection } from "@/components/admin/ResourceSection";
import { AppShell } from "@/components/layouts/AppShell";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatCompactNumber } from "@/lib/number-format";
import { cn } from "@/lib/utils";
import { transactionService } from "@/services/transactionService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import {
  TOLL_PAYMENT_MODES,
  type TollPaymentMode,
  type TollTransaction,
} from "@/types/transaction";

const POSTS = [
  "KAMPEMBA",
  "MIKAS",
  "DITENGWA",
  "MENDA",
  "MULUNGWISI",
  "LWAMBO",
  "LWISHA CENTRE",
  "EXCELLENT",
  "RTE SHEMAF",
  "KABOLA",
  "KYANDWE",
  "SASE",
  "DIRECTION_GENERALE",
];

export default function TransactionsPage() {
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken } = useAppSelector(
    (state) => state.auth
  );

  const [transactions, setTransactions] = useState<TollTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [postId, setPostId] = useState("ALL");
  const [paymentMode, setPaymentMode] = useState<TollPaymentMode | "ALL">(
    "ALL"
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const userMeta = useMemo(() => {
    if (!user) return undefined;
    return `${user.role} · ${user.post}`;
  }, [user]);

  const handleLogout = () => {
    if (accessToken) dispatch(logoutUser(accessToken));
  };

  const fetchTransactions = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const load = async (token: string) => {
      const res = await transactionService.list(token, {
        page,
        pageSize,
        search: search || undefined,
        post_id: postId === "ALL" ? undefined : postId,
        payment_mode: paymentMode === "ALL" ? undefined : paymentMode,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setTransactions(res.data ?? []);
      setTotal(res.total ?? 0);
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
        } catch {
          // ignore
        }
      }
      notify.fromError(err, "Impossible de charger les transactions.");
    } finally {
      setIsLoading(false);
    }
  }, [
    accessToken,
    dateFrom,
    dateTo,
    dispatch,
    page,
    pageSize,
    paymentMode,
    postId,
    refreshToken,
    search,
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatAmount = (value: number | null | undefined) =>
    formatCompactNumber(value);

  const paymentBadge = (mode: TollPaymentMode) => {
    const styles: Record<TollPaymentMode, string> = {
      CASH: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-200",
      CARD: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-200",
      OTHER: "bg-muted text-muted-foreground ring-border",
    };
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset",
          styles[mode]
        )}
      >
        {mode}
      </span>
    );
  };

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="Transactions"
        pageSubtext="Journal des peages"
        userLabel={user ? user.username : undefined}
        userMeta={userMeta}
        onLogout={handleLogout}
      >
        <div className="flex min-h-full w-full flex-col gap-4">
          <ResourceSection
            title="Journal des transactions"
            description={`${total} entrees · page ${page}/${totalPages}`}
            filters={
              <FilterBar className="md:grid-cols-[minmax(0,20rem)_10rem_10rem_10rem_10rem] md:items-end">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Recherche
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Plaque, societe, transporteur..."
                      className="h-9 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Poste
                  </Label>
                  <Select
                    value={postId}
                    onValueChange={(val) => {
                      setPostId(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Tous les postes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous</SelectItem>
                      {POSTS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Mode
                  </Label>
                  <Select
                    value={paymentMode}
                    onValueChange={(val) => {
                      setPaymentMode(val as TollPaymentMode | "ALL");
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Tous les modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous</SelectItem>
                      {TOLL_PAYMENT_MODES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Date debut
                  </Label>
                  <DateFilterField
                    value={dateFrom}
                    onChange={(value) => {
                      setDateFrom(value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Date fin
                  </Label>
                  <DateFilterField
                    value={dateTo}
                    onChange={(value) => {
                      setDateTo(value);
                      setPage(1);
                    }}
                  />
                </div>
              </FilterBar>
            }
          >
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-16 text-center text-muted-foreground">
                  Chargement...
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  Aucune transaction trouvee.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Poste</TableHead>
                        <TableHead>Societe</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Vehicule</TableHead>
                        <TableHead>Trajet</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Override</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t) => {
                        const primaryAmount = t.amountPaid ?? t.amountDue ?? t.amountUsd;
                        const billedAmount = t.amountDue ?? t.amountUsd;
                        const paidAmount = t.amountPaid ?? t.amountUsd;
                        const companyLabel =
                          t.companyName ??
                          t.carrierName ??
                          "Nom non renseigne";
                        const dateLabel = t.transactionDate ?? t.createdAt;
                        const routeLabel =
                          t.provenance || t.destination
                            ? `${t.provenance ?? "Origine inconnue"} → ${t.destination ?? "Destination inconnue"}`
                            : "Trajet non renseigne";

                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs">
                              {dateLabel
                                ? new Date(dateLabel).toLocaleString()
                                : "—"}
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {t.postId}
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {companyLabel}
                              <p className="text-[10px] text-muted-foreground">
                                {t.companyCode ??
                                  (t.companyId ? "Societe liee" : "Individuel")}
                              </p>
                            </TableCell>
                            <TableCell className="font-bold text-foreground">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold",
                                  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                                )}
                              >
                                {formatAmount(primaryAmount)} USD
                              </span>
                              <p className="text-[10px] text-muted-foreground">
                                Facture: {formatAmount(billedAmount)} / Paye:{" "}
                                {formatAmount(paidAmount)}
                              </p>
                            </TableCell>
                            <TableCell>{paymentBadge(t.paymentMode)}</TableCell>
                            <TableCell className="text-foreground/80">
                              {t.vehiclePlate ?? "Non renseigne"}
                              <p className="text-[10px] text-muted-foreground">
                                {t.taxType ?? "Type inconnu"}
                              </p>
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {routeLabel}
                              <p className="text-[10px] text-muted-foreground">
                                {t.carrierName ?? "Transporteur non renseigne"}
                              </p>
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {t.agentName ?? "Agent non renseigne"}
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold",
                                  t.overrideUsed || t.exceptionalIssue
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-200"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {t.overrideUsed
                                  ? "Override"
                                  : t.exceptionalIssue
                                    ? "Exception"
                                    : "Non"}
                              </span>
                              {t.exceptionReason ? (
                                <p className="text-[10px] text-muted-foreground">
                                  {t.exceptionReason}
                                </p>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
              <span>
                Page {page} / {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Precedent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </ResourceSection>
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
