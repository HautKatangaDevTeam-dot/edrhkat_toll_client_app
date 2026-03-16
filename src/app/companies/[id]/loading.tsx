"use client";

import { ArrowLeft, Building2 } from "lucide-react";

import { AppShell } from "@/components/layouts/AppShell";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyDetailLoading() {
  return (
    <ProtectedLayout>
      <AppShell pageTitle="Gestion Société" pageSubtext="Chargement">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="gap-2 text-muted-foreground"
            >
              <ArrowLeft size={18} />
              Retour au répertoire
            </Button>
            <Skeleton className="h-4 w-28" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 size={18} className="text-primary" />
                  Profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-4 w-40 mx-auto" />
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 size={18} className="text-primary" />
                  Détails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-4 w-40 mx-auto" />
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Journal des transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-4"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
