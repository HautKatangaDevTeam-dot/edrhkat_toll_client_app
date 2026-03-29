"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { FilterBar } from "@/components/admin/FilterBar";
import { ResourceSection } from "@/components/admin/ResourceSection";
import { AppShell } from "@/components/layouts/AppShell";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCompactUsd } from "@/lib/number-format";
import { ApiError } from "@/lib/http";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { dashboardService } from "@/services/dashboardService";
import { monitoringService } from "@/services/monitoringService";
import { posDeviceService } from "@/services/posDeviceService";
import type { DashboardSummary, RevenueTimeseries } from "@/types/dashboard";
import type { HealthStatusResponse, MonitoringIncident } from "@/types/monitoring";
import type { PosDeviceMonitor } from "@/types/pos-device";

const DAY_OPTIONS = ["ALL", 7, 14, 30, 60, 90] as const;
const TIMESERIES_DAY_OPTIONS = [7, 14, 30, 60, 90, 120, 180];
const cardBase = "border-border/70";
const DEVICE_ALERT_THRESHOLD_MINUTES = 60;
const MONITORING_POLL_INTERVAL_MS = 30000;
type SummaryDayOption = (typeof DAY_OPTIONS)[number];

const isSummaryDayOption = (value: string): value is `${Exclude<SummaryDayOption, "ALL">}` =>
  DAY_OPTIONS.some((option) => option !== "ALL" && String(option) === value);

export default function Home() {
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken } = useAppSelector(
    (state) => state.auth
  );

  const [days, setDays] = useState<SummaryDayOption>("ALL");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeseriesDays, setTimeseriesDays] = useState(30);
  const [granularity, setGranularity] = useState<"day" | "week">("day");
  const [revenueSeries, setRevenueSeries] = useState<RevenueTimeseries | null>(null);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [staleDevices, setStaleDevices] = useState<PosDeviceMonitor[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<MonitoringIncident[]>([]);
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);

  const handleLogout = () => {
    if (accessToken) {
      dispatch(logoutUser(accessToken));
    }
  };

  const loadSummary = useCallback(
    async (token: string) => {
      const res = await dashboardService.summary(
        token,
        days === "ALL" ? null : days
      );
      setSummary(res.data);
    },
    [days]
  );

  const loadSeries = useCallback(
    async (token: string) => {
      const res = await dashboardService.revenueTimeseries(token, {
        days: timeseriesDays,
        granularity,
      });
      setRevenueSeries(res.data);
    },
    [granularity, timeseriesDays]
  );

  const fetchSummary = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      await loadSummary(accessToken);
    } catch (err) {
      const isApiError = err instanceof ApiError;
      if (isApiError && err.status === 401 && refreshToken) {
        try {
          const refreshed = await dispatch(refreshSession()).unwrap();
          if (refreshed.accessToken) {
            await loadSummary(refreshed.accessToken);
          }
          return;
        } catch {
          // fall through
        }
      }
      notify.fromError(err, "Impossible de charger le tableau de bord.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, dispatch, loadSummary, refreshToken]);

  const fetchSeries = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingSeries(true);
    try {
      await loadSeries(accessToken);
    } catch (err) {
      const isApiError = err instanceof ApiError;
      if (isApiError && err.status === 401 && refreshToken) {
        try {
          const refreshed = await dispatch(refreshSession()).unwrap();
          if (refreshed.accessToken) {
            await loadSeries(refreshed.accessToken);
          }
          return;
        } catch {
          // fall through
        }
      }
      notify.fromError(err, "Impossible de charger la courbe de revenus.");
    } finally {
      setIsLoadingSeries(false);
    }
  }, [accessToken, dispatch, loadSeries, refreshToken]);

  const fetchStaleDevices = useCallback(async () => {
    if (!accessToken) return;

    const load = async (token: string) => {
      const res = await posDeviceService.list(token, DEVICE_ALERT_THRESHOLD_MINUTES);
      setStaleDevices((res.data ?? []).filter((device) => device.stale));
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
        } catch {
          // ignore dashboard sidecar failure
        }
      }
    }
  }, [accessToken, dispatch, refreshToken]);

  const fetchMonitoring = useCallback(async () => {
    if (!accessToken) return;

    const load = async (token: string) => {
      const [incidentResult, healthResult] = await Promise.allSettled([
        monitoringService.listIncidents(token, { status: "active", limit: 4 }),
        monitoringService.health(),
      ]);
      if (incidentResult.status === "rejected") {
        throw incidentResult.reason;
      }
      if (incidentResult.status === "fulfilled") {
        setActiveIncidents(incidentResult.value.data ?? []);
      }
      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value);
      } else {
        setHealth(null);
      }
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
        } catch {
          setActiveIncidents([]);
        }
      }
    }
  }, [accessToken, dispatch, refreshToken]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);
  useEffect(() => {
    fetchStaleDevices();
  }, [fetchStaleDevices]);
  useEffect(() => {
    fetchMonitoring();
  }, [fetchMonitoring]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchMonitoring();
    }, MONITORING_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchMonitoring]);
  const numberFmt = (n?: number) => (typeof n === "number" ? n.toLocaleString() : "0");
  const amountFmt = (n?: number) => formatCompactUsd(n);

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="Tableau de bord"
        pageSubtext="Vue synthese"
        userLabel={user ? user.username : undefined}
        userMeta={user ? `${user.role} · ${user.post}` : undefined}
        onLogout={handleLogout}
      >
        <div className="flex flex-col gap-4">
          {!health && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardContent className="flex flex-col gap-2 pt-6 text-sm">
                <div className="font-medium text-rose-900 dark:text-rose-100">
                  Sante serveur en alerte
                </div>
                <div className="text-rose-800 dark:text-rose-200">
                  Le controle de sante du serveur est indisponible. Controlez l&apos;API avant ouverture du poste.
                </div>
              </CardContent>
            </Card>
          )}

          {activeIncidents.length > 0 && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardContent className="flex flex-col gap-3 pt-6 text-sm">
                <div className="flex items-center gap-2 font-medium text-rose-900 dark:text-rose-100">
                  <RefreshCw size={16} />
                  {activeIncidents.length} incident(s) serveur actif(s)
                </div>
                <div className="flex flex-col gap-2">
                  {activeIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="rounded-xl border border-rose-500/20 px-3 py-2 text-xs text-rose-800 dark:text-rose-100"
                    >
                      <div className="font-semibold">{incident.message}</div>
                      <div className="mt-1 opacity-80">
                        {incident.method ?? "?"} {incident.normalized_path ?? "n/a"} · {incident.occurrence_count} fois
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {staleDevices.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex flex-col gap-3 pt-6 text-sm">
                <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-100">
                  <RefreshCw size={16} />
                  {staleDevices.length} POS non vus recemment
                </div>
                <div className="flex flex-wrap gap-2">
                  {staleDevices.slice(0, 4).map((device) => (
                    <span
                      key={device.id}
                      className="inline-flex items-center rounded-full border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-100"
                    >
                      {device.label || "POS"} · {device.assignedPost || device.contactPhone || "Poste ?"}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <FilterBar className="md:grid-cols-[12rem_minmax(12rem,16rem)_auto] md:items-center">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Periode
              </p>
                <Select
                  value={String(days)}
                  onValueChange={(val) =>
                    setDays(val === "ALL" ? "ALL" : isSummaryDayOption(val) ? Number(val) as Exclude<SummaryDayOption, "ALL"> : "ALL")
                  }
                >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((opt) => (
                    <SelectItem key={String(opt)} value={String(opt)}>
                      {opt === "ALL" ? "Toutes" : `${opt} jours`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Donnees
              </p>
              <div className="flex h-9 items-center rounded-2xl border border-input/80 bg-background/95 px-3.5 text-sm text-foreground whitespace-nowrap">
                {summary
                  ? summary.since
                    ? `Depuis ${new Date(summary.since).toLocaleDateString()}`
                    : "Toutes les donnees"
                  : "En attente"}
              </div>
            </div>
            <div className="flex items-end justify-end">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={fetchSummary}
                disabled={isLoading}
                aria-label="Actualiser"
              >
                <RefreshCw size={16} className={cn(isLoading && "animate-spin")} />
              </Button>
            </div>
          </FilterBar>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className={cardBase}>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Sociétés
                </CardDescription>
                <CardTitle className="text-2xl font-semibold text-foreground">
                  {numberFmt(summary?.companies.total)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  Actives: {numberFmt(summary?.companies.active)}
                </span>
                <span className="inline-flex items-center rounded-full border border-rose-500/30 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300">
                  Bloquées: {numberFmt(summary?.companies.blocked)}
                </span>
              </CardContent>
            </Card>

            <Card className={cardBase}>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Équipements
                </CardDescription>
                <CardTitle className="text-2xl font-semibold text-foreground">
                  {numberFmt(summary?.devices.total)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  Actifs: {numberFmt(summary?.devices.active)}
                </span>
                <span className="inline-flex items-center rounded-full border border-border px-2 py-1 text-xs font-semibold text-foreground/80">
                  Inactifs: {numberFmt(summary?.devices.inactive)}
                </span>
              </CardContent>
            </Card>

            <Card className={cardBase}>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Transactions
                </CardDescription>
                <CardTitle className="text-2xl font-semibold text-foreground">
                  {numberFmt(summary?.transactions.total)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="text-base font-semibold text-foreground">
                  {amountFmt(summary?.transactions.totalAmount)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {summary?.transactions.byPaymentMode.slice(0, 3).map((m) => (
                    <span
                      key={m.key}
                      className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground/80"
                    >
                      {m.key}: {numberFmt(m.count)}
                    </span>
                  ))}
                  {summary &&
                    summary.transactions.byPaymentMode.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        Aucun mode disponible
                      </span>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ResourceSection
              title="Top postes"
              description="Volume et montants"
              className={cardBase}
            >
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {summary?.transactions.topPosts.length ? (
                  summary.transactions.topPosts.slice(0, 5).map((p) => (
                    <div
                      key={p.key}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="font-semibold text-foreground">
                        {p.key}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="rounded-full border border-border px-2 py-1 text-foreground/80">
                          {numberFmt(p.count)} tx
                        </span>
                        <span className="text-muted-foreground">
                          {amountFmt(p.amount)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aucune donnee poste.
                  </p>
                )}
              </CardContent>
            </ResourceSection>

            <ResourceSection
              title="Top societes"
              description="Volume et montants"
              className={cardBase}
            >
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {summary?.transactions.topCompanies.length ? (
                  summary.transactions.topCompanies.slice(0, 5).map((c) => (
                    <div
                      key={c.companyId}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="font-semibold text-foreground">
                        {c.companyName || c.companyId}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="rounded-full border border-border px-2 py-1 text-foreground/80">
                          {numberFmt(c.count)} tx
                        </span>
                        <span className="text-muted-foreground">
                          {amountFmt(c.amount)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aucune donnee societe.
                  </p>
                )}
              </CardContent>
            </ResourceSection>
          </div>

          <Card className={cardBase}>
            <CardHeader className="flex flex-col gap-3 pb-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardDescription className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Revenus
                </CardDescription>
                <CardTitle className="text-lg font-semibold">Evolution</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={String(timeseriesDays)} onValueChange={(val) => setTimeseriesDays(Number(val))}>
                  <SelectTrigger className="h-9 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMESERIES_DAY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {opt} jours
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={granularity} onValueChange={(val) => setGranularity(val as "day" | "week")}>
                  <SelectTrigger className="h-9 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Jour</SelectItem>
                    <SelectItem value="week">Semaine</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={fetchSeries}
                  disabled={isLoadingSeries}
                  aria-label="Actualiser la série"
                >
                  <RefreshCw size={16} className={cn(isLoadingSeries && "animate-spin")} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {isLoadingSeries ? (
                <div className="text-sm text-muted-foreground">Chargement des donnees...</div>
              ) : revenueSeries?.series.length ? (
                <div className="flex flex-col gap-2">
                  {revenueSeries.series.slice(0, 10).map((point) => (
                    <div
                      key={point.period}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div className="font-medium text-foreground">{point.period}</div>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="text-muted-foreground">
                          {numberFmt(point.totalCount)} tx
                        </span>
                        <span className="rounded-full border border-border px-2 py-1 text-foreground/80">
                          {amountFmt(point.totalAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Aucune donnee de revenus.
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
