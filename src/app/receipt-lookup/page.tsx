"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/layouts/AppShell";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/http";
import { receiptService } from "@/services/receiptService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import type { Receipt, ReceiptEvent } from "@/types/receipt";

const amountFmt = (value: number) =>
  `${value.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD`;

function ReceiptLookupContent() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { user, accessToken, refreshToken } = useAppSelector(
    (state) => state.auth
  );

  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState<Receipt | null>(null);
  const [lookupEvents, setLookupEvents] = useState<ReceiptEvent[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const initialCode = searchParams.get("code")?.trim().toUpperCase() ?? "";

  const handleLogout = () => {
    if (accessToken) {
      dispatch(logoutUser(accessToken));
    }
  };

  const handleLookupFromCode = useCallback(
    async (code: string) => {
      if (!accessToken) return;
      setLookupLoading(true);

      const load = async (token: string) => {
        const result = await receiptService.lookup(token, code);
        setLookupResult(result.receipt);
        setLookupEvents(result.events ?? []);
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
        setLookupResult(null);
        setLookupEvents([]);
        notify.fromError(err, "Impossible de retrouver ce recu.");
      } finally {
        setLookupLoading(false);
      }
    },
    [accessToken, dispatch, refreshToken]
  );

  const handleLookup = async () => {
    if (!lookupCode.trim()) return;
    await handleLookupFromCode(lookupCode.trim().toUpperCase());
  };

  useEffect(() => {
    if (!initialCode) return;
    setLookupCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (!accessToken || !initialCode) return;
    setLookupCode(initialCode);
    void handleLookupFromCode(initialCode);
  }, [accessToken, handleLookupFromCode, initialCode]);

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="Recherche de recu"
        pageSubtext="Verification d'un recu individuel par code court"
        userLabel={user?.username}
        userMeta={user ? `${user.role} · ${user.post}` : undefined}
        onLogout={handleLogout}
      >
        <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center py-6">
          <Card className="w-full border-border/70">
            <CardContent className="space-y-4 p-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold">Recherche de recu</h2>
                <p className="text-sm text-muted-foreground">
                  Recherchez un recu par son code court pour verifier son statut.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex-1">
                  <Label className="text-xs normal-case tracking-normal">
                    Code du recu
                  </Label>
                  <Input
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                    placeholder="ABCD-1234"
                    className="mt-2 h-10"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    className="h-10"
                    onClick={handleLookup}
                    disabled={lookupLoading || !lookupCode.trim()}
                  >
                    Rechercher
                  </Button>
                </div>
              </div>

              {lookupResult ? (
                <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Code
                      </p>
                      <p className="mt-1 font-semibold text-foreground">
                        {lookupResult.shortCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Statut
                      </p>
                      <p className="mt-1 font-semibold text-foreground">
                        {lookupResult.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Societe
                      </p>
                      <p className="mt-1 font-semibold text-foreground">
                        {lookupResult.companyName ?? "Solo / exception"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Taxe
                      </p>
                      <p className="mt-1">{lookupResult.taxType}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Mode financier
                      </p>
                      <p className="mt-1">{lookupResult.financialMode}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Valeur
                      </p>
                      <p className="mt-1">{amountFmt(lookupResult.tariffAmountUsd)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Historique
                    </p>
                    {lookupEvents.length ? (
                      <div className="space-y-2">
                        {lookupEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-semibold text-foreground">
                                {event.eventType}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {event.actorUsername ?? "Systeme"}
                                {event.actorRole ? ` · ${event.actorRole}` : ""}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucun evenement disponible.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}

export default function ReceiptLookupPage() {
  return (
    <Suspense fallback={null}>
      <ReceiptLookupContent />
    </Suspense>
  );
}
