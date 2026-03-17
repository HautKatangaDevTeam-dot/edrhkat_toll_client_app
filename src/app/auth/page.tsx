"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  FileText,
  ReceiptText,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { notify } from "@/lib/notify";
import { loginUser } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";

const features = [
  {
    icon: ReceiptText,
    title: "Lots de recus",
    text: "Suivi des emissions, consommations et exonerations par societe.",
  },
  {
    icon: BarChart3,
    title: "Pilotage",
    text: "Suivi des transactions et supervision des postes de peage.",
  },
  {
    icon: FileText,
    title: "Rapports",
    text: "Exports et lecture des activites de peage par periode.",
  },
];

export default function AuthPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { accessToken, status, error } = useAppSelector((state) => state.auth);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isLoading = status === "loading";
  const canSubmit = !isLoading;

  useEffect(() => {
    if (accessToken) {
      router.replace("/");
    }
  }, [accessToken, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUsername = username.trim().toLowerCase();

    try {
      await dispatch(
        loginUser({ username: normalizedUsername, password })
      ).unwrap();
      notify.success("Connexion reussie.");
    } catch (err) {
      notify.fromError(err, "Identifiants invalides.");
    }
  }

  const errorMessage = (() => {
    if (!error) return null;
    switch (error.code) {
      case "AUTH_INVALID_CREDENTIALS":
        return "Identifiant ou mot de passe invalide.";
      case "AUTH_RATE_LIMITED":
        return "Trop de tentatives de connexion. Reessayez plus tard.";
      case "AUTH_SESSION_EXPIRED":
        return "Votre session a expire. Veuillez vous reconnecter.";
      case "VALIDATION_ERROR":
        return error.message;
      default:
        return error.message;
    }
  })();

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.28),transparent_34%)] dark:bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_22%),linear-gradient(180deg,rgba(2,6,23,0.24),transparent_34%)]" />
      <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl items-start justify-center px-4 py-6 sm:px-6 sm:py-10 lg:items-center">
        <Card className="w-full max-w-5xl border-border/80 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur">
          <CardContent className="p-3 sm:p-4">
            <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[1.5rem] border border-border/70 bg-muted/40 p-8 sm:p-10">
                <div className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Console Péage EDRHKAT
                </div>

                <div className="mt-6 space-y-4">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Console de supervision du péage EDRHKAT.
                  </h1>
                  <p className="max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
                    Extension EDRHKAT dediee au pilotage des lots de recus,
                    des passages terrain et des rapports d&apos;exploitation.
                  </p>
                </div>

                <div className="mt-8 space-y-4">
                  {features.map((feature) => (
                    <div
                      key={feature.title}
                      className="flex gap-4 rounded-2xl border border-border/70 bg-background/70 p-4"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <feature.icon size={20} />
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-sm font-semibold">{feature.title}</h2>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {feature.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-border/70 bg-background/80 p-8 sm:p-10">
                <div className="mb-8">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ShieldCheck size={22} />
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Acces securise
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                    Connexion
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Identifiez-vous avec votre compte operateur.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label
                      htmlFor="username"
                      className="text-sm font-semibold text-foreground"
                    >
                      Identifiant
                    </label>
                    <input
                      id="username"
                      name="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onInput={(e) =>
                        setUsername((e.target as HTMLInputElement).value)
                      }
                      placeholder="gloire.mpanga"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="flex h-14 w-full rounded-2xl border border-border bg-background/80 px-4 text-base text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-background/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="password"
                      className="text-sm font-semibold text-foreground"
                    >
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        required
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onInput={(e) =>
                          setPassword((e.target as HTMLInputElement).value)
                        }
                        placeholder="Saisissez votre mot de passe"
                        autoComplete="current-password"
                        className="flex h-14 w-full rounded-2xl border border-border bg-background/80 px-4 pr-14 text-base text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-background/60"
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
                  </div>

                  {errorMessage ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {errorMessage}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSubmit}
                  >
                    {isLoading ? "Connexion en cours..." : "Se connecter"}
                  </button>
                </form>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
