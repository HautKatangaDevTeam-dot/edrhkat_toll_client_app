"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, RefreshCw, Smartphone } from "lucide-react";

import { AUTH_POSTS } from "@/constants/auth";
import { AppModal } from "@/components/admin/AppModal";
import { AppShell } from "@/components/layouts/AppShell";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/http";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { posDeviceService } from "@/services/posDeviceService";
import { posKeyService } from "@/services/posKeyService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import type { PosDeviceMonitor } from "@/types/pos-device";
import type { PosKeyRegistryEntry } from "@/types/pos-key";

const STALE_OPTIONS = [15, 30, 60, 120, 240];

const formatDeviceName = (device: PosDeviceMonitor) => {
  if (device.label?.trim()) return device.label.trim();
  if (device.assignedPost?.trim()) return `POS ${device.assignedPost.trim()}`;
  if (device.contactPhone?.trim()) return device.contactPhone.trim();
  return "POS sans nom";
};

const formatDeviceMeta = (device: PosDeviceMonitor) =>
  device.assignedPost?.trim() || device.contactPhone?.trim() || "Poste non affecte";

const shortDeviceId = (id: string) => (id.length > 10 ? `${id.slice(0, 8)}...` : id);

export default function PosDevicesPage() {
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken } = useAppSelector((state) => state.auth);

  const [staleMinutes, setStaleMinutes] = useState(60);
  const [devices, setDevices] = useState<PosDeviceMonitor[]>([]);
  const [staleCount, setStaleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [editing, setEditing] = useState<PosDeviceMonitor | null>(null);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [assignedPost, setAssignedPost] = useState<string>("UNASSIGNED");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [keys, setKeys] = useState<PosKeyRegistryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"devices" | "keys">("devices");

  const resetDeviceEditor = useCallback(() => {
    setEditing(null);
    setLabel("");
    setContactPhone("");
    setAssignedPost("UNASSIGNED");
    setIsActive(true);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        resetDeviceEditor();
      }
    },
    [resetDeviceEditor]
  );

  const handleLogout = () => {
    if (accessToken) {
      dispatch(logoutUser(accessToken));
    }
  };

  const formatDate = useCallback((value?: string | null) => {
    if (!value) return "Jamais";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Jamais";
    return parsed.toLocaleString();
  }, []);

  const loadDevices = useCallback(async () => {
    const tokenToUse = accessToken;
    if (!tokenToUse) return;
    setIsLoading(true);

    const load = async (token: string) => {
      const result = await posDeviceService.list(token, staleMinutes);
      setDevices(result.data ?? []);
      setStaleCount(result.stale_count ?? 0);
    };

    try {
      await load(tokenToUse);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && refreshToken) {
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
      notify.fromError(err, "Impossible de charger les POS.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, dispatch, refreshToken, staleMinutes]);

  const loadKeys = useCallback(async () => {
    const tokenToUse = accessToken;
    if (!tokenToUse) return;
    setIsLoadingKeys(true);

    const load = async (token: string) => {
      const result = await posKeyService.list(token);
      setKeys(result.data ?? []);
    };

    try {
      await load(tokenToUse);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && refreshToken) {
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
      notify.fromError(err, "Impossible de charger le registre des cles.");
    } finally {
      setIsLoadingKeys(false);
    }
  }, [accessToken, dispatch, refreshToken]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const openEditor = useCallback((device: PosDeviceMonitor) => {
    setEditing(device);
    setLabel(device.label ?? "");
    setContactPhone(device.contactPhone ?? "");
    setAssignedPost(device.assignedPost ?? "UNASSIGNED");
    setIsActive(device.isActive);
    setOpen(true);
  }, []);

  const staleDevices = useMemo(() => devices.filter((device) => device.stale), [devices]);

  const saveDevice = useCallback(async () => {
    if (!editing || !accessToken) return;
    setIsSaving(true);

    const submit = async (token: string) => {
      await posDeviceService.update(token, editing.id, {
        label: label.trim() || null,
        contactPhone: contactPhone.trim() || null,
        assignedPost: assignedPost === "UNASSIGNED" ? null : assignedPost,
        isActive,
      });
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
        notify.fromError(err, "Impossible de mettre a jour ce POS.");
        setIsSaving(false);
        return;
      }
    }

    notify.success("POS mis a jour.");
    handleOpenChange(false);
    setIsSaving(false);
    loadDevices();
  }, [
    accessToken,
    assignedPost,
    contactPhone,
    dispatch,
    editing,
    handleOpenChange,
    isActive,
    label,
    loadDevices,
    refreshToken,
  ]);

  const keyStatusTone = (status: PosKeyRegistryEntry["status"]) => {
    switch (status) {
      case "active":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
      case "legacy":
        return "border-amber-500/30 bg-amber-500/10 text-amber-700";
      case "revoked":
        return "border-rose-500/30 bg-rose-500/10 text-rose-700";
    }
  };

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="POS"
        pageSubtext="Suivi des terminaux et de leur presence reseau"
        userLabel={user ? user.username : undefined}
        userMeta={user ? `${user.role} · ${user.post}` : undefined}
        onLogout={handleLogout}
      >
        <div className="flex min-h-full w-full flex-col gap-4">
          {staleCount > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-center gap-3 pt-6 text-sm text-amber-900 dark:text-amber-100">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>
                  {staleCount} POS n&apos;ont pas ete vus par le serveur dans la fenetre de {staleMinutes} min.
                </span>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total POS</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{devices.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">POS en alerte</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-amber-600">{staleCount}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Fenetre de controle</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={String(staleMinutes)} onValueChange={(value) => setStaleMinutes(Number(value))}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STALE_OPTIONS.map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          <div className="inline-flex w-fit rounded-2xl border border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("devices")}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                activeTab === "devices"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Terminaux
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("keys")}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                activeTab === "keys"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Clés POS
            </button>
          </div>

          {activeTab === "devices" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Terminaux</CardTitle>
              <Button variant="outline" size="icon" onClick={loadDevices} disabled={isLoading} aria-label="Actualiser">
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {staleDevices.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                  <div className="font-medium text-amber-800 dark:text-amber-100">POS a verifier</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {staleDevices.slice(0, 5).map((device) => (
                      <span key={device.id} className="rounded-full border border-amber-500/30 px-2 py-1 text-xs text-amber-800 dark:text-amber-100">
                        {formatDeviceName(device)} · {formatDeviceMeta(device)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>POS</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Dernière activité</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="font-medium">{formatDeviceName(device)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDeviceMeta(device)}
                        </div>
                        <div className="text-[11px] text-muted-foreground/70">
                          ID: {shortDeviceId(device.id)}
                        </div>
                      </TableCell>
                      <TableCell>{device.contactPhone || "Non renseigné"}</TableCell>
                      <TableCell>{device.assignedPost || "Non affecté"}</TableCell>
                      <TableCell>
                        <div>{formatDate(device.lastSeenAt)}</div>
                        <div className="text-xs text-muted-foreground">
                          Sync: {formatDate(device.lastSyncAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              "inline-flex w-fit items-center rounded-full border px-2 py-1 text-xs font-semibold",
                              device.stale
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                            )}
                          >
                            {device.stale ? "En retard" : "OK"}
                          </span>
                          {!device.isActive && (
                            <span className="inline-flex w-fit items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-700 dark:text-rose-200">
                              Désactivé
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditor(device)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && devices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        Aucun POS détecté pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          )}

          {activeTab === "keys" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Registre des cles POS</CardTitle>
              <Button variant="outline" size="icon" onClick={loadKeys} disabled={isLoadingKeys} aria-label="Actualiser les cles">
                <RefreshCw className={cn("h-4 w-4", isLoadingKeys && "animate-spin")} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clé</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créée</TableHead>
                    <TableHead>Maj</TableHead>
                    <TableHead>Par</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key, index) => (
                    <TableRow key={`${key.keyId}-${key.status}-${key.updatedAt}-${index}`}>
                      <TableCell>
                        <div className="font-medium">{key.label || key.keyId}</div>
                        <div className="text-xs text-muted-foreground">{key.keyId}</div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs font-semibold", keyStatusTone(key.status))}>
                          {key.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(key.createdAt)}</TableCell>
                      <TableCell>{formatDate(key.updatedAt)}</TableCell>
                      <TableCell>{key.updatedByUsername || "Système"}</TableCell>
                    </TableRow>
                  ))}
                  {!isLoadingKeys && keys.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        Aucune clé enregistrée pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          )}

          <AppModal
            open={open}
            onOpenChange={handleOpenChange}
            eyebrow="POS"
            title={editing ? formatDeviceName(editing) : "Modifier le POS"}
            description="Renseignez l'identification du terminal pour le suivi terrain."
            footer={
              <>
                <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                  Annuler
                </Button>
                <Button onClick={saveDevice} disabled={isSaving}>
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </>
            }
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pos-label">Nom</Label>
                <Input id="pos-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="POS Kasumbalesa 01" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pos-phone">Téléphone</Label>
                <Input id="pos-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+243..." />
              </div>
              <div className="grid gap-2">
                <Label>Poste</Label>
                <Select value={assignedPost} onValueChange={setAssignedPost}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNASSIGNED">Non affecté</SelectItem>
                    {AUTH_POSTS.map((post) => (
                      <SelectItem key={post} value={post}>
                        {post}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span>POS actif</span>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </AppModal>
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
