export function canonicalCategory(category) {
  const raw = String(category || "").trim();
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if ([
    "food",
    "dining",
    "grocery",
    "groceries",
    "foodanddining",
    "diningoutdelivery",
    "diningoutfooddelivery",
    "fooddelivery",
    "restaurant",
    "restaurants",
  ].includes(normalized)) {
    return "Food & Dining";
  }
  return raw || "Other";
}