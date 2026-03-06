"""
Data cleaning and transformation module for Databotics.
Provides advanced data cleaning, missing value handling, and column transformations.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Union
from enum import Enum
from pydantic import BaseModel


# ============================================================================
# Enums
# ============================================================================

class MissingValueStrategy(str, Enum):
    """Strategy for handling missing values."""
    DROP = "drop"  # Drop rows with missing values
    MEAN = "mean"  # Fill with mean (numeric only)
    MEDIAN = "median"  # Fill with median (numeric only)
    MODE = "mode"  # Fill with mode (categorical)
    FORWARD_FILL = "forward_fill"  # Forward fill (time series)
    BACKWARD_FILL = "backward_fill"  # Backward fill (time series)
    ZERO = "zero"  # Fill with 0
    UNKNOWN = "unknown"  # Fill with 'Unknown' (categorical)


class NormalizationMethod(str, Enum):
    """Method for numeric normalization."""
    MIN_MAX = "min_max"  # Scale to [0, 1]
    Z_SCORE = "z_score"  # Standardize (mean=0, std=1)
    LOG = "log"  # Log transformation (for positive values)
    ROBUST = "robust"  # Robust scaling using quantiles


# ============================================================================
# Pydantic Models
# ============================================================================

class CleaningOperation(BaseModel):
    """Single cleaning operation to apply."""
    operation: str  # 'remove_duplicates', 'drop_columns', 'fill_missing', 'remove_nulls'
    columns: Optional[List[str]] = None  # Affected columns
    strategy: Optional[str] = None  # Strategy for fill_missing


class CleaningPlan(BaseModel):
    """Plan for data cleaning with multiple operations."""
    operations: List[CleaningOperation]
    remove_duplicates: bool = False
    drop_columns: Optional[List[str]] = None
    fill_missing_strategy: Optional[str] = None  # Default strategy for all columns
    remove_rows_with_nulls: bool = False


class TransformationRequest(BaseModel):
    """Request for column transformation."""
    column: str
    transformation: str  # 'normalize', 'scale', 'one_hot_encode', 'log', 'square_root'
    method: Optional[str] = None  # Method-specific (e.g., 'min_max' for normalize)
    reference_data: Optional[Dict[str, Any]] = None  # For inverse transform


class CleaningReport(BaseModel):
    """Report of cleaning operations performed."""
    original_shape: tuple
    final_shape: tuple
    rows_removed: int
    columns_removed: int
    operations: List[Dict[str, Any]]
    warnings: List[str]
    summary: Dict[str, Any]


# ============================================================================
# Core Cleaning Functions
# ============================================================================

def remove_duplicates(df: pd.DataFrame, subset: Optional[List[str]] = None, keep: str = 'first') -> pd.DataFrame:
    """
    Remove duplicate rows.
    
    Args:
        df: DataFrame
        subset: Columns to consider for duplicates (None = all columns)
        keep: 'first', 'last', or False (remove all duplicates)
        
    Returns:
        DataFrame with duplicates removed
    """
    initial_len = len(df)
    df_dedup = df.drop_duplicates(subset=subset, keep=keep)
    removed = initial_len - len(df_dedup)
    
    return df_dedup, removed


def drop_columns(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    """
    Drop columns from DataFrame.
    
    Args:
        df: DataFrame
        columns: Column names to drop
        
    Returns:
        DataFrame with columns removed
    """
    existing_cols = [c for c in columns if c in df.columns]
    if len(existing_cols) == 0:
        raise ValueError(f"None of the specified columns exist in dataset")
    
    return df.drop(columns=existing_cols), len(existing_cols)


def drop_rows_with_nulls(df: pd.DataFrame, columns: Optional[List[str]] = None, how: str = 'any') -> pd.DataFrame:
    """
    Drop rows with null values.
    
    Args:
        df: DataFrame
        columns: Specific columns to check (None = all)
        how: 'any' (drop if any null), 'all' (drop if all null)
        
    Returns:
        DataFrame with rows removed
    """
    initial_len = len(df)
    
    if columns:
        # Check only specific columns
        df_clean = df.dropna(subset=columns, how=how)
    else:
        # Check all columns
        df_clean = df.dropna(how=how)
    
    removed = initial_len - len(df_clean)
    return df_clean, removed


def fill_missing_numeric(df: pd.DataFrame, column: str, strategy: str = 'median') -> pd.DataFrame:
    """
    Fill missing values in numeric column.
    
    Args:
        df: DataFrame
        column: Column name
        strategy: 'mean', 'median', 'zero', 'forward_fill', 'backward_fill'
        
    Returns:
        DataFrame with values filled
    """
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found")
    
    if not pd.api.types.is_numeric_dtype(df[column]):
        raise ValueError(f"Column '{column}' is not numeric")
    
    df_filled = df.copy()
    
    if strategy == 'mean':
        fill_value = df_filled[column].mean()
        df_filled[column].fillna(fill_value, inplace=True)
    elif strategy == 'median':
        fill_value = df_filled[column].median()
        df_filled[column].fillna(fill_value, inplace=True)
    elif strategy == 'zero':
        df_filled[column].fillna(0, inplace=True)
    elif strategy == 'forward_fill':
        df_filled[column].fillna(method='ffill', inplace=True)
    elif strategy == 'backward_fill':
        df_filled[column].fillna(method='bfill', inplace=True)
    else:
        raise ValueError(f"Unknown strategy: {strategy}")
    
    return df_filled


def fill_missing_categorical(df: pd.DataFrame, column: str, strategy: str = 'mode') -> pd.DataFrame:
    """
    Fill missing values in categorical column.
    
    Args:
        df: DataFrame
        column: Column name
        strategy: 'mode', 'unknown', 'forward_fill', 'backward_fill'
        
    Returns:
        DataFrame with values filled
    """
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found")
    
    df_filled = df.copy()
    
    if strategy == 'mode':
        mode_val = df_filled[column].mode()
        if len(mode_val) > 0:
            df_filled[column].fillna(mode_val[0], inplace=True)
    elif strategy == 'unknown':
        df_filled[column].fillna('Unknown', inplace=True)
    elif strategy == 'forward_fill':
        df_filled[column].fillna(method='ffill', inplace=True)
    elif strategy == 'backward_fill':
        df_filled[column].fillna(method='bfill', inplace=True)
    else:
        raise ValueError(f"Unknown strategy: {strategy}")
    
    return df_filled


def apply_cleaning_plan(df: pd.DataFrame, plan: CleaningPlan) -> tuple:
    """
    Apply a comprehensive cleaning plan to DataFrame.
    
    Args:
        df: DataFrame to clean
        plan: CleaningPlan with all operations
        
    Returns:
        (cleaned_df, cleaning_report)
    """
    original_shape = df.shape
    df_clean = df.copy()
    operations_log = []
    warnings = []
    
    # Remove duplicates
    if plan.remove_duplicates:
        df_clean, removed = remove_duplicates(df_clean)
        operations_log.append({'operation': 'remove_duplicates', 'rows_removed': removed})
    
    # Drop columns
    if plan.drop_columns:
        try:
            df_clean, col_count = drop_columns(df_clean, plan.drop_columns)
            operations_log.append({'operation': 'drop_columns', 'columns_removed': col_count})
        except ValueError as e:
            warnings.append(str(e))
    
    # Fill missing values
    if plan.fill_missing_strategy:
        strategy = plan.fill_missing_strategy
        
        # Apply to numeric columns
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df_clean[col].isnull().sum() > 0:
                try:
                    df_clean = fill_missing_numeric(df_clean, col, strategy)
                except (ValueError, AttributeError):
                    warnings.append(f"Could not fill missing values in '{col}' with strategy '{strategy}'")
        
        # Apply to categorical columns
        cat_cols = df_clean.select_dtypes(include=['object']).columns
        for col in cat_cols:
            if df_clean[col].isnull().sum() > 0:
                try:
                    df_clean = fill_missing_categorical(df_clean, col, strategy)
                except ValueError:
                    warnings.append(f"Could not fill missing values in '{col}' with strategy '{strategy}'")
        
        operations_log.append({'operation': 'fill_missing', 'strategy': strategy})
    
    # Remove rows with nulls
    if plan.remove_rows_with_nulls:
        df_clean, removed = drop_rows_with_nulls(df_clean)
        operations_log.append({'operation': 'remove_rows_with_nulls', 'rows_removed': removed})
    
    # Build report
    report = CleaningReport(
        original_shape=original_shape,
        final_shape=df_clean.shape,
        rows_removed=original_shape[0] - df_clean.shape[0],
        columns_removed=original_shape[1] - df_clean.shape[1],
        operations=operations_log,
        warnings=warnings,
        summary={
            'duplicates_removed': any(op['operation'] == 'remove_duplicates' for op in operations_log),
            'columns_dropped': original_shape[1] - df_clean.shape[1],
            'rows_removed': original_shape[0] - df_clean.shape[0],
            'missing_values_filled': plan.fill_missing_strategy is not None,
        }
    )
    
    return df_clean, report


# ============================================================================
# Transformation Functions
# ============================================================================

def normalize_column(df: pd.DataFrame, column: str, method: str = 'min_max') -> tuple:
    """
    Normalize numeric column to [0, 1] or standardize.
    
    Args:
        df: DataFrame
        column: Column name
        method: 'min_max', 'z_score', 'robust'
        
    Returns:
        (normalized_df, transformation_params)
    """
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found")
    
    if not pd.api.types.is_numeric_dtype(df[column]):
        raise ValueError(f"Column '{column}' must be numeric")
    
    df_transformed = df.copy()
    col_data = df_transformed[column].dropna()
    
    if method == 'min_max':
        min_val = col_data.min()
        max_val = col_data.max()
        
        if max_val == min_val:
            warnings.warn(f"Column '{column}' has constant value")
            df_transformed[column] = 0
        else:
            df_transformed[column] = (df_transformed[column] - min_val) / (max_val - min_val)
        
        params = {'method': 'min_max', 'min': float(min_val), 'max': float(max_val)}
    
    elif method == 'z_score':
        mean_val = col_data.mean()
        std_val = col_data.std()
        
        if std_val == 0:
            warnings.warn(f"Column '{column}' has zero std")
            df_transformed[column] = 0
        else:
            df_transformed[column] = (df_transformed[column] - mean_val) / std_val
        
        params = {'method': 'z_score', 'mean': float(mean_val), 'std': float(std_val)}
    
    elif method == 'robust':
        q1 = col_data.quantile(0.25)
        q3 = col_data.quantile(0.75)
        iqr = q3 - q1
        median_val = col_data.median()
        
        if iqr == 0:
            warnings.warn(f"Column '{column}' has zero IQR")
            df_transformed[column] = 0
        else:
            df_transformed[column] = (df_transformed[column] - median_val) / iqr
        
        params = {'method': 'robust', 'median': float(median_val), 'iqr': float(iqr)}
    
    else:
        raise ValueError(f"Unknown normalization method: {method}")
    
    return df_transformed, params


def log_transform(df: pd.DataFrame, column: str, base: float = np.e) -> tuple:
    """
    Apply log transformation to numeric column.
    
    Args:
        df: DataFrame
        column: Column name
        base: Log base (default: e for natural log)
        
    Returns:
        (transformed_df, params)
    """
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found")
    
    if not pd.api.types.is_numeric_dtype(df[column]):
        raise ValueError(f"Column '{column}' must be numeric")
    
    df_transformed = df.copy()
    col_data = df_transformed[column]
    
    # Check for non-positive values
    if (col_data <= 0).any():
        raise ValueError(f"Column '{column}' contains non-positive values (log requires positive values)")
    
    if base == np.e:
        df_transformed[column] = np.log(col_data)
    else:
        df_transformed[column] = np.log(col_data) / np.log(base)
    
    return df_transformed, {'method': 'log', 'base': float(base)}


def one_hot_encode(df: pd.DataFrame, column: str, drop_original: bool = True) -> tuple:
    """
    One-hot encode categorical column.
    
    Args:
        df: DataFrame
        column: Column name
        drop_original: Whether to drop original column
        
    Returns:
        (encoded_df, column_mapping)
    """
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found")
    
    df_encoded = df.copy()
    
    # Get dummies
    dummies = pd.get_dummies(df_encoded[column], prefix=column)
    df_encoded = pd.concat([df_encoded, dummies], axis=1)
    
    if drop_original:
        df_encoded = df_encoded.drop(columns=[column])
    
    # Create mapping
    mapping = {
        'original_column': column,
        'new_columns': list(dummies.columns),
        'unique_values': df[column].unique().tolist(),
        'value_counts': df[column].value_counts().to_dict(),
    }
    
    return df_encoded, mapping


def scale_numeric(df: pd.DataFrame, column: str, target_min: float = 0, target_max: float = 100) -> tuple:
    """
    Scale numeric column to target range.
    
    Args:
        df: DataFrame
        column: Column name
        target_min: Target minimum value
        target_max: Target maximum value
        
    Returns:
        (scaled_df, scaling_params)
    """
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found")
    
    if not pd.api.types.is_numeric_dtype(df[column]):
        raise ValueError(f"Column '{column}' must be numeric")
    
    df_scaled = df.copy()
    col_data = df_scaled[column].dropna()
    
    min_val = col_data.min()
    max_val = col_data.max()
    
    if max_val == min_val:
        df_scaled[column] = target_min
    else:
        # Scale from [min_val, max_val] to [target_min, target_max]
        df_scaled[column] = (df_scaled[column] - min_val) / (max_val - min_val) * (target_max - target_min) + target_min
    
    return df_scaled, {
        'original_min': float(min_val),
        'original_max': float(max_val),
        'target_min': float(target_min),
        'target_max': float(target_max),
    }


# ============================================================================
# Utility Functions
# ============================================================================

def get_missing_value_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """Get summary of missing values in DataFrame."""
    missing = df.isnull().sum()
    missing_pct = (missing / len(df) * 100).round(2)
    
    return {
        'total_missing': int(missing.sum()),
        'columns_with_missing': {
            col: {
                'count': int(missing[col]),
                'percentage': float(missing_pct[col])
            }
            for col in missing[missing > 0].index
        }
    }


def suggest_cleaning_operations(df: pd.DataFrame) -> Dict[str, Any]:
    """Suggest cleaning operations based on data quality."""
    suggestions = {
        'duplicates': len(df) - len(df.drop_duplicates()),
        'missing_columns': list(df.columns[df.isnull().any()]),
        'high_cardinality': [col for col in df.columns if df[col].nunique() > len(df) * 0.9],
        'low_variance': [col for col in df.select_dtypes(include=[np.number]).columns if df[col].std() < df[col].mean() * 0.01],
    }
    
    return suggestions
