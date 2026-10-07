def canonical_category(category: str | None) -> str:
    """Group common food labels together for summaries and budget reporting."""
    raw = (category or "").strip()
    normalized = "".join(character for character in raw.casefold() if character.isalnum())
    if normalized in {
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
    }:
        return "Food & Dining"
    return raw or "Other"