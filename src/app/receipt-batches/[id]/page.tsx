"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";

import { AppModal } from "@/components/admin/AppModal";
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
import { formatCompactUsd } from "@/lib/number-format";
import { companyService } from "@/services/companyService";
import { receiptService } from "@/services/receiptService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import type {
  Receipt,
  ReceiptBatch,
  ReceiptBatchCorrection,
  ReceiptBatchCorrectionMode,
  ReceiptBatchConsumptionEvent,
  ReceiptStatus,
} from "@/types/receipt";

const PAGE_SIZE = 20;

const amountFmt = (value: number) => formatCompactUsd(value);
const dateTimeFmt = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function ReceiptBatchDetailPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
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
  const [corrections, setCorrections] = useState<ReceiptBatchCorrection[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [reason, setReason] = useState("");
  const [companyOptions, setCompanyOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isAdmin = user?.role === "ADMIN_SYSTEME";

  const availableCorrectionMode = useMemo<ReceiptBatchCorrectionMode | null>(() => {
    if (!batch) return null;
    if (batch.remainingCount <= 0) return null;
    if (batch.consumedCount === 0) return "TRANSFER_ALL";
    return "MOVE_REMAINING";
  }, [batch]);

  const correctionSummary = useMemo(() => {
    if (!batch || !availableCorrectionMode) return null;
    if (availableCorrectionMode === "TRANSFER_ALL") {
      return "Le lot entier sera réaffecté à la bonne société. Les codes de reçus et le code batch restent identiques.";
    }
    return "Seuls les reçus encore ISSUED seront déplacés dans un nouveau lot pour la bonne société. L'historique déjà consommé reste sur le lot source.";
  }, [availableCorrectionMode, batch]);

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
      setCorrections(batchResult.corrections ?? []);
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

  const fetchCompanies = useCallback(async () => {
    if (!accessToken || !isAdmin) return;
    try {
      const result = await companyService.list(accessToken, { page: 1, pageSize: 100 });
      setCompanyOptions(
        (result.data ?? [])
          .map((company) => ({ id: company.id, name: company.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch {
      // keep the detail page usable even if company lookup fails
    }
  }, [accessToken, isAdmin]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (!isCorrectionOpen) {
      setTargetCompanyId("");
      setReason("");
    }
  }, [isCorrectionOpen]);

  const canSubmitCorrection =
    Boolean(batch) &&
    Boolean(availableCorrectionMode) &&
    Boolean(targetCompanyId) &&
    targetCompanyId !== batch?.companyId &&
    reason.trim().length >= 8;

  async function handleBatchCorrection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !batch || !availableCorrectionMode || !canSubmitCorrection) {
      return;
    }

    setIsCorrecting(true);
    try {
      const result = await receiptService.correctBatchCompany(accessToken, batch.id, {
        target_company_id: targetCompanyId,
        mode: availableCorrectionMode,
        reason: reason.trim(),
      });
      notify.success(
        result.targetBatch
          ? `Correction appliquée. Nouveau lot créé: ${result.targetBatch.batchShortCode}.`
          : "Correction appliquée sur le lot."
      );
      setIsCorrectionOpen(false);
      await fetchBatch();
    } catch (err) {
      notify.fromError(err, "Impossible de corriger la société du lot.");
    } finally {
      setIsCorrecting(false);
    }
  }

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
            <div className="flex items-center gap-2">
              {batch ? (
                <div className="text-xs text-muted-foreground">
                  {batch.taxType} · {batch.financialMode}
                </div>
              ) : null}
              {isAdmin && batch && availableCorrectionMode ? (
                <AppModal
                  open={isCorrectionOpen}
                  onOpenChange={setIsCorrectionOpen}
                  title="Corriger la société du lot"
                  description="Action réservée à l'administration. Cette correction garde les flux existants intacts et journalise l'opération."
                  trigger={
                    <Button size="sm" variant="outline">
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Corriger société
                    </Button>
                  }
                  footer={
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsCorrectionOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        form="correct-batch-company-form"
                        type="submit"
                        disabled={!canSubmitCorrection || isCorrecting}
                      >
                        {isCorrecting ? "Application..." : "Appliquer la correction"}
                      </Button>
                    </>
                  }
                >
                  <form
                    id="correct-batch-company-form"
                    className="space-y-4"
                    onSubmit={handleBatchCorrection}
                  >
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Mode: {availableCorrectionMode === "TRANSFER_ALL" ? "Transfert complet" : "Déplacement du reliquat"}
                      </p>
                      <p className="mt-1">{correctionSummary}</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-border/70 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                          Quantité totale
                        </div>
                        <div className="mt-1 font-semibold">{batch.quantity}</div>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                          Consommés
                        </div>
                        <div className="mt-1 font-semibold">{batch.consumedCount}</div>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                          Restants
                        </div>
                        <div className="mt-1 font-semibold">{batch.remainingCount}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Nouvelle société</Label>
                      <Select value={targetCompanyId} onValueChange={setTargetCompanyId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir la société correcte" />
                        </SelectTrigger>
                        <SelectContent>
                          {companyOptions
                            .filter((company) => company.id !== batch.companyId)
                            .map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="correction-reason">Motif</Label>
                      <textarea
                        id="correction-reason"
                        required
                        minLength={8}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Expliquez pourquoi le lot a été émis sur la mauvaise société."
                      />
                    </div>
                  </form>
                </AppModal>
              ) : null}
            </div>
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
                    Restants
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {batch.remainingCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Cree le
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {dateTimeFmt(batch.createdAt)}
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

          {corrections.length > 0 ? (
            <ResourceSection
              title="Corrections du lot"
              description="Historique des réaffectations administratives effectuées sur ce lot."
            >
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>De</TableHead>
                        <TableHead>Vers</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead>Motif</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {corrections.map((correction) => (
                        <TableRow key={correction.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(correction.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>{correction.mode}</TableCell>
                          <TableCell>{correction.sourceCompanyName ?? correction.sourceCompanyCode}</TableCell>
                          <TableCell>{correction.targetCompanyName ?? correction.targetCompanyCode}</TableCell>
                          <TableCell>{correction.movedQuantity}</TableCell>
                          <TableCell className="max-w-sm whitespace-normal text-sm text-muted-foreground">
                            {correction.reason}
                          </TableCell>
                          <TableCell>{correction.actorUsername ?? "Système"}</TableCell>
                          <TableCell className="text-right">
                            {correction.targetBatchId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/receipt-batches/${correction.targetBatchId}`)}
                              >
                                Voir lot cible
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </ResourceSection>
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
