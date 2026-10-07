"""
Category-Isolated Anomaly Detection Engine — Pure NumPy/Python Implementation.

Multi-phase ensemble detector with strict per-category ("multiverse") separation.

Phase 0 (Cold-Start, <8 unique days):
  Median × 3 rule. Requires ≥4 transactions to compute stable median.

Phase 1 (Mature, ≥8 unique days):
  Ensemble of K-Means Clustering + Neural Autoencoder.
    Ensemble score = 0.4 × s_kmeans + 0.6 × s_autoencoder
    Anomaly flagged if ensemble score > 0.65 or amount > 3× the universe median.

Feature representation per transaction:
  x = [clip(amount/5000, 0, 1.5), (dayOfWeek-1)/6, hourOfDay/23]

Category Universes:
    FOOD     → Food, Dining, Groceries
  SHOPPING → Shopping, Entertainment, Lifestyle
  OTHERS   → Housing, Transport, Utilities, Healthcare, Education, Debt, Other, Investment
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import numpy as np
from app.services.categories import canonical_category

# ─── Constants ───────────────────────────────────────────────────────────────

ANOMALY_THRESHOLD = 0.65
KMEANS_WEIGHT = 0.4
AUTOENCODER_WEIGHT = 0.6
KMEANS_K = 3
KMEANS_ITERATIONS = 50
AUTOENCODER_LR = 0.01
PHASE1_MIN_DAYS = 8
PHASE0_MIN_TRANSACTIONS = 4
MEDIAN_MULTIPLIER = 3.0

CATEGORY_UNIVERSE_MAP = {
    "Food & Dining": "FOOD",
    "Food": "FOOD",
    "Dining": "FOOD",
    "Groceries": "FOOD",
    "Dining Out & Delivery": "FOOD",
    "Dining Out & Food Delivery": "FOOD",
    "Food Delivery": "FOOD",
    "Restaurants": "FOOD",
    "Shopping": "SHOPPING",
    "Entertainment": "SHOPPING",
    "Lifestyle": "SHOPPING",
    "Travel": "SHOPPING",
    "Housing": "OTHERS",
    "Transport": "OTHERS",
    "Utilities": "OTHERS",
    "Healthcare": "OTHERS",
    "Education": "OTHERS",
    "Insurance": "OTHERS",
    "Mandatory EMI": "OTHERS",
    "Debt": "OTHERS",
    "Extra Loan Repayment": "OTHERS",
    "Other": "OTHERS",
    "Investment": "OTHERS",
    "Mutual Funds": "OTHERS",
    "Fixed Deposit": "OTHERS",
    "Stocks": "OTHERS",
    "Emergency Fund": "OTHERS",
    "Gold": "OTHERS",
    "Provident Fund": "OTHERS",
    "Income": "OTHERS",
    "Scenario change": "OTHERS",
    "Extra investment": "OTHERS",
}

UNIVERSE_NAMES = ["FOOD", "SHOPPING", "OTHERS"]


def get_universe(category: str) -> str:
    if not category:
        return "OTHERS"
    category_clean = canonical_category(category)
    normalized = "".join(character for character in category_clean.casefold() if character.isalnum())
    for known_category, universe in CATEGORY_UNIVERSE_MAP.items():
        known_normalized = "".join(character for character in known_category.casefold() if character.isalnum())
        if normalized == known_normalized:
            return universe
    slug = category_clean.upper().replace(" ", "_").replace("-", "_")
    return f"CATEGORY_{slug}"


def format_universe_display_name(universe: str) -> str:
    """Format category universe identifier into a clean user-facing title."""
    if not universe:
        return "Bills & Other"
    if universe == "FOOD":
        return "Food & Dining"
    if universe == "SHOPPING":
        return "Shopping & Entertainment"
    if universe == "OTHERS":
        return "Bills & Other"

    name = universe
    if name.startswith("CATEGORY_"):
        name = name[len("CATEGORY_"):]

    parts = [p for p in name.replace("-", "_").split("_") if p]
    formatted = []
    for p in parts:
        u = p.upper()
        if u in {"EMI", "OTT", "FD", "SIP", "PPF", "NPS", "EPF", "GST", "UPI"}:
            formatted.append(u)
        else:
            formatted.append(u.capitalize())
    return " ".join(formatted) or name


# ─── Feature Extraction ─────────────────────────────────────────────────────

def extract_features(transaction: dict) -> np.ndarray:
    """Convert a transaction to a normalized 3D feature vector."""
    amount = transaction.get("amount", 0.0)
    x_amount = min(max(amount / 5000.0, 0.0), 1.5)

    date_str = transaction.get("date", "")
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d") if isinstance(date_str, str) else date_str
        x_day = (dt.weekday()) / 6.0  # Monday=0, Sunday=6
        x_hour = getattr(dt, "hour", 12) / 23.0
    except (ValueError, AttributeError):
        x_day = 0.5
        x_hour = 0.5

    return np.array([x_amount, x_day, x_hour], dtype=np.float64)


# ─── Anomaly Result ─────────────────────────────────────────────────────────

@dataclass
class AnomalyResult:
    is_anomaly: bool
    score: float
    phase: int  # 0 or 1
    kmeans_score: float
    autoencoder_score: float
    reason: str


# ─── K-Means Detector ───────────────────────────────────────────────────────

class KMeansDetector:
    """
    Behavioral clustering with K=3, Lloyd's algorithm.
    Anomaly score: z-score of Euclidean distance to nearest centroid, clipped to [0,1].
    """

    def __init__(self):
        self.centroids: Optional[np.ndarray] = None
        self.mean_dist: float = 0.0
        self.std_dist: float = 1.0
        self.trained = False

    def train(self, features: np.ndarray):
        """Train K-Means on a matrix of feature vectors (N × 3)."""
        n = features.shape[0]
        if n < KMEANS_K:
            return

        # Initialize centroids randomly from data points
        rng = np.random.default_rng(42)
        indices = rng.choice(n, KMEANS_K, replace=False)
        centroids = features[indices].copy()

        for _ in range(KMEANS_ITERATIONS):
            # Assign each point to nearest centroid
            dists = np.linalg.norm(features[:, None, :] - centroids[None, :, :], axis=2)  # (N, K)
            assignments = np.argmin(dists, axis=1)

            # Update centroids
            new_centroids = np.zeros_like(centroids)
            for k in range(KMEANS_K):
                mask = assignments == k
                if mask.any():
                    new_centroids[k] = features[mask].mean(axis=0)
                else:
                    new_centroids[k] = centroids[k]
            centroids = new_centroids

        self.centroids = centroids

        # Compute distance statistics
        all_dists = np.min(np.linalg.norm(features[:, None, :] - centroids[None, :, :], axis=2), axis=1)
        self.mean_dist = float(np.mean(all_dists))
        self.std_dist = float(np.std(all_dists)) or 1.0
        self.trained = True

    def score(self, x: np.ndarray) -> float:
        """Compute anomaly score for a single feature vector."""
        if not self.trained or self.centroids is None:
            return 0.0

        dist = float(np.min(np.linalg.norm(x - self.centroids, axis=1)))
        z = (dist - self.mean_dist) / self.std_dist
        return float(np.clip(z / 3.0, 0.0, 1.0))


# ─── Autoencoder Detector ───────────────────────────────────────────────────

@dataclass
class AutoencoderWeights:
    """
    Pure-Kotlin-style neural autoencoder weights.
    Network topology: 3 → 2 (ReLU) → 3 (Linear)
    Total parameters: (3×2) + 2 + (2×3) + 3 = 17
    """
    W_enc: list[list[float]] = field(default_factory=lambda: [[0.1, 0.1], [0.1, 0.1], [0.1, 0.1]])  # 3×2
    b_enc: list[float] = field(default_factory=lambda: [0.0, 0.0])  # 2
    W_dec: list[list[float]] = field(default_factory=lambda: [[0.1, 0.1, 0.1], [0.1, 0.1, 0.1]])  # 2×3
    b_dec: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])  # 3

    def to_list(self) -> list[float]:
        """Serialize to flat list of 17 floats."""
        flat = []
        for row in self.W_enc:
            flat.extend(row)
        flat.extend(self.b_enc)
        for row in self.W_dec:
            flat.extend(row)
        flat.extend(self.b_dec)
        return flat

    @classmethod
    def from_list(cls, values: list[float]) -> "AutoencoderWeights":
        if len(values) != 17:
            return cls()
        W_enc = [values[0:2], values[2:4], values[4:6]]
        b_enc = values[6:8]
        W_dec = [values[8:11], values[11:14]]
        b_dec = values[14:17]
        return cls(W_enc=W_enc, b_enc=b_enc, W_dec=W_dec, b_dec=b_dec)

    def reset(self):
        self.W_enc = [[0.1, 0.1], [0.1, 0.1], [0.1, 0.1]]
        self.b_enc = [0.0, 0.0]
        self.W_dec = [[0.1, 0.1, 0.1], [0.1, 0.1, 0.1]]
        self.b_dec = [0.0, 0.0, 0.0]


class AutoencoderDetector:
    """
    Pure-Python neural autoencoder for anomaly detection.
    Learns non-linear correlations between spending amount, time, and day-of-week.
    """

    def __init__(self, weights: Optional[AutoencoderWeights] = None):
        self.weights = weights or AutoencoderWeights()

    def _forward(self, x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Forward pass: returns (hidden activations, reconstruction)."""
        W_enc = np.array(self.weights.W_enc, dtype=np.float64)  # (3, 2)
        b_enc = np.array(self.weights.b_enc, dtype=np.float64)  # (2,)
        W_dec = np.array(self.weights.W_dec, dtype=np.float64)  # (2, 3)
        b_dec = np.array(self.weights.b_dec, dtype=np.float64)  # (3,)

        # Encoder: h = ReLU(x · W_enc + b_enc)
        h = np.maximum(0.0, x @ W_enc + b_enc)

        # Decoder: x' = h · W_dec + b_dec
        x_prime = h @ W_dec + b_dec

        return h, x_prime

    def score(self, x: np.ndarray) -> float:
        """Compute anomaly score based on reconstruction error."""
        _, x_prime = self._forward(x)
        mse = float(np.mean((x - x_prime) ** 2))
        # Clip to [0, 1.5] range then normalize
        return float(np.clip(mse, 0.0, 1.5))

    def train_step(self, x: np.ndarray) -> float:
        """
        One forward/backward SGD step on a single sample.
        Returns the reconstruction loss.
        """
        W_enc = np.array(self.weights.W_enc, dtype=np.float64)
        b_enc = np.array(self.weights.b_enc, dtype=np.float64)
        W_dec = np.array(self.weights.W_dec, dtype=np.float64)
        b_dec = np.array(self.weights.b_dec, dtype=np.float64)

        # Forward
        pre_h = x @ W_enc + b_enc
        h = np.maximum(0.0, pre_h)
        x_prime = h @ W_dec + b_dec

        # Loss
        loss = float(np.mean((x - x_prime) ** 2))
        if not math.isfinite(loss):
            self.weights.reset()
            return float("inf")

        # Backward: output error
        dL_dx_prime = -2.0 * (x - x_prime) / 3.0  # (3,)

        # Decoder gradients
        dL_dW_dec = np.outer(h, dL_dx_prime)  # (2, 3)
        dL_db_dec = dL_dx_prime  # (3,)

        # Encoder gradients (through ReLU)
        delta_h = (dL_dx_prime @ W_dec.T) * (pre_h > 0).astype(float)  # (2,)
        dL_dW_enc = np.outer(x, delta_h)  # (3, 2)
        dL_db_enc = delta_h  # (2,)

        # SGD update
        W_enc -= AUTOENCODER_LR * dL_dW_enc
        b_enc -= AUTOENCODER_LR * dL_db_enc
        W_dec -= AUTOENCODER_LR * dL_dW_dec
        b_dec -= AUTOENCODER_LR * dL_db_dec

        # Safety check
        if all(np.all(np.isfinite(arr)) for arr in [W_enc, b_enc, W_dec, b_dec]):
            self.weights.W_enc = W_enc.tolist()
            self.weights.b_enc = b_enc.tolist()
            self.weights.W_dec = W_dec.tolist()
            self.weights.b_dec = b_dec.tolist()
        else:
            self.weights.reset()

        return loss

    def train_batch(self, features: np.ndarray):
        """Train on a batch of feature vectors."""
        for x in features:
            self.train_step(x)


# ─── Ensemble Manager (Per-Category) ────────────────────────────────────────

@dataclass
class CategoryBrain:
    """State for one category universe's anomaly detection."""
    universe: str
    kmeans: KMeansDetector = field(default_factory=KMeansDetector)
    autoencoder: AutoencoderDetector = field(default_factory=AutoencoderDetector)
    transaction_count: int = 0
    unique_days: int = 0
    median_amount: float = 0.0

    @property
    def phase(self) -> int:
        return 1 if self.unique_days >= PHASE1_MIN_DAYS else 0


class AnomalyEnsembleManager:
    """
    Manages per-category anomaly detection brains.
    Each category universe has its own isolated detector.
    """

    def __init__(self):
        self.brains: dict[str, CategoryBrain] = {
            name: CategoryBrain(universe=name) for name in UNIVERSE_NAMES
        }

    def _get_brain(self, universe: str) -> CategoryBrain:
        if universe not in self.brains:
            self.brains[universe] = CategoryBrain(universe=universe)
        return self.brains[universe]

    def train_all(self, transactions: list[dict]):
        """Full (re)training from a list of transactions.

        Transactions marked with model_training_excluded=True are skipped so that
        user-discarded anomalies never corrupt the learned baseline.
        """
        # Clear derived baseline statistics before rebuilding them from current data.
        for brain in self.brains.values():
            brain.transaction_count = 0
            brain.unique_days = 0
            brain.median_amount = 0.0
            brain.kmeans = KMeansDetector()

        # Group transactions by universe dynamically
        grouped: dict[str, list[dict]] = {}
        for txn in transactions:
            if txn.get("type") != "expense":
                continue
            # Skip transactions the user has explicitly excluded from training
            if txn.get("model_training_excluded"):
                continue
            # Keep unresolved anomalies out of future baselines until acknowledged
            if txn.get("anomaly_flag") and not txn.get("acknowledged", False):
                continue
            universe = get_universe(txn.get("category", "Other"))
            grouped.setdefault(universe, []).append(txn)

        for universe, txns in grouped.items():
            brain = self._get_brain(universe)
            brain.transaction_count = len(txns)

            if not txns:
                continue

            # Count unique days
            unique_dates = set()
            amounts = []
            for txn in txns:
                try:
                    dt = datetime.strptime(txn["date"], "%Y-%m-%d") if isinstance(txn["date"], str) else txn["date"]
                    unique_dates.add(dt.date() if hasattr(dt, "date") else dt)
                except (ValueError, KeyError):
                    pass
                amounts.append(txn.get("amount", 0.0))

            brain.unique_days = len(unique_dates)
            brain.median_amount = float(np.median(amounts)) if amounts else 0.0

            # Phase 1: train ensemble if mature
            if brain.phase == 1:
                features = np.array([extract_features(txn) for txn in txns])
                brain.kmeans.train(features)
                brain.autoencoder.train_batch(features)

    def detect(self, transaction: dict) -> AnomalyResult:
        """
        Check if a transaction is anomalous.
        Uses Phase 0 or Phase 1 depending on data maturity.
        """
        if transaction.get("type") != "expense":
            return AnomalyResult(
                is_anomaly=False, score=0.0, phase=-1,
                kmeans_score=0.0, autoencoder_score=0.0,
                reason="Not an expense transaction."
            )

        universe = get_universe(transaction.get("category", "Other"))
        brain = self._get_brain(universe)
        disp_name = format_universe_display_name(universe)

        if brain.transaction_count < PHASE0_MIN_TRANSACTIONS:
            return AnomalyResult(
                is_anomaly=False, score=0.0, phase=0,
                kmeans_score=0.0, autoencoder_score=0.0,
                reason=f"Insufficient data for {disp_name} ({brain.transaction_count}/{PHASE0_MIN_TRANSACTIONS} transactions)."
            )

        amount = transaction.get("amount", 0.0)

        # Phase 0: Median rule
        if brain.phase == 0:
            amount_limit = max(MEDIAN_MULTIPLIER * brain.median_amount, 1.0)
            is_anomaly = amount > amount_limit
            score = min(amount / amount_limit, 1.0)
            return AnomalyResult(
                is_anomaly=is_anomaly and not transaction.get("acknowledged", False) and not transaction.get("model_training_excluded", False),
                score=round(score, 4),
                phase=0,
                kmeans_score=0.0,
                autoencoder_score=0.0,
                reason=f"Baseline check: Amount {'exceeds' if is_anomaly else 'within'} {MEDIAN_MULTIPLIER}× median ({brain.median_amount:.0f}) for {disp_name}."
            )

        # Phase 1: Ensemble
        x = extract_features(transaction)
        s_kmeans = brain.kmeans.score(x)
        s_autoencoder = brain.autoencoder.score(x)
        ensemble_score = KMEANS_WEIGHT * s_kmeans + AUTOENCODER_WEIGHT * s_autoencoder
        amount_limit = max(MEDIAN_MULTIPLIER * brain.median_amount, 1.0)
        amount_score = min(amount / amount_limit, 1.0)
        score_final = max(ensemble_score, amount_score)
        is_anomaly = ensemble_score > ANOMALY_THRESHOLD or amount > amount_limit

        return AnomalyResult(
            is_anomaly=is_anomaly and not transaction.get("acknowledged", False) and not transaction.get("model_training_excluded", False),
            score=round(score_final, 4),
            phase=1,
            kmeans_score=round(s_kmeans, 4),
            autoencoder_score=round(s_autoencoder, 4),
            reason=f""
        )

    def train_on_feedback(self, transaction: dict):
        """Human-in-the-loop: retrain autoencoder on an acknowledged transaction."""
        universe = get_universe(transaction.get("category", "Other"))
        brain = self._get_brain(universe)
        x = extract_features(transaction)
        brain.autoencoder.train_step(x)

    def get_status(self) -> dict[str, dict]:
        """Per-category data maturity and phase status."""
        status = {}
        for name, brain in self.brains.items():
            status[name] = {
                "universe": name,
                "display_name": format_universe_display_name(name),
                "phase": brain.phase,
                "transaction_count": brain.transaction_count,
                "unique_days": brain.unique_days,
                "median_amount": round(brain.median_amount, 2),
                "days_until_phase1": max(PHASE1_MIN_DAYS - brain.unique_days, 0),
                "kmeans_trained": brain.kmeans.trained,
                "autoencoder_params": 17,
            }
        return status

    def get_autoencoder_weights(self, universe: str) -> AutoencoderWeights:
        return self._get_brain(universe).autoencoder.weights

    def set_autoencoder_weights(self, universe: str, weights: AutoencoderWeights):
        self._get_brain(universe).autoencoder.weights = weights

    def reset(self):
        """Factory reset: reinitialize all brains."""
        self.brains = {name: CategoryBrain(universe=name) for name in UNIVERSE_NAMES}
