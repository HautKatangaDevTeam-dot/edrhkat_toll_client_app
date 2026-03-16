"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AppModal } from "@/components/admin/AppModal";
import { FilterBar } from "@/components/admin/FilterBar";
import { ResourceSection } from "@/components/admin/ResourceSection";
import { AppShell } from "@/components/layouts/AppShell";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
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
import { companyService } from "@/services/companyService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import type { BillingMode, Company } from "@/types/company";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/http";

const BILLING_OPTIONS: BillingMode[] = ["PAYG", "PREPAID", "POSTPAID"];
type StatusFilter = "all" | "active" | "inactive";

export default function CompaniesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken } = useAppSelector(
    (state) => state.auth
  );

  const [companies, setCompanies] = useState<Company[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [billingFilter, setBillingFilter] = useState<BillingMode | "all">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [billingMode, setBillingMode] = useState<BillingMode>("PAYG");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userMeta = useMemo(() => {
    if (!user) return undefined;
    return `${user.role} · ${user.post}`;
  }, [user]);

  const handleLogout = () => {
    if (accessToken) dispatch(logoutUser(accessToken));
  };

  const fetchCompanies = useCallback(async () => {
    const tokenToUse = accessToken;
    if (!tokenToUse) return;
    setIsLoading(true);
    const load = async (token: string) => {
      const result = await companyService.list(token, {
        search: search || undefined,
        page,
        pageSize,
      });
      setCompanies(result.data || []);
      setTotal(result.total ?? 0);
    };
    try {
      await load(tokenToUse);
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
          // ignore and fall through
        }
      }
      notify.fromError(err, "Erreur lors du chargement des societes.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, dispatch, page, pageSize, refreshToken, search]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function handleCreateCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const tokenToUse = accessToken;
      if (!tokenToUse) throw new Error("Session expirée.");
      await companyService.create(tokenToUse, {
        name,
        code,
        billing_mode: billingMode,
      });
      notify.success("Societe creee.");
      setOpen(false);
      fetchCompanies();
    } catch {
      notify.fromError(undefined, "Echec de creation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const filteredCompanies = companies.filter((c) => {
    const normalizedBilling = (c.billingMode || "").toUpperCase();
    const matchesBilling =
      billingFilter === "all" ||
      normalizedBilling === (billingFilter as string).toUpperCase();
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? c.isActive : !c.isActive);
    return matchesBilling && matchesStatus;
  });

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="Sociétés"
        pageSubtext="Gestion des comptes clients et de la facturation"
        userLabel={user ? user.username : undefined}
        userMeta={userMeta}
        onLogout={handleLogout}
      >
        <div className="flex min-h-full w-full flex-col gap-4">
          <div className="flex justify-end">
            <AppModal
              open={open}
              onOpenChange={setOpen}
              eyebrow="Creation"
              title="Creer une societe"
              description="Ajoutez un nouveau compte client avec son code interne et son mode de facturation."
              bodyClassName="px-5 py-4"
              trigger={
                <Button className="h-9 rounded-lg px-4">
                  <Plus size={18} />
                  Nouvelle societe
                </Button>
              }
              footer={
                <>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    form="create-company-form"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creation..." : "Creer"}
                  </Button>
                </>
              }
            >
              <form
                id="create-company-form"
                className="mx-auto w-full max-w-sm space-y-4"
                onSubmit={handleCreateCompany}
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="company-name" className="text-xs normal-case tracking-normal">
                      Nom
                    </Label>
                    <Input
                      id="company-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="company-code" className="text-xs normal-case tracking-normal">
                      Code
                    </Label>
                    <Input
                      id="company-code"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs normal-case tracking-normal">
                      Mode de facturation
                    </Label>
                    <Select
                      value={billingMode}
                      onValueChange={(val) => setBillingMode(val as BillingMode)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </form>
            </AppModal>
          </div>

          <ResourceSection
            title="Repertoire des societes"
            description="Recherche locale, filtres de statut et de facturation, puis navigation vers le detail."
            filters={
              <FilterBar className="md:grid-cols-[minmax(0,24rem)_12rem_10rem] md:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou code..."
                    value={search}
                    onChange={(e) => {
                      setPage(1);
                      setSearch(e.target.value);
                    }}
                    className="h-9 max-w-md pl-10"
                  />
                </div>

                <Select
                  value={billingFilter}
                  onValueChange={(val) => {
                    setBillingFilter(val as BillingMode | "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full md:max-w-48">
                    <SelectValue placeholder="Facturation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les modes</SelectItem>
                    {BILLING_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val as StatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full md:max-w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="active">Actives</SelectItem>
                    <SelectItem value="inactive">Bloquees</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBar>
            }
          >
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center px-4 py-10 text-muted-foreground">
                Chargement...
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 py-10 text-muted-foreground">
                Aucune société trouvée.
              </div>
            ) : (
              <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="py-3 font-semibold">
                          Nom
                        </TableHead>
                        <TableHead className="py-3 font-semibold">
                          Code
                        </TableHead>
                        <TableHead className="py-3 font-semibold">
                          Facturation
                        </TableHead>
                        <TableHead className="py-3 font-semibold">
                          Statut
                        </TableHead>
                        <TableHead className="py-3 font-semibold">
                          Creation
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompanies.map((c) => (
                        <TableRow
                          key={c.id}
                          className="cursor-pointer transition-colors hover:bg-muted/40"
                          onClick={() => router.push(`/companies/${c.id}`)}
                        >
                          <TableCell className="font-semibold text-foreground">
                            {c.name}
                          </TableCell>
                          <TableCell>
                            <span className="rounded-lg border border-border/70 px-2 py-1 text-xs font-mono text-muted-foreground">
                              {c.code}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs font-semibold text-foreground/80">
                              {c.billingMode}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                                c.isActive
                                  ? "border border-green-500/40 text-green-600 dark:text-green-300"
                                  : "border border-rose-400/40 text-rose-600 dark:text-rose-300"
                              )}
                            >
                              {c.isActive ? (
                                <BadgeCheck size={14} />
                              ) : (
                                <ShieldCheck size={14} />
                              )}
                              {c.isActive ? "Active" : "Bloquee"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
                  <p>
                    Total: {total} · Page {page}/{totalPages || 1}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Précédent
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
              </div>
            )}
          </ResourceSection>
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
