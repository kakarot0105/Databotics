from typing import List, Dict, Any
import yaml
import pandas as pd
from pathlib import Path
import pkgutil

class RuleError:
    def __init__(self, column: str, message: str, row_sample: Dict[str, Any] | None = None):
        self.column = column
        self.message = message
        self.row_sample = row_sample

    def to_dict(self) -> Dict[str, Any]:
        # Consistent dict shape for tests and JSON responses
        return {
            "column": str(self.column),
            "message": str(self.message),
            "row_sample": self.row_sample if self.row_sample is not None else {},
        }


def load_rules(path: str | Path) -> Dict[str, Any]:
    """
    Load YAML rules. Accepts a filesystem path or a package-relative path
    (e.g. 'ui/validation_rules/basic.yaml'). If the provided path is not
    found on the filesystem, this function will attempt to resolve it
    relative to the Databotics package root.
    """
    p = Path(path)
    if not p.exists():
        # try to resolve relative to the package root
        pkg_root = Path(__file__).resolve().parents[1]  # Databotics/
        candidate = pkg_root / Path(path)
        if candidate.exists():
            p = candidate
    if p.exists():
        with open(p, "r") as f:
            return yaml.safe_load(f)
    # last resort: try to load as package resource via pkgutil (embedded resources)
    try:
        data = pkgutil.get_data(__package__, str(path))
        if data:
            return yaml.safe_load(data.decode("utf-8"))
    except Exception:
        pass
    raise FileNotFoundError(f"Rules file not found: {path}")


def validate_dataframe(df: pd.DataFrame, rules: Dict[str, Any]) -> Dict[str, Any]:
    """
    rules format (example):
    columns:
      name:
        required: true
      age:
        type: int
        min: 0
        max: 120
      email:
        regex: ".+@.+\\..+"
    """
    errors: List[RuleError] = []
    cols_rules = rules.get("columns", {})
    for col, cfg in cols_rules.items():
        # required
        if cfg.get("required"):
            if col not in df.columns or df[col].isnull().all():
                errors.append(RuleError(col, "Missing required column or all values null"))
                continue
        if col not in df.columns:
            continue
        series = df[col]
        # type coercion check
        typ = cfg.get("type")
        if typ:
            try:
                if typ == "int":
                    pd.to_numeric(series.dropna().astype(float), downcast="integer")
                elif typ == "float":
                    pd.to_numeric(series.dropna(), downcast="float")
                elif typ == "str":
                    series.dropna().astype(str)
            except Exception:
                errors.append(RuleError(col, f"Type coercion to {typ} failed", row_sample=series.head(3).to_dict()))
        # range
        if typ in ("int","float"):
            mn = cfg.get("min")
            mx = cfg.get("max")
            if mn is not None:
                bad = series.dropna().apply(pd.to_numeric, errors="coerce") < mn
                if bad.any():
                    errors.append(RuleError(col, f"Values below min {mn}", row_sample=series[bad].head(3).to_dict()))
            if mx is not None:
                bad = series.dropna().apply(pd.to_numeric, errors="coerce") > mx
                if bad.any():
                    errors.append(RuleError(col, f"Values above max {mx}", row_sample=series[bad].head(3).to_dict()))
        # regex
        if cfg.get("regex"):
            import re
            pattern = re.compile(cfg.get("regex"))
            bad = ~series.dropna().astype(str).apply(lambda v: bool(pattern.match(v)))
            if bad.any():
                errors.append(RuleError(col, "Regex mismatch", row_sample=series[bad].head(3).to_dict()))
        # uniqueness
        if cfg.get("unique"):
            dup = series.dropna().duplicated(keep=False)
            if dup.any():
                errors.append(RuleError(col, "Duplicate values found", row_sample=series[dup].head(3).to_dict()))

    return {"errors": [e.to_dict() for e in errors], "summary": {"error_count": len(errors)}}
