"use client";

import { Building2, RefreshCw, Search } from "lucide-react";

import { AppShell } from "@/components/layouts/AppShell";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompaniesLoading() {
  return (
    <ProtectedLayout>
      <AppShell pageTitle="Sociétés" pageSubtext="Gestion globale">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-primary/10 text-primary">
                <Building2 size={24} />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Button className="gap-2 shadow-md" disabled>
              <RefreshCw size={18} className="animate-spin" />
              Chargement...
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 md:px-6">
            <div className="relative flex-1 min-w-52 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                disabled
                placeholder="Rechercher..."
                className="h-10 border-border/70 bg-background pl-9"
              />
            </div>
            <Skeleton className="h-10 w-40 rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Chargement des sociétés...</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/70">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </ProtectedLayout>
  );
}
