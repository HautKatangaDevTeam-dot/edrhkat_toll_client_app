"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ReportDocument } from "@/pdf/ReportDocument";
import type { ReportMetadata } from "@/types/report";
import type { Receipt } from "@/types/receipt";
import type { TollTransaction } from "@/types/transaction";

type Props = {
  kind?: "transactions" | "receipts";
  transactions: TollTransaction[];
  receipts?: Receipt[];
  chips: string[];
  meta: ReportMetadata;
  companyName?: string;
  generatedBy?: string;
  label?: string;
  isDisabled?: boolean;
};

export function ReportPdfPreview({
  kind = "transactions",
  transactions,
  receipts = [],
  chips,
  meta,
  companyName,
  generatedBy,
  label = "Télécharger PDF",
  isDisabled = false,
}: Props) {
  const [isPreparing, setIsPreparing] = useState(false);

  const handleDownload = async () => {
    if (isDisabled || isPreparing) return;

    setIsPreparing(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <ReportDocument
          kind={kind}
          transactions={transactions}
          receipts={receipts}
          chips={chips}
          meta={{
            dateFrom: meta.dateFrom,
            dateTo: meta.dateTo,
            scopedPost: meta.scopedPost,
            total: meta.total,
            reportFamily: meta.reportFamily,
          }}
          companyName={companyName}
          generatedBy={generatedBy}
        />
      ).toBlob();

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download =
        kind === "receipts" ? "recus-rapport.pdf" : "transactions-rapport.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isDisabled || isPreparing}
      onClick={handleDownload}
    >
      {isPreparing ? "Préparation..." : label}
    </Button>
  );
}
