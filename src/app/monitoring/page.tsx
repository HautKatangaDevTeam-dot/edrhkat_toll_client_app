"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Siren } from "lucide-react";

import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { AppShell } from "@/components/layouts/AppShell";
import { ResourceSection } from "@/components/admin/ResourceSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { ApiError } from "@/lib/http";
import { monitoringService } from "@/services/monitoringService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import type { HealthStatusResponse, MonitoringIncident, MonitoringSummary } from "@/types/monitoring";

const POLL_INTERVAL_MS = 30000;

export default function MonitoringPage() {
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken } = useAppSelector((state) => state.auth);

  const [status, setStatus] = useState<"active" | "resolved" | "all">("active");
  const [incidents, setIncidents] = useState<MonitoringIncident[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolvingId, setIsResolvingId] = useState<string | null>(null);

  const handleLogout = () => {
    if (accessToken) {
      dispatch(logoutUser(accessToken));
    }
  };

  const loadMonitoring = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);

    const load = async (token: string) => {
      const [incidentResult, healthResult] = await Promise.allSettled([
        monitoringService.listIncidents(token, { status, limit: 50 }),
        monitoringService.health(),
      ]);
      if (incidentResult.status === "rejected") {
        throw incidentResult.reason;
      }
      if (incidentResult.status === "fulfilled") {
        setIncidents(incidentResult.value.data ?? []);
        setSummary(incidentResult.value.summary);
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
      if (err instanceof ApiError && err.status === 401 && refreshToken) {
        try {
          const refreshed = await dispatch(refreshSession()).unwrap();
          if (refreshed.accessToken) {
            await load(refreshed.accessToken);
          }
          return;
        } catch (refreshErr) {
          setIncidents([]);
          setSummary(null);
          notify.fromError(refreshErr, "Session expiree.");
          return;
        }
      }
      notify.fromError(err, "Impossible de charger les incidents serveur.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, dispatch, refreshToken, status]);

  useEffect(() => {
    loadMonitoring();
  }, [loadMonitoring]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadMonitoring();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadMonitoring]);

  const resolveIncident = useCallback(
    async (incidentId: string) => {
      if (!accessToken) return;
      setIsResolvingId(incidentId);

      const submit = async (token: string) => {
        await monitoringService.resolveIncident(token, incidentId);
      };

      try {
        await submit(accessToken);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401 && refreshToken) {
          const refreshed = await dispatch(refreshSession()).unwrap();
          if (refreshed.accessToken) {
            await submit(refreshed.accessToken);
          }
        } else {
          notify.fromError(err, "Impossible de cloturer cet incident.");
          setIsResolvingId(null);
          return;
        }
      }

      notify.success("Incident cloture.");
      setIsResolvingId(null);
      void loadMonitoring();
    },
    [accessToken, dispatch, loadMonitoring, refreshToken]
  );

  const activeIncidents = useMemo(
    () => incidents.filter((incident) => incident.status === "active"),
    [incidents]
  );

  const toneClass = (incident: MonitoringIncident) =>
    incident.severity === "error"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
      : "border-amber-500/30 bg-amber-500/10 text-amber-700";

  const formatDate = (value?: string | null) => {
    if (!value) return "Jamais";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Jamais";
    return parsed.toLocaleString();
  };

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="Incidents"
        pageSubtext="Surveillance du serveur"
        userLabel={user ? user.username : undefined}
        userMeta={user ? `${user.role} · ${user.post}` : undefined}
        onLogout={handleLogout}
      >
        <div className="flex min-h-full w-full flex-col gap-4">
          {activeIncidents.length > 0 && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardContent className="flex items-center gap-3 pt-6 text-sm text-rose-900 dark:text-rose-100">
                <Siren className="h-5 w-5 shrink-0" />
                <span>{activeIncidents.length} incident(s) serveur actif(s).</span>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sante API</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {health?.status === "ok" ? "OK" : "Indisponible"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Incidents actifs</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-rose-600">
                {summary?.activeCount ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Erreurs critiques</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-amber-600">
                {summary?.criticalCount ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dernier check</CardTitle>
              </CardHeader>
              <CardContent className="text-sm font-medium">
                {formatDate(health?.timestamp)}
              </CardContent>
            </Card>
          </div>

          <ResourceSection
            title="Flux d'incidents"
            description="Les erreurs repetitives sont regroupees automatiquement."
            actions={
              <div className="flex items-center gap-2">
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="resolved">Resolus</SelectItem>
                    <SelectItem value="all">Tous</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => void loadMonitoring()}
                  disabled={isLoading}
                  aria-label="Actualiser"
                >
                  <RefreshCw size={16} className={cn(isLoading && "animate-spin")} />
                </Button>
              </div>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etat</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Contexte</TableHead>
                  <TableHead>Occurrences</TableHead>
                  <TableHead>Derniere vue</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                          toneClass(incident)
                        )}
                      >
                        {incident.status === "resolved"
                          ? "Resolue"
                          : incident.severity === "error"
                            ? "Critique"
                            : "Alerte"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[340px]">
                      <div className="space-y-1">
                        <p className="font-medium">{incident.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {incident.code ?? "INTERNAL_ERROR"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>{incident.method ?? "?"} {incident.normalized_path ?? "n/a"}</div>
                      <div>{incident.last_username ?? incident.last_device_id ?? "Systeme"}</div>
                    </TableCell>
                    <TableCell>{incident.occurrence_count}</TableCell>
                    <TableCell>{formatDate(incident.last_seen_at)}</TableCell>
                    <TableCell className="text-right">
                      {incident.status === "active" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void resolveIncident(incident.id)}
                          disabled={isResolvingId === incident.id}
                        >
                          <CheckCircle2 size={14} className="mr-2" />
                          Cloturer
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {incident.resolved_by_username
                            ? `Par ${incident.resolved_by_username}`
                            : "Cloture"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {incidents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Aucun incident dans cette vue.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ResourceSection>
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
