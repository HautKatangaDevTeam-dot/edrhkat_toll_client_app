"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  PencilLine,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";

import { AUTH_POSTS, AUTH_ROLES } from "@/constants/auth";
import { AppModal } from "@/components/admin/AppModal";
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
import { authService } from "@/services/authService";
import { logoutUser, refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import type { AuthPost, AuthRole, UserWithMeta } from "@/types/auth";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const ROLE_META: Record<AuthRole, { label: string; tone: string }> = {
  ADMIN_SYSTEME: {
    label: "Admin systeme",
    tone:
      "border-primary/30 bg-primary/10 text-primary dark:text-primary",
  },
  SUPERVISEUR: {
    label: "Superviseur financier",
    tone:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  },
  AGENT_BUREAU: {
    label: "Agent bureau",
    tone:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  },
  AGENT_TOLL: {
    label: "Agent peage",
    tone:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  },
};

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken } = useAppSelector(
    (state) => state.auth
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AuthRole>("AGENT_TOLL");
  const [post, setPost] = useState<AuthPost>("KAMPEMBA");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithMeta | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState<AuthRole>("AGENT_TOLL");
  const [editPost, setEditPost] = useState<AuthPost>("KAMPEMBA");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const [users, setUsers] = useState<UserWithMeta[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AuthRole | "all">("all");
  const [postFilter, setPostFilter] = useState<AuthPost | "all">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  const resetCreateUserForm = useCallback(() => {
    setUsername("");
    setPassword("");
    setRole("AGENT_TOLL");
    setPost("KAMPEMBA");
    setShowPassword(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        resetCreateUserForm();
      }
    },
    [resetCreateUserForm]
  );

  const resetEditUserForm = useCallback(() => {
    setEditingUser(null);
    setEditUsername("");
    setEditRole("AGENT_TOLL");
    setEditPost("KAMPEMBA");
  }, []);

  const handleEditOpenChange = useCallback(
    (nextOpen: boolean) => {
      setEditOpen(nextOpen);
      if (!nextOpen) {
        resetEditUserForm();
      }
    },
    [resetEditUserForm]
  );

  const handleLogout = () => {
    if (accessToken) {
      dispatch(logoutUser(accessToken));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchUsers = useCallback(async () => {
    const tokenToUse = accessToken;
    if (!tokenToUse) return;
    setIsLoadingUsers(true);

    const load = async (token: string) => {
      const result = await authService.listUsers(token, {
        search: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        post: postFilter === "all" ? undefined : postFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setUsers(result.data || []);
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
        } catch (refreshErr) {
          notify.fromError(refreshErr, "Session expiree.");
          return;
        }
      }
      notify.fromError(err, "Impossible de charger les utilisateurs.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [accessToken, dispatch, page, postFilter, refreshToken, roleFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const tokenToUse = accessToken;
      if (!tokenToUse) {
        throw new Error("Session expiree. Veuillez vous reconnecter.");
      }

      const submit = async (token: string) => {
        await authService.register(
          { username: username.trim().toLowerCase(), password, role, post },
          token
        );
      };

      try {
        await submit(tokenToUse);
      } catch (err) {
        const isApiError = err instanceof ApiError;
        if (isApiError && err.status === 401 && refreshToken) {
          const refreshed = await dispatch(refreshSession()).unwrap();
          if (refreshed.accessToken) {
            await submit(refreshed.accessToken);
          }
        } else {
          throw err;
        }
      }

      notify.success("Utilisateur cree avec succes.");
      resetCreateUserForm();
      setOpen(false);
      setPage(1);
      fetchUsers();
    } catch (err) {
      notify.fromError(err, "Echec de la creation de l'utilisateur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(target: UserWithMeta) {
    const confirmed = window.confirm(
      `Reinitialiser le mot de passe de ${target.username} a Tabc@123 ?`
    );
    if (!confirmed) return;

    const tokenToUse = accessToken;
    if (!tokenToUse) {
      notify.error("Session expiree. Veuillez vous reconnecter.");
      return;
    }

    setResettingUserId(target.id);

    const submit = async (token: string) =>
      authService.resetPassword(token, target.id);

    try {
      let result;
      try {
        result = await submit(tokenToUse);
      } catch (err) {
        const isApiError = err instanceof ApiError;
        if (isApiError && err.status === 401 && refreshToken) {
          const refreshed = await dispatch(refreshSession()).unwrap();
          if (!refreshed.accessToken) {
            return;
          }
          result = await submit(refreshed.accessToken);
        } else {
          throw err;
        }
      }

      notify.success(
        `Mot de passe reinitialise pour ${target.username}: ${result.defaultPassword}`
      );
      await fetchUsers();
    } catch (err) {
      notify.fromError(err, "Impossible de reinitialiser le mot de passe.");
    } finally {
      setResettingUserId(null);
    }
  }

  const openEditModal = useCallback((target: UserWithMeta) => {
    setEditingUser(target);
    setEditUsername(target.username);
    setEditRole(target.role);
    setEditPost(target.post);
    setEditOpen(true);
  }, []);

  async function handleUpdateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;

    const tokenToUse = accessToken;
    if (!tokenToUse) {
      notify.error("Session expiree. Veuillez vous reconnecter.");
      return;
    }

    setIsUpdatingUser(true);

    const submit = async (token: string) =>
      authService.updateUser(token, editingUser.id, {
        username: editUsername.trim().toLowerCase(),
        role: editRole,
        post: editPost,
      });

    try {
      try {
        await submit(tokenToUse);
      } catch (err) {
        const isApiError = err instanceof ApiError;
        if (isApiError && err.status === 401 && refreshToken) {
          const refreshed = await dispatch(refreshSession()).unwrap();
          if (!refreshed.accessToken) {
            return;
          }
          await submit(refreshed.accessToken);
        } else {
          throw err;
        }
      }

      notify.success("Utilisateur modifie avec succes.");
      handleEditOpenChange(false);
      await fetchUsers();
    } catch (err) {
      notify.fromError(err, "Impossible de modifier l'utilisateur.");
    } finally {
      setIsUpdatingUser(false);
    }
  }

  return (
    <ProtectedLayout>
      <AppShell
        pageTitle="Utilisateurs"
        pageSubtext="Gestion des comptes et des affectations"
        userLabel={user ? user.username : undefined}
        userMeta={user ? `${user.role} · ${user.post}` : undefined}
        onLogout={handleLogout}
      >
        <div className="flex min-h-full w-full flex-col gap-4">
          <AppModal
            open={editOpen}
            onOpenChange={handleEditOpenChange}
            size="lg"
            eyebrow="Administration"
            title={editingUser ? `Modifier ${editingUser.username}` : "Modifier l'utilisateur"}
            description="Ajustez l'identifiant, le role et le poste depuis la fiche utilisateur."
            bodyClassName="px-5 py-4"
            footer={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleEditOpenChange(false)}
                >
                  Fermer
                </Button>
                {editingUser ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={resettingUserId === editingUser.id}
                    onClick={() => handleResetPassword(editingUser)}
                  >
                    <RotateCcw size={14} />
                    {resettingUserId === editingUser.id ? "Reset..." : "Reset mdp"}
                  </Button>
                ) : null}
                <Button
                  form="edit-user-form"
                  type="submit"
                  disabled={isUpdatingUser || !editingUser}
                >
                  {isUpdatingUser ? "Mise a jour..." : "Enregistrer"}
                </Button>
              </>
            }
          >
            <form
              id="edit-user-form"
              className="mx-auto w-full max-w-xl space-y-4"
              onSubmit={handleUpdateUser}
            >
              <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs normal-case tracking-normal">
                    Identifiant
                  </Label>
                  <Input
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="prenom.nom"
                    className="h-10"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-xs normal-case tracking-normal">
                    Role
                  </Label>
                  <Select
                    value={editRole}
                    onValueChange={(value) => setEditRole(value as AuthRole)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selectionner un role" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTH_ROLES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <Label className="text-xs normal-case tracking-normal">
                    Poste
                  </Label>
                  <Select
                    value={editPost}
                    onValueChange={(value) => setEditPost(value as AuthPost)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selectionner un poste" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTH_POSTS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </form>
          </AppModal>

          <div className="flex justify-end">
            <AppModal
              open={open}
              onOpenChange={handleOpenChange}
              size="lg"
              eyebrow="Administration"
              title="Nouvel utilisateur"
              description="Creez un compte operateur, attribuez-lui un role metier et rattachez-le a un poste."
              bodyClassName="px-5 py-4"
              trigger={
                <Button className="h-9 rounded-lg px-4">
                  <Plus size={18} />
                  Creer un utilisateur
                </Button>
              }
              footer={
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleOpenChange(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    form="create-user-form"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creation..." : "Creer"}
                  </Button>
                </>
              }
            >
              <form
                id="create-user-form"
                className="mx-auto w-full max-w-xl space-y-4"
                onSubmit={handleCreateUser}
              >
                <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="username"
                      className="text-xs normal-case tracking-normal"
                    >
                      Identifiant
                    </Label>
                    <Input
                      id="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="prenom.nom"
                      autoComplete="username"
                      className="h-10"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="password"
                      className="text-xs normal-case tracking-normal"
                    >
                      Mot de passe
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        required
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mot de passe initial"
                        autoComplete="new-password"
                        maxLength={72}
                        className="h-10 pr-12"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mot de passe libre, meme court, selon votre besoin terrain.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs normal-case tracking-normal">
                      Role
                    </Label>
                    <Select
                      value={role}
                      onValueChange={(value) => setRole(value as AuthRole)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selectionner un role" />
                      </SelectTrigger>
                      <SelectContent>
                        {AUTH_ROLES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs normal-case tracking-normal">
                      Poste
                    </Label>
                    <Select
                      value={post}
                      onValueChange={(value) => setPost(value as AuthPost)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selectionner un poste" />
                      </SelectTrigger>
                      <SelectContent>
                        {AUTH_POSTS.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
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
            title="Repertoire des utilisateurs"
            description="Recherche, filtrage par role et poste, puis pagination serveur."
            filters={
              <FilterBar className="md:grid-cols-[minmax(0,24rem)_12rem_12rem] md:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un identifiant..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 max-w-md pl-10"
                  />
                </div>

                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value as AuthRole | "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full md:max-w-48">
                    <SelectValue placeholder="Tous les roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les roles</SelectItem>
                    {AUTH_ROLES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={postFilter}
                  onValueChange={(value) => {
                    setPostFilter(value as AuthPost | "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full md:max-w-48">
                    <SelectValue placeholder="Tous les postes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les postes</SelectItem>
                    {AUTH_POSTS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterBar>
            }
          >

            <CardContent className="space-y-4 p-0">
              {isLoadingUsers ? (
                <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                  Chargement des utilisateurs...
                </div>
              ) : users.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                  Aucun utilisateur ne correspond a ce filtre.
                </div>
              ) : (
                <>
                  <div className="px-4 pt-4 md:px-5">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Identifiant</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Poste</TableHead>
                          <TableHead>Creation</TableHead>
                          <TableHead>Mise a jour</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((item) => (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer"
                            onClick={() => openEditModal(item)}
                          >
                            <TableCell className="font-semibold text-foreground">
                              <div className="flex items-center gap-2">
                                <PencilLine size={14} className="text-muted-foreground" />
                                <span>{item.username}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                                  ROLE_META[item.role].tone
                                )}
                              >
                                {ROLE_META[item.role].label}
                              </span>
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {item.post}
                            </TableCell>
                            <TableCell>
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              {item.updatedAt
                                ? new Date(item.updatedAt).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                    <p>
                      Page {page} sur {totalPages} · {total} utilisateur
                      {total > 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((current) => current - 1)}
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
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
