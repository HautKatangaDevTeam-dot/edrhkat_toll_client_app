"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { FilterBar } from "@/components/admin/FilterBar";
import { ResourceSection } from "@/components/admin/ResourceSection";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/http";
import { receiptService } from "@/services/receiptService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import type {
  Receipt,
  ReceiptBatch,
  ReceiptBatchConsumptionEvent,
  ReceiptStatus,
} from "@/types/receipt";

const PAGE_SIZE = 20;

const amountFmt = (value: number) =>
  `${value.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD`;

export default function ReceiptBatchDetailPage() {
  const params = useParams<{ id?: string }>();
  const batchId = params?.id ?? "";
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken } = useAppSelector(
    (state) => state.auth
  );

  const [batch, setBatch] = useState<ReceiptBatch | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [batchEvents, setBatchEvents] = useState<ReceiptBatchConsumptionEvent[]>(
    []
  );
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleLogout = () => {
    if (accessToken) {
      dispatch(logoutUser(accessToken));
    }
  };

  const fetchBatch = useCallback(async () => {
    if (!accessToken || !batchId) return;
    setIsLoading(true);

    const load = async (token: string) => {
      const [batchResult, receiptsResult] = await Promise.all([
        receiptService.getBatch(token, batchId),
        receiptService.listBatchReceipts(token, batchId, {
          status: statusFilter === "ALL" ? undefined : statusFilter,
          page,
          pageSize: PAGE_SIZE,
        }),
      ]);

      setBatch(batchResult.batch);
      setBatchEvents(batchResult.events ?? []);
      setReceipts(receiptsResult.data ?? []);
      setTotal(receiptsResult.total ?? 0);
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
      notify.fromError(err, "Impossible de charger le detail du lot.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, batchId, dispatch, page, refreshToken, statusFilter]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="Detail du lot"
        pageSubtext={batch?.companyName ?? "Recus entreprise"}
        userLabel={user?.username}
        userMeta={user ? `${user.role} · ${user.post}` : undefined}
        onLogout={handleLogout}
      >
        <div className="flex min-h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link href="/receipt-batches">Retour aux lots</Link>
            </Button>
            {batch ? (
              <div className="text-xs text-muted-foreground">
                {batch.taxType} · {batch.financialMode}
              </div>
            ) : null}
          </div>

          {batch ? (
            <Card className="border-border/70">
              <CardContent className="grid gap-4 p-4 md:grid-cols-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Code batch
                  </p>
                  <p className="mt-1 font-mono font-semibold text-foreground">
                    {batch.batchShortCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Societe
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {batch.companyName}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Quantite
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {batch.quantity}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Theorique
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {amountFmt(batch.totalTheoreticalUsd)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Exonere
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {amountFmt(batch.totalExoneratedUsd)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <ResourceSection
            title="Recus du lot"
            description="Consultez les recus emis, leur statut et leur consommation."
            filters={
              <FilterBar className="md:grid-cols-[12rem] md:items-center">
                <div className="space-y-2">
                  <Label className="text-xs normal-case tracking-normal">
                    Statut
                  </Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value as ReceiptStatus | "ALL");
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Tous statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous statuts</SelectItem>
                      <SelectItem value="ISSUED">ISSUED</SelectItem>
                      <SelectItem value="CONSUMED">CONSUMED</SelectItem>
                      <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                      <SelectItem value="VOID">VOID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FilterBar>
            }
          >
            <CardContent className="p-0">
              {isLoading ? (
                <div className="px-6 py-14 text-sm text-muted-foreground">
                  Chargement des recus...
                </div>
              ) : receipts.length === 0 ? (
                <div className="px-6 py-14 text-sm text-muted-foreground">
                  Aucun recu trouve dans ce lot.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Sequence</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Tarif</TableHead>
                          <TableHead>Paye</TableHead>
                          <TableHead>Exonere</TableHead>
                          <TableHead>Consomme le</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receipts.map((receipt) => (
                          <TableRow key={receipt.id}>
                            <TableCell className="font-semibold text-foreground">
                              <Link
                                href={`/receipt-lookup?code=${encodeURIComponent(receipt.shortCode)}`}
                                className="font-semibold text-foreground underline-offset-4 hover:underline"
                              >
                                {receipt.shortCode}
                              </Link>
                            </TableCell>
                            <TableCell>{receipt.sequenceNo ?? "—"}</TableCell>
                            <TableCell>{receipt.status}</TableCell>
                            <TableCell>{receipt.taxType}</TableCell>
                            <TableCell>{amountFmt(receipt.tariffAmountUsd)}</TableCell>
                            <TableCell>{amountFmt(receipt.paidAmountUsd)}</TableCell>
                            <TableCell>{amountFmt(receipt.exoneratedAmountUsd)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {receipt.consumedAt
                                ? new Date(receipt.consumedAt).toLocaleString()
                                : "Non consomme"}
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

          {batchEvents.length > 0 ? (
            <ResourceSection
              title="Consommations du lot"
              description="Historique des deductions effectuees aux postes, y compris les synchronisations hors ligne."
            >
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Quantite</TableHead>
                        <TableHead>Poste</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Appareil</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(event.consumedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {event.quantityConsumed}
                          </TableCell>
                          <TableCell>{event.postId ?? "—"}</TableCell>
                          <TableCell>
                            {event.actorUsername ?? event.actorRole ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {event.sourceDeviceId ?? "—"}
                          </TableCell>
                          <TableCell className="uppercase text-xs text-muted-foreground">
                            {event.source ?? "manual"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </ResourceSection>
          ) : null}

        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
