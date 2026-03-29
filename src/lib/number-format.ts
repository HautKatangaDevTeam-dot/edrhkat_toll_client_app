const compactFormatter = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const preciseFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCompactUsd = (value?: number | null) => {
  const amount = typeof value === "number" ? value : 0;
  return `${compactFormatter.format(amount)} USD`;
};

export const formatPreciseUsd = (value?: number | null) => {
  const amount = typeof value === "number" ? value : 0;
  return `${preciseFormatter.format(amount)} USD`;
};

export const formatCompactNumber = (value?: number | null) => {
  const amount = typeof value === "number" ? value : 0;
  return compactFormatter.format(amount);
};
