import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { Receipt } from "@/types/receipt";
import type { TollTransaction } from "@/types/transaction";

type Props = {
  kind?: "transactions" | "receipts";
  transactions?: TollTransaction[];
  receipts?: Receipt[];
  chips: string[];
  companyName?: string;
  generatedBy?: string;
  meta?: {
    dateFrom?: string;
    dateTo?: string;
    scopedPost?: string;
    total?: number;
    reportFamily?: "financial" | "passage";
  };
};

type FinancialSummaryRow = {
  label: string;
  issuedCount: number;
  consumedCount: number;
  remainingCount: number;
  issuedTotal: number;
  paidTotal: number;
  exoneratedTotal: number;
};

const CLIENT_BLUE = "#2563eb";
const CLIENT_BLUE_DARK = "#1d4ed8";
const CLIENT_BLUE_SOFT = "#dbeafe";
const BORDER = "#d9e4ec";
const TEXT_MUTED = "#64748b";

const formatCurrency = (value: number) => `${value.toFixed(2)} USD`;

const buildFinancialSummary = (receipts: Receipt[]): FinancialSummaryRow[] => {
  const grouped = new Map<string, FinancialSummaryRow>();

  receipts.forEach((receipt) => {
    const key =
      receipt.companyId ??
      receipt.companyCode ??
      "__individual__";
    const label =
      receipt.companyName ??
      receipt.companyCode ??
      "Recettes individuelles";

    const current = grouped.get(key) ?? {
      label,
      issuedCount: 0,
      consumedCount: 0,
      remainingCount: 0,
      issuedTotal: 0,
      paidTotal: 0,
      exoneratedTotal: 0,
    };

    current.issuedCount += 1;
    current.consumedCount += receipt.status === "CONSUMED" ? 1 : 0;
    current.remainingCount += receipt.status === "CONSUMED" ? 0 : 1;
    current.issuedTotal += receipt.tariffAmountUsd ?? 0;
    current.paidTotal += receipt.paidAmountUsd ?? 0;
    current.exoneratedTotal += receipt.exoneratedAmountUsd ?? 0;

    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 28,
    fontSize: 9,
    color: "#172033",
    backgroundColor: "#ffffff",
  },
  headerBand: {
    border: `1pt solid ${CLIENT_BLUE}`,
    borderRadius: 6,
    marginBottom: 14,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    borderBottom: `1pt solid ${BORDER}`,
  },
  identityBlock: {
    padding: 12,
    width: "64%",
  },
  referenceBlock: {
    padding: 12,
    width: "36%",
    backgroundColor: CLIENT_BLUE_SOFT,
    borderLeft: `1pt solid ${BORDER}`,
  },
  brand: {
    fontSize: 9,
    color: CLIENT_BLUE_DARK,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 4,
    fontWeight: "bold",
  },
  organization: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  headerLine: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  titleWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fbff",
  },
  title: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  subtitle: { fontSize: 9, color: TEXT_MUTED, marginTop: 3, lineHeight: 1.4 },
  refLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  refValue: {
    fontSize: 9,
    color: "#0f172a",
    fontWeight: "bold",
    marginBottom: 7,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 0,
    borderRadius: 4,
    border: `1pt solid ${BORDER}`,
    backgroundColor: "#ffffff",
    padding: 10,
  },
  summaryLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryValue: { fontSize: 12, fontWeight: "bold", color: "#0f172a" },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    borderRadius: 3,
    border: `1pt solid ${BORDER}`,
    backgroundColor: "#f8fafc",
    color: "#334155",
    paddingVertical: 3,
    paddingHorizontal: 7,
    fontSize: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  introBlock: {
    border: `1pt solid ${BORDER}`,
    backgroundColor: "#fcfdff",
    padding: 10,
    marginBottom: 12,
    borderRadius: 4,
  },
  introText: {
    fontSize: 8.5,
    color: "#334155",
    lineHeight: 1.5,
  },
  table: {
    border: `1pt solid ${BORDER}`,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eef4ff",
    borderBottom: `1pt solid ${BORDER}`,
  },
  tableHeaderCell: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 8,
    fontWeight: "bold",
    color: CLIENT_BLUE_DARK,
  },
  row: {
    flexDirection: "row",
    borderBottom: `1pt solid ${BORDER}`,
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8,
    color: "#1f2937",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f3f7ff",
    borderTop: `1pt solid ${BORDER}`,
  },
  totalCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 8,
    fontWeight: "bold",
    color: "#0f172a",
  },
  footer: {
    marginTop: 12,
    fontSize: 8,
    color: TEXT_MUTED,
    textAlign: "left",
  },
  signatureWrap: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  signatureBox: {
    flexGrow: 1,
    flexBasis: 0,
    borderTop: `1pt solid ${BORDER}`,
    paddingTop: 8,
  },
  signatureLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
  signatureValue: {
    fontSize: 9,
    marginTop: 18,
    color: "#0f172a",
  },
});

export function ReportDocument({
  kind = "transactions",
  transactions = [],
  receipts = [],
  chips,
  companyName,
  generatedBy,
  meta,
}: Props) {
  const reportTitle =
    kind === "receipts"
      ? meta?.reportFamily === "passage"
        ? "Rapport des passages"
        : "Rapport financier des recus"
      : "Rapport des transactions";

  const headerCompanyName = companyName?.trim() ?? "";

  const summaryItems = [
    { label: "Societe", value: headerCompanyName },
    { label: "Periode", value: `${meta?.dateFrom ?? "N/A"} au ${meta?.dateTo ?? "N/A"}` },
    { label: "Poste", value: meta?.scopedPost ?? "Tous les postes" },
    { label: "Total", value: `${meta?.total ?? (kind === "receipts" ? receipts.length : transactions.length)} ligne(s)` },
  ];
  const financialRows = kind === "receipts" ? buildFinancialSummary(receipts) : [];
  const financialTotals = financialRows.reduce(
    (acc, row) => ({
      issuedCount: acc.issuedCount + row.issuedCount,
      consumedCount: acc.consumedCount + row.consumedCount,
      remainingCount: acc.remainingCount + row.remainingCount,
      issuedTotal: acc.issuedTotal + row.issuedTotal,
      paidTotal: acc.paidTotal + row.paidTotal,
      exoneratedTotal: acc.exoneratedTotal + row.exoneratedTotal,
    }),
    {
      issuedCount: 0,
      consumedCount: 0,
      remainingCount: 0,
      issuedTotal: 0,
      paidTotal: 0,
      exoneratedTotal: 0,
    }
  );
  const generationDate = new Date().toLocaleString("fr-FR");
  const reportReference = `RPT-${(meta?.dateFrom ?? "NA").replaceAll("-", "")}-${(meta?.dateTo ?? "NA").replaceAll("-", "")}`;
  const introText =
    kind === "receipts" && meta?.reportFamily === "financial"
      ? "Le present document presente la situation financiere des recus emis sur la periode selectionnee. Les donnees sont consolidees par entite."
      : "Le present document recense les operations enregistrees sur la periode selectionnee pour les besoins de suivi et de controle.";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View style={styles.headerTop}>
            <View style={styles.identityBlock}>
              <Text style={styles.brand}>EDRHKAT PEAGE</Text>
              <Text style={styles.organization}>Console administrative</Text>
              <Text style={styles.headerLine}>Rapport de gestion</Text>
              <Text style={styles.headerLine}>Service peage</Text>
            </View>
            <View style={styles.referenceBlock}>
              <Text style={styles.refLabel}>Reference</Text>
              <Text style={styles.refValue}>{reportReference}</Text>
              <Text style={styles.refLabel}>Date d&apos;edition</Text>
              <Text style={styles.refValue}>{generationDate}</Text>
            </View>
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{reportTitle}</Text>
            <Text style={styles.subtitle}>
              Document de synthese
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          {summaryItems.map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chipsWrap}>
          {chips.map((chip) => (
            <Text key={chip} style={styles.chip}>
              {chip}
            </Text>
          ))}
        </View>
        <View style={styles.introBlock}>
          <Text style={styles.introText}>{introText}</Text>
        </View>
        <Text style={styles.sectionTitle}>Detail du rapport</Text>
        {kind === "receipts" && meta?.reportFamily === "financial" ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "28%" }]}>Entite</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Recus</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Consommes</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Restants</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Emis</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Encaisse</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Exonere</Text>
            </View>
            {financialRows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={[styles.cell, { width: "28%" }]}>{row.label}</Text>
                <Text style={[styles.cell, { width: "12%" }]}>{row.issuedCount}</Text>
                <Text style={[styles.cell, { width: "12%" }]}>{row.consumedCount}</Text>
                <Text style={[styles.cell, { width: "12%" }]}>{row.remainingCount}</Text>
                <Text style={[styles.cell, { width: "12%" }]}>{formatCurrency(row.issuedTotal)}</Text>
                <Text style={[styles.cell, { width: "12%" }]}>{formatCurrency(row.paidTotal)}</Text>
                <Text style={[styles.cell, { width: "12%" }]}>{formatCurrency(row.exoneratedTotal)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={[styles.totalCell, { width: "28%" }]}>Grand total</Text>
              <Text style={[styles.totalCell, { width: "12%" }]}>{financialTotals.issuedCount}</Text>
              <Text style={[styles.totalCell, { width: "12%" }]}>{financialTotals.consumedCount}</Text>
              <Text style={[styles.totalCell, { width: "12%" }]}>{financialTotals.remainingCount}</Text>
              <Text style={[styles.totalCell, { width: "12%" }]}>{formatCurrency(financialTotals.issuedTotal)}</Text>
              <Text style={[styles.totalCell, { width: "12%" }]}>{formatCurrency(financialTotals.paidTotal)}</Text>
              <Text style={[styles.totalCell, { width: "12%" }]}>{formatCurrency(financialTotals.exoneratedTotal)}</Text>
            </View>
          </View>
        ) : kind === "receipts" ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Code</Text>
              <Text style={[styles.tableHeaderCell, { width: "26%" }]}>Societe / Beneficiaire</Text>
              <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Canal</Text>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Statut / Mode</Text>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Montant</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Poste</Text>
            </View>
            {receipts.map((receipt) => (
              <View key={receipt.id} style={styles.row}>
                <Text style={[styles.cell, { width: "18%" }]}>
                  {receipt.shortCode}
                </Text>
                <Text style={[styles.cell, { width: "26%" }]}>
                  {receipt.companyName ?? receipt.companyCode ?? "Individuel"}
                </Text>
                <Text style={[styles.cell, { width: "16%" }]}>
                  {receipt.channel}
                </Text>
                <Text style={[styles.cell, { width: "14%" }]}>
                  {meta?.reportFamily === "passage"
                    ? receipt.status
                    : receipt.financialMode}
                </Text>
                <Text style={[styles.cell, { width: "14%" }]}>
                  {formatCurrency(receipt.paidAmountUsd)}
                </Text>
                <Text style={[styles.cell, { width: "12%" }]}>
                  {receipt.consumedPost ?? "N/A"}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={[styles.totalCell, { width: "74%" }]}>Grand total</Text>
              <Text style={[styles.totalCell, { width: "14%" }]}>
                {formatCurrency(
                  receipts.reduce((sum, receipt) => sum + receipt.paidAmountUsd, 0)
                )}
              </Text>
              <Text style={[styles.totalCell, { width: "12%" }]}>
                {receipts.length} ligne(s)
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Vehicule</Text>
              <Text style={[styles.tableHeaderCell, { width: "24%" }]}>Societe / Beneficiaire</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Mode</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Montant</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Poste / Trajet</Text>
            </View>
            {transactions.map((tx) => (
              <View key={tx.id} style={styles.row}>
                <Text style={[styles.cell, { width: "14%" }]}>
                  {tx.transactionDate
                    ? new Date(tx.transactionDate).toLocaleDateString("fr-FR")
                    : new Date(tx.createdAt).toLocaleDateString("fr-FR")}
                </Text>
                <Text style={[styles.cell, { width: "18%" }]}>
                  {tx.vehiclePlate ?? "N/A"}
                </Text>
                <Text style={[styles.cell, { width: "24%" }]}>
                  {tx.companyName ?? tx.carrierName ?? "Individuel"}
                </Text>
                <Text style={[styles.cell, { width: "12%" }]}>{tx.paymentMode}</Text>
                <Text style={[styles.cell, { width: "12%" }]}>
                  {formatCurrency(tx.amountPaid ?? tx.amountUsd)}
                </Text>
                <Text style={[styles.cell, { width: "20%" }]}>
                  {tx.postId} / {tx.provenance ?? "N/A"} - {tx.destination ?? "N/A"}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={[styles.totalCell, { width: "68%" }]}>Grand total</Text>
              <Text style={[styles.totalCell, { width: "12%" }]}>
                {formatCurrency(
                  transactions.reduce(
                    (sum, tx) => sum + (tx.amountPaid ?? tx.amountUsd),
                    0
                  )
                )}
              </Text>
              <Text style={[styles.totalCell, { width: "20%" }]}>
                {transactions.length} ligne(s)
              </Text>
            </View>
          </View>
        )}
        <Text style={styles.footer}>
          Etabli par: {generatedBy ?? "systeme"} | Support: Console Peage EDRHKAT
        </Text>
        <View style={styles.signatureWrap}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Etabli par</Text>
            <Text style={styles.signatureValue}>{generatedBy ?? "................................"}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Controle</Text>
            <Text style={styles.signatureValue}>................................</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Visa</Text>
            <Text style={styles.signatureValue}>................................</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
