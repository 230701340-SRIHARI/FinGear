export function currency(value, compact = false) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(Number(value || 0));
}

export function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}
