"""
Core analytics module for Databotics.
Provides correlation analysis, distribution analysis, outlier detection, and data profiling.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from pydantic import BaseModel


# ============================================================================
# Pydantic Models
# ============================================================================

class DataProfile(BaseModel):
    """Comprehensive data profile with profiling metrics."""
    row_count: int
    column_count: int
    memory_usage_mb: float
    columns: List[Dict[str, Any]]
    missing_summary: Dict[str, Any]
    numeric_summary: Optional[Dict[str, Any]] = None


class CorrelationMatrix(BaseModel):
    """Correlation matrix response."""
    columns: List[str]
    data: List[List[float]]
    method: str = "pearson"


class DistributionAnalysis(BaseModel):
    """Distribution analysis with quartiles and statistics."""
    column_name: str
    dtype: str
    count: int
    missing: int
    unique: int
    
    # For numeric columns
    min: Optional[float] = None
    q1: Optional[float] = None
    median: Optional[float] = None
    mean: Optional[float] = None
    q3: Optional[float] = None
    max: Optional[float] = None
    std: Optional[float] = None
    
    # For categorical columns
    mode: Optional[str] = None
    top_values: Optional[List[Dict[str, Any]]] = None


class OutlierDetectionResult(BaseModel):
    """Outlier detection result using IQR method."""
    column_name: str
    method: str = "iqr"
    outlier_count: int
    outlier_percentage: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    outliers: List[Dict[str, Any]]


class BoxPlotData(BaseModel):
    """Box plot data for visualization."""
    column_name: str
    dtype: str
    min: float
    q1: float
    median: float
    q3: float
    max: float
    mean: float
    std: float
    outliers: List[float]


# ============================================================================
# Core Analytics Functions
# ============================================================================

def profile_data(df: pd.DataFrame) -> DataProfile:
    """
    Generate comprehensive data profile.
    
    Args:
        df: DataFrame to profile
        
    Returns:
        DataProfile object with column-level and dataset-level stats
    """
    memory_mb = df.memory_usage(deep=True).sum() / 1024 / 1024
    
    columns_info = []
    for col in df.columns:
        col_info = {
            'name': str(col),
            'dtype': str(df[col].dtype),
            'non_null_count': int(df[col].count()),
            'null_count': int(df[col].isnull().sum()),
            'unique_count': int(df[col].nunique()),
        }
        
        # Add numeric statistics
        if pd.api.types.is_numeric_dtype(df[col]):
            col_info['stats'] = {
                'min': float(df[col].min()) if not pd.isna(df[col].min()) else None,
                'max': float(df[col].max()) if not pd.isna(df[col].max()) else None,
                'mean': float(df[col].mean()) if not pd.isna(df[col].mean()) else None,
                'median': float(df[col].median()) if not pd.isna(df[col].median()) else None,
                'std': float(df[col].std()) if not pd.isna(df[col].std()) else None,
                'skewness': float(df[col].skew()) if not pd.isna(df[col].skew()) else None,
            }
        
        # Add categorical info
        elif pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_categorical_dtype(df[col]):
            top_values = df[col].value_counts().head(5)
            col_info['top_values'] = [
                {'value': str(v), 'count': int(c), 'percentage': float(c / len(df) * 100)}
                for v, c in top_values.items()
            ]
        
        columns_info.append(col_info)
    
    # Missing values summary
    missing_data = df.isnull().sum()
    missing_pct = (missing_data / len(df) * 100).round(2)
    
    missing_summary = {
        'total_missing': int(missing_data.sum()),
        'columns_with_missing': [
            {
                'column': col,
                'missing_count': int(missing_data[col]),
                'missing_percentage': float(missing_pct[col])
            }
            for col in missing_data[missing_data > 0].index
        ]
    }
    
    # Numeric summary
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    numeric_summary = None
    if len(numeric_cols) > 0:
        numeric_summary = {
            'numeric_columns': list(numeric_cols),
            'count': len(numeric_cols),
            'correlation_available': True,
        }
    
    return DataProfile(
        row_count=len(df),
        column_count=len(df.columns),
        memory_usage_mb=float(memory_mb),
        columns=columns_info,
        missing_summary=missing_summary,
        numeric_summary=numeric_summary,
    )


def compute_correlation_matrix(df: pd.DataFrame, method: str = 'pearson') -> CorrelationMatrix:
    """
    Compute correlation matrix for numeric columns.
    
    Args:
        df: DataFrame to analyze
        method: Correlation method ('pearson', 'spearman', 'kendall')
        
    Returns:
        CorrelationMatrix with numeric column correlations
        
    Raises:
        ValueError: If no numeric columns found
    """
    numeric_df = df.select_dtypes(include=[np.number])
    
    if numeric_df.empty:
        raise ValueError("No numeric columns found in dataset")
    
    # Fill missing values for correlation (use median)
    numeric_filled = numeric_df.fillna(numeric_df.median())
    
    # Compute correlation
    corr_matrix = numeric_filled.corr(method=method)
    
    columns = list(corr_matrix.columns)
    data = corr_matrix.values.tolist()
    
    return CorrelationMatrix(
        columns=columns,
        data=data,
        method=method,
    )


def analyze_distribution(df: pd.DataFrame, column: str) -> DistributionAnalysis:
    """
    Analyze distribution of a single column.
    
    Args:
        df: DataFrame
        column: Column name to analyze
        
    Returns:
        DistributionAnalysis object
        
    Raises:
        ValueError: If column not found
    """
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in dataset")
    
    col_data = df[column]
    
    base_info = {
        'column_name': column,
        'dtype': str(col_data.dtype),
        'count': int(col_data.count()),
        'missing': int(col_data.isnull().sum()),
        'unique': int(col_data.nunique()),
    }
    
    # Numeric columns
    if pd.api.types.is_numeric_dtype(col_data):
        numeric_data = pd.to_numeric(col_data, errors='coerce').dropna()
        
        return DistributionAnalysis(
            **base_info,
            min=float(numeric_data.min()),
            q1=float(numeric_data.quantile(0.25)),
            median=float(numeric_data.median()),
            mean=float(numeric_data.mean()),
            q3=float(numeric_data.quantile(0.75)),
            max=float(numeric_data.max()),
            std=float(numeric_data.std()),
        )
    
    # Categorical columns
    else:
        top_values = col_data.value_counts().head(10)
        top_list = [
            {'value': str(v), 'count': int(c), 'percentage': float(c / len(col_data) * 100)}
            for v, c in top_values.items()
        ]
        mode_value = str(top_values.index[0]) if len(top_values) > 0 else None
        
        return DistributionAnalysis(
            **base_info,
            mode=mode_value,
            top_values=top_list,
        )


def detect_outliers(df: pd.DataFrame, column: str, method: str = 'iqr', threshold: float = 1.5) -> OutlierDetectionResult:
    """
    Detect outliers using IQR (Interquartile Range) method.
    
    Args:
        df: DataFrame
        column: Column to analyze
        method: Detection method ('iqr' supported)
        threshold: IQR multiplier (default 1.5 is standard)
        
    Returns:
        OutlierDetectionResult with outlier indices and values
        
    Raises:
        ValueError: If column is not numeric or not found
    """
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in dataset")
    
    if not pd.api.types.is_numeric_dtype(df[column]):
        raise ValueError(f"Column '{column}' must be numeric for outlier detection")
    
    # Clean data
    data = pd.to_numeric(df[column], errors='coerce')
    clean_data = data.dropna()
    
    if len(clean_data) == 0:
        return OutlierDetectionResult(
            column_name=column,
            method=method,
            outlier_count=0,
            outlier_percentage=0.0,
            outliers=[],
        )
    
    # IQR method
    q1 = clean_data.quantile(0.25)
    q3 = clean_data.quantile(0.75)
    iqr = q3 - q1
    
    lower_bound = q1 - (threshold * iqr)
    upper_bound = q3 + (threshold * iqr)
    
    # Find outliers
    outlier_mask = (clean_data < lower_bound) | (clean_data > upper_bound)
    outlier_indices = clean_data[outlier_mask].index.tolist()
    outlier_values = clean_data[outlier_mask].values.tolist()
    
    outliers_list = [
        {'index': int(idx), 'value': float(val)}
        for idx, val in zip(outlier_indices, outlier_values)
    ]
    
    return OutlierDetectionResult(
        column_name=column,
        method=method,
        outlier_count=len(outliers_list),
        outlier_percentage=float(len(outliers_list) / len(clean_data) * 100),
        lower_bound=float(lower_bound),
        upper_bound=float(upper_bound),
        outliers=outliers_list[:100],  # Limit to first 100
    )


def generate_box_plot_data(df: pd.DataFrame, column: str) -> BoxPlotData:
    """
    Generate box plot data for visualization.
    
    Args:
        df: DataFrame
        column: Numeric column name
        
    Returns:
        BoxPlotData with quartiles and outliers
        
    Raises:
        ValueError: If column is not numeric
    """
    if not pd.api.types.is_numeric_dtype(df[column]):
        raise ValueError(f"Column '{column}' must be numeric")
    
    data = pd.to_numeric(df[column], errors='coerce').dropna()
    
    q1 = data.quantile(0.25)
    q3 = data.quantile(0.75)
    iqr = q3 - q1
    
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    # Find outliers
    outliers = data[(data < lower_bound) | (data > upper_bound)].values.tolist()
    
    return BoxPlotData(
        column_name=column,
        dtype=str(df[column].dtype),
        min=float(data.min()),
        q1=float(q1),
        median=float(data.median()),
        q3=float(q3),
        max=float(data.max()),
        mean=float(data.mean()),
        std=float(data.std()),
        outliers=outliers[:100],  # Limit to first 100
    )


def analyze_all_distributions(df: pd.DataFrame) -> List[DistributionAnalysis]:
    """
    Analyze distribution for all columns.
    
    Args:
        df: DataFrame to analyze
        
    Returns:
        List of DistributionAnalysis objects
    """
    analyses = []
    for col in df.columns:
        try:
            analyses.append(analyze_distribution(df, col))
        except Exception:
            pass  # Skip columns that fail
    return analyses


def analyze_all_outliers(df: pd.DataFrame) -> List[OutlierDetectionResult]:
    """
    Detect outliers in all numeric columns.
    
    Args:
        df: DataFrame to analyze
        
    Returns:
        List of OutlierDetectionResult objects
    """
    results = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    for col in numeric_cols:
        try:
            results.append(detect_outliers(df, col))
        except Exception:
            pass  # Skip columns that fail
    
    return results


def generate_all_box_plots(df: pd.DataFrame) -> List[BoxPlotData]:
    """
    Generate box plot data for all numeric columns.
    
    Args:
        df: DataFrame to analyze
        
    Returns:
        List of BoxPlotData objects
    """
    plots = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    for col in numeric_cols:
        try:
            plots.append(generate_box_plot_data(df, col))
        except Exception:
            pass  # Skip columns that fail
    
    return plots
