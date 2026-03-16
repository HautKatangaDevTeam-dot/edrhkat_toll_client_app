"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, Edit3 } from "lucide-react";

import { AppModal } from "@/components/admin/AppModal";
import { ResourceSection } from "@/components/admin/ResourceSection";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { AppShell } from "@/components/layouts/AppShell";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/http";
import { companyService } from "@/services/companyService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import type { BillingMode, Company } from "@/types/company";

type PageProps = {
  params: { id: string };
};

export default function CompanyDetailPage({ params }: PageProps) {
  const routeParams = useParams<{ id?: string }>();
  const id = routeParams?.id ?? params?.id;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken } = useAppSelector(
    (state) => state.auth
  );

  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [billingMode, setBillingMode] = useState<BillingMode>("PAYG");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const userMeta = useMemo(
    () => (user ? `${user.role} · ${user.post}` : undefined),
    [user]
  );

  const handleLogout = () => {
    if (accessToken) dispatch(logoutUser(accessToken));
  };

  const fetchCompany = useCallback(async () => {
    if (!id || !accessToken) return;
    const load = async (token: string) => {
      const res = await companyService.getOne(token, id);
      setCompany(res.company);
      setName(res.company.name);
      setCode(res.company.code);
      setBillingMode(res.company.billingMode);
      setIsActive(res.company.isActive);
    };

    try {
      await load(accessToken);
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
      notify.fromError(err, "Impossible de charger la societe.");
    }
  }, [accessToken, dispatch, id, refreshToken]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !id) return;
    setIsSaving(true);
    try {
      await companyService.update(accessToken, id, {
        name,
        code,
        billing_mode: billingMode,
        is_active: isActive,
      });
      notify.success("Societe mise a jour.");
      setEditOpen(false);
      await fetchCompany();
    } catch (err) {
      notify.fromError(err, "Echec de la mise a jour.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="Gestion Société"
        pageSubtext={company?.name || "Détails"}
        userLabel={user ? user.username : undefined}
        userMeta={userMeta}
        onLogout={handleLogout}
      >
        <div className="flex min-h-full w-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.push("/companies")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <AppModal
              open={editOpen}
              onOpenChange={setEditOpen}
              title="Modifier la société"
              trigger={
                <Button>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              }
            >
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select value={billingMode} onValueChange={(v) => setBillingMode(v as BillingMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAYG">PAYG</SelectItem>
                      <SelectItem value="PREPAID">PREPAID</SelectItem>
                      <SelectItem value="POSTPAID">POSTPAID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <Label>Actif</Label>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
                <Button type="submit" disabled={isSaving} className="w-full">
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </form>
            </AppModal>
          </div>

          <ResourceSection
            title="Fiche société"
            description="Les modules wallet et override ont été retirés du système."
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {company?.name ?? "Chargement..."}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Code</div>
                  <div>{company?.code || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Mode</div>
                  <div>{company?.billingMode || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Statut</div>
                  <div>{company?.isActive ? "Active" : "Inactive"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Créée le</div>
                  <div>
                    {company?.createdAt
                      ? new Date(company.createdAt).toLocaleString()
                      : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </ResourceSection>
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
