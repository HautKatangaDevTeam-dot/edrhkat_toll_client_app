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

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

const connectionChannelLabel = (clientType: string) =>
  clientType === "mobile" ? "POS" : "Web";

const connectionSupportLabel = (clientType: string) =>
  clientType === "mobile" ? "Terminal terrain" : "Ordinateur";

const connectionAccessPointLabel = (
  clientType: string,
  userPost: string
) => (clientType === "mobile" ? userPost : "Console web");

export default function Home() {
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken } = useAppSelector(
    (state) => state.auth
  );
  const isFinancialSupervisor = user?.role === "SUPERVISEUR";

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
  const [activeTab, setActiveTab] = useState<"overview" | "connections" | "supervision">(
    "overview"
  );

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
    if (isFinancialSupervisor) {
      setStaleDevices([]);
      return;
    }
    fetchStaleDevices();
  }, [fetchStaleDevices, isFinancialSupervisor]);
  useEffect(() => {
    if (isFinancialSupervisor) {
      setActiveIncidents([]);
      setHealth(null);
      return;
    }
    fetchMonitoring();
  }, [fetchMonitoring, isFinancialSupervisor]);
  useEffect(() => {
    if (isFinancialSupervisor) return;
    const timer = window.setInterval(() => {
      void fetchMonitoring();
    }, MONITORING_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchMonitoring, isFinancialSupervisor]);
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Tableau de bord opérationnel
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Lecture rapide des volumes, revenus et signaux de terrain sur la période sélectionnée.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button
                variant={activeTab === "overview" ? "default" : "outline"}
                className="h-9 rounded-full px-4"
                onClick={() => setActiveTab("overview")}
              >
                Vue synthèse
              </Button>
              {!isFinancialSupervisor && (
                <>
                  <Button
                    variant={activeTab === "supervision" ? "default" : "outline"}
                    className="h-9 rounded-full px-4"
                    onClick={() => setActiveTab("supervision")}
                  >
                    Supervision
                  </Button>
                  <Button
                    variant={activeTab === "connections" ? "default" : "outline"}
                    className="h-9 rounded-full px-4"
                    onClick={() => setActiveTab("connections")}
                  >
                    Dernières connexions
                  </Button>
                </>
              )}
            </div>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-4">
              <Card className={cardBase}>
                <CardContent className="pt-6">
                  <FilterBar className="md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto] md:items-end">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Période
                        </p>
                        <Select
                          value={String(days)}
                          onValueChange={(val) =>
                            setDays(
                              val === "ALL"
                                ? "ALL"
                                : isSummaryDayOption(val)
                                  ? (Number(val) as Exclude<SummaryDayOption, "ALL">)
                                  : "ALL"
                            )
                          }
                        >
                          <SelectTrigger className="h-10">
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
                          Données
                        </p>
                        <div className="flex h-10 items-center rounded-2xl border border-input/80 bg-background/95 px-3.5 text-sm text-foreground">
                          {summary
                            ? summary.since
                              ? `Depuis ${new Date(summary.since).toLocaleDateString()}`
                              : "Toutes les données"
                            : "En attente"}
                        </div>
                      </div>
                      <div className="flex items-end justify-end">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={fetchSummary}
                          disabled={isLoading}
                          aria-label="Actualiser"
                        >
                          <RefreshCw
                            size={16}
                            className={cn(isLoading && "animate-spin")}
                          />
                        </Button>
                      </div>
                    </FilterBar>
                </CardContent>
              </Card>

              <div className={cn("grid gap-4 sm:grid-cols-2", isFinancialSupervisor ? "xl:grid-cols-2" : "xl:grid-cols-4")}>
                {!isFinancialSupervisor && (
                  <>
                    <Card className={cardBase}>
                      <CardHeader className="pb-3">
                        <CardDescription className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Sociétés
                        </CardDescription>
                        <CardTitle className="text-3xl font-semibold text-foreground">
                          {numberFmt(summary?.companies.total)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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
                        <CardTitle className="text-3xl font-semibold text-foreground">
                          {numberFmt(summary?.devices.total)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                          Actifs: {numberFmt(summary?.devices.active)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-border px-2 py-1 text-xs font-semibold text-foreground/80">
                          Inactifs: {numberFmt(summary?.devices.inactive)}
                        </span>
                      </CardContent>
                    </Card>
                  </>
                )}
                <Card className={cardBase}>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Transactions
                    </CardDescription>
                    <CardTitle className="text-3xl font-semibold text-foreground">
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

                {!isFinancialSupervisor && (
                  <Card className={cardBase}>
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Vigilance terrain
                      </CardDescription>
                      <CardTitle className="text-3xl font-semibold text-foreground">
                        {numberFmt(staleDevices.length + activeIncidents.length)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span>POS silencieux</span>
                        <span className="font-semibold text-foreground">
                          {numberFmt(staleDevices.length)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span>Incidents actifs</span>
                        <span className="font-semibold text-foreground">
                          {numberFmt(activeIncidents.length)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card className={cardBase}>
                <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <CardDescription className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Revenus
                    </CardDescription>
                    <CardTitle className="text-xl font-semibold">
                      Évolution principale
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Lecture consolidée des montants et volumes sur la période choisie.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={String(timeseriesDays)}
                      onValueChange={(val) => setTimeseriesDays(Number(val))}
                    >
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

                    <Select
                      value={granularity}
                      onValueChange={(val) => setGranularity(val as "day" | "week")}
                    >
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
                      <RefreshCw
                        size={16}
                        className={cn(isLoadingSeries && "animate-spin")}
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {isLoadingSeries ? (
                    <div className="text-sm text-muted-foreground">
                      Chargement des données...
                    </div>
                  ) : revenueSeries?.series.length ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {revenueSeries.series.slice(0, 10).map((point) => (
                        <div
                          key={point.period}
                          className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                        >
                          <div>
                            <div className="font-semibold text-foreground">
                              {point.period}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {numberFmt(point.totalCount)} transaction(s)
                            </div>
                          </div>
                          <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/80">
                            {amountFmt(point.totalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Aucune donnée de revenus.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className={cn("grid gap-4", isFinancialSupervisor ? "xl:grid-cols-1" : "xl:grid-cols-2")}>
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
                        Aucune donnée poste.
                      </p>
                    )}
                  </CardContent>
                </ResourceSection>

                {!isFinancialSupervisor && (
                  <ResourceSection
                    title="Top sociétés"
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
                          Aucune donnée société.
                        </p>
                      )}
                    </CardContent>
                  </ResourceSection>
                )}
              </div>
            </div>
          )}

          {!isFinancialSupervisor && activeTab === "connections" && (
            <ResourceSection
              title="Dernières connexions"
              description="10 dernières sessions ouvertes sur le système"
              className={cardBase}
            >
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {summary?.recentConnections.length ? (
                  summary.recentConnections.map((item) => (
                    <div
                      key={item.sessionId}
                      className="rounded-lg border border-border px-3 py-3"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground">
                            {item.username}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.role} · Affectation utilisateur: {item.userPost}
                          </div>
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">
                          {formatDateTime(item.connectedAt)}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-foreground/80">
                          Canal: {connectionChannelLabel(item.clientType)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-foreground/80">
                          Support: {connectionSupportLabel(item.clientType)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-foreground/80">
                          Point d&apos;accès:{" "}
                          {connectionAccessPointLabel(item.clientType, item.userPost)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aucune connexion récente à afficher.
                  </p>
                )}
              </CardContent>
            </ResourceSection>
          )}

          {!isFinancialSupervisor && activeTab === "supervision" && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Card className={cn(cardBase, !health && "border-rose-500/30 bg-rose-500/5")}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Santé plateforme
                  </CardDescription>
                  <CardTitle className="text-lg font-semibold">
                    {health ? "API disponible" : "Sante serveur en alerte"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
                    <span>État actuel</span>
                    <span className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-semibold",
                      health
                        ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                        : "border-rose-500/30 text-rose-700 dark:text-rose-300"
                    )}>
                      {health ? "Stable" : "Indisponible"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
                    <span>Incidents actifs</span>
                    <span className="font-semibold text-foreground">
                      {numberFmt(activeIncidents.length)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
                    <span>POS silencieux</span>
                    <span className="font-semibold text-foreground">
                      {numberFmt(staleDevices.length)}
                    </span>
                  </div>
                  {!health && (
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      Le contrôle de santé du serveur est indisponible. Contrôlez l&apos;API avant ouverture du poste.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <ResourceSection
                  title="Incidents serveur"
                  description="Erreurs actives détectées sur l'API"
                  className={cn(cardBase, activeIncidents.length > 0 && "border-rose-500/30")}
                >
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {activeIncidents.length > 0 ? (
                      activeIncidents.map((incident) => (
                        <div
                          key={incident.id}
                          className="rounded-xl border border-rose-500/20 px-3 py-3 text-xs"
                        >
                          <div className="font-semibold text-foreground">{incident.message}</div>
                          <div className="mt-1 text-muted-foreground">
                            {incident.method ?? "?"} {incident.normalized_path ?? "n/a"} · {incident.occurrence_count} fois
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Aucun incident actif à afficher.
                      </p>
                    )}
                  </CardContent>
                </ResourceSection>

                <ResourceSection
                  title="POS non vus récemment"
                  description="Terminaux sans heartbeat récent"
                  className={cn(cardBase, staleDevices.length > 0 && "border-amber-500/30")}
                >
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {staleDevices.length > 0 ? (
                      staleDevices.map((device) => (
                        <div
                          key={device.id}
                          className="flex flex-col gap-1 rounded-xl border border-amber-500/20 px-3 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="font-semibold text-foreground">
                            {device.label || "POS"}
                          </div>
                          <div className="text-muted-foreground">
                            {device.assignedPost || device.contactPhone || "Poste ?"}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Aucun POS silencieux sur la fenêtre de contrôle.
                      </p>
                    )}
                  </CardContent>
                </ResourceSection>
              </div>
            </div>
          )}

        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
