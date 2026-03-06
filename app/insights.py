"""
AI-Powered Insights module for Databotics.
Generates smart insights from data using Claude API with fallback strategies.
"""

import pandas as pd
import numpy as np
import json
from typing import Dict, List, Any, Optional
from pydantic import BaseModel


# ============================================================================
# Pydantic Models
# ============================================================================

class Insight(BaseModel):
    """Single insight about the data."""
    title: str
    description: str
    type: str  # 'trend', 'anomaly', 'pattern', 'recommendation', 'opportunity'
    confidence: float  # 0.0-1.0
    supporting_data: Optional[Dict[str, Any]] = None


class InsightReport(BaseModel):
    """Collection of insights from data analysis."""
    dataset_name: Optional[str] = None
    total_rows: int
    total_columns: int
    insights: List[Insight]
    generated_at: Optional[str] = None
    ai_model: str


class NLQueryRequest(BaseModel):
    """Natural language query request."""
    query: str
    columns: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None


class NLQueryResponse(BaseModel):
    """Response to natural language query."""
    query: str
    interpretation: str
    suggested_visualization: str
    sql_equivalent: Optional[str] = None
    data_slice: Optional[List[Dict[str, Any]]] = None


# ============================================================================
# Insight Generation Functions
# ============================================================================

def generate_numeric_insights(df: pd.DataFrame) -> List[Insight]:
    """Generate insights about numeric columns."""
    insights = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    if len(numeric_cols) == 0:
        return insights
    
    # 1. High variance columns
    for col in numeric_cols:
        cv = df[col].std() / df[col].mean() if df[col].mean() != 0 else 0
        if cv > 1.0:
            insights.append(Insight(
                title=f"High variability in {col}",
                description=f"The '{col}' column shows high coefficient of variation ({cv:.2f}), indicating large spread in values relative to the mean. This suggests diverse transaction sizes or amounts.",
                type="pattern",
                confidence=0.85,
                supporting_data={"coefficient_of_variation": float(cv), "column": col}
            ))
    
    # 2. Skewed distributions
    for col in numeric_cols:
        skewness = df[col].skew()
        if abs(skewness) > 1.0:
            direction = "right" if skewness > 0 else "left"
            insights.append(Insight(
                title=f"Skewed distribution in {col}",
                description=f"The '{col}' distribution is highly skewed to the {direction}, suggesting the majority of values cluster on one side with occasional extreme values on the other.",
                type="pattern",
                confidence=0.8,
                supporting_data={"skewness": float(skewness), "column": col}
            ))
    
    # 3. Outliers
    for col in numeric_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        outliers = ((df[col] < q1 - 1.5*iqr) | (df[col] > q3 + 1.5*iqr)).sum()
        outlier_pct = outliers / len(df) * 100
        
        if outlier_pct > 1.0:
            insights.append(Insight(
                title=f"Outliers detected in {col}",
                description=f"Found {outliers} outlier values ({outlier_pct:.1f}% of data) in '{col}' using IQR method. These may represent unusual transactions or data quality issues.",
                type="anomaly",
                confidence=0.75,
                supporting_data={"outlier_count": int(outliers), "outlier_percentage": float(outlier_pct), "column": col}
            ))
    
    # 4. Missing values impact
    for col in numeric_cols:
        missing = df[col].isnull().sum()
        missing_pct = missing / len(df) * 100
        
        if missing_pct > 0.5:
            insights.append(Insight(
                title=f"Significant missing data in {col}",
                description=f"The '{col}' column has {missing} missing values ({missing_pct:.1f}% of rows). Consider imputation or investigation of missing data patterns.",
                type="recommendation",
                confidence=0.9,
                supporting_data={"missing_count": int(missing), "missing_percentage": float(missing_pct), "column": col}
            ))
    
    return insights


def generate_categorical_insights(df: pd.DataFrame) -> List[Insight]:
    """Generate insights about categorical columns."""
    insights = []
    cat_cols = df.select_dtypes(include=['object']).columns
    
    if len(cat_cols) == 0:
        return insights
    
    # 1. Imbalanced categories
    for col in cat_cols:
        value_counts = df[col].value_counts()
        if len(value_counts) > 1:
            max_pct = value_counts.iloc[0] / len(df) * 100
            
            if max_pct > 50:
                insights.append(Insight(
                    title=f"Imbalanced categories in {col}",
                    description=f"The '{col}' column is heavily dominated by '{value_counts.index[0]}' ({max_pct:.1f}%). This imbalance may affect analysis and model training.",
                    type="pattern",
                    confidence=0.85,
                    supporting_data={"dominant_value": str(value_counts.index[0]), "percentage": float(max_pct), "column": col}
                ))
    
    # 2. High cardinality
    for col in cat_cols:
        unique_count = df[col].nunique()
        cardinality_ratio = unique_count / len(df)
        
        if cardinality_ratio > 0.5:
            insights.append(Insight(
                title=f"High cardinality in {col}",
                description=f"The '{col}' column has {unique_count} unique values with cardinality ratio of {cardinality_ratio:.1%}. This may indicate IDs or require special encoding for ML.",
                type="recommendation",
                confidence=0.8,
                supporting_data={"unique_count": int(unique_count), "cardinality_ratio": float(cardinality_ratio), "column": col}
            ))
    
    return insights


def generate_correlation_insights(df: pd.DataFrame) -> List[Insight]:
    """Generate insights from correlation analysis."""
    insights = []
    numeric_df = df.select_dtypes(include=[np.number])
    
    if len(numeric_df.columns) < 2:
        return insights
    
    corr_matrix = numeric_df.corr()
    
    # Find strong correlations (excluding diagonal)
    for i in range(len(corr_matrix.columns)):
        for j in range(i+1, len(corr_matrix.columns)):
            col1 = corr_matrix.columns[i]
            col2 = corr_matrix.columns[j]
            corr_val = corr_matrix.iloc[i, j]
            
            if abs(corr_val) > 0.7:
                direction = "positively" if corr_val > 0 else "negatively"
                insights.append(Insight(
                    title=f"Strong {direction} correlated pair: {col1} & {col2}",
                    description=f"The columns '{col1}' and '{col2}' show strong {direction} correlation ({corr_val:.2f}). This suggests they move together or may contain redundant information.",
                    type="pattern",
                    confidence=0.85,
                    supporting_data={"column1": col1, "column2": col2, "correlation": float(corr_val)}
                ))
    
    return insights


def generate_data_quality_insights(df: pd.DataFrame) -> List[Insight]:
    """Generate data quality insights."""
    insights = []
    
    # 1. Overall missing data
    total_missing = df.isnull().sum().sum()
    missing_pct = total_missing / (len(df) * len(df.columns)) * 100
    
    if missing_pct > 1.0:
        insights.append(Insight(
            title="Data quality concern: Missing values",
            description=f"The dataset contains {total_missing} missing values ({missing_pct:.2f}% of all cells). Quality assurance recommended before analysis.",
            type="recommendation",
            confidence=0.9,
            supporting_data={"missing_count": int(total_missing), "missing_percentage": float(missing_pct)}
        ))
    
    # 2. Duplicates
    dup_count = len(df) - len(df.drop_duplicates())
    dup_pct = dup_count / len(df) * 100 if len(df) > 0 else 0
    
    if dup_count > 0:
        insights.append(Insight(
            title="Duplicate rows detected",
            description=f"Found {dup_count} duplicate rows ({dup_pct:.2f}% of dataset). Deduplication recommended to avoid skewed analysis.",
            type="recommendation",
            confidence=0.95,
            supporting_data={"duplicate_count": int(dup_count), "duplicate_percentage": float(dup_pct)}
        ))
    
    # 3. Data freshness (if timestamp column exists)
    timestamp_cols = [col for col in df.columns if 'date' in col.lower() or 'time' in col.lower()]
    if timestamp_cols:
        col = timestamp_cols[0]
        try:
            dates = pd.to_datetime(df[col], errors='coerce')
            date_range = dates.max() - dates.min()
            insights.append(Insight(
                title="Data temporal coverage",
                description=f"Data spans {date_range.days} days across '{col}', providing longitudinal perspective on trends and patterns.",
                type="pattern",
                confidence=0.8,
                supporting_data={"days_covered": int(date_range.days), "column": col}
            ))
        except:
            pass
    
    return insights


def generate_opportunities_insights(df: pd.DataFrame) -> List[Insight]:
    """Generate business opportunity insights."""
    insights = []
    
    # Look for numeric columns that might represent revenue/value
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    potential_value_cols = [col for col in numeric_cols if any(x in col.lower() for x in ['sale', 'price', 'value', 'amount', 'total', 'cost'])]
    
    for col in potential_value_cols:
        mean_val = df[col].mean()
        std_val = df[col].std()
        max_val = df[col].max()
        
        # Opportunity: High-value outliers
        potential_vip = df[df[col] > mean_val + 2*std_val]
        if len(potential_vip) > 0 and len(potential_vip) < len(df) * 0.1:
            insights.append(Insight(
                title="High-value transaction segment identified",
                description=f"Identified {len(potential_vip)} high-value transactions in '{col}' (>{mean_val + 2*std_val:.2f}). These represent key revenue drivers and warrant VIP treatment.",
                type="opportunity",
                confidence=0.75,
                supporting_data={"segment_size": int(len(potential_vip)), "segment_percentage": float(len(potential_vip)/len(df)*100), "column": col}
            ))
    
    # Look for categorical columns (potential segmentation)
    cat_cols = df.select_dtypes(include=['object']).columns
    if len(cat_cols) > 0:
        col = cat_cols[0]
        unique_count = df[col].nunique()
        
        if 2 <= unique_count <= 10:
            insights.append(Insight(
                title="Natural customer/product segments",
                description=f"The '{col}' column defines {unique_count} distinct segments. Analyzing performance within each segment could reveal untapped growth opportunities.",
                type="opportunity",
                confidence=0.7,
                supporting_data={"segment_column": col, "segment_count": int(unique_count)}
            ))
    
    return insights


def generate_all_insights(df: pd.DataFrame, dataset_name: Optional[str] = None, ai_model: str = "heuristic") -> InsightReport:
    """
    Generate comprehensive insights from dataset.
    
    Args:
        df: DataFrame to analyze
        dataset_name: Optional name for the dataset
        ai_model: Model used (default: "heuristic")
        
    Returns:
        InsightReport with multiple insights
    """
    all_insights = []
    
    # Generate insights by category
    all_insights.extend(generate_numeric_insights(df))
    all_insights.extend(generate_categorical_insights(df))
    all_insights.extend(generate_correlation_insights(df))
    all_insights.extend(generate_data_quality_insights(df))
    all_insights.extend(generate_opportunities_insights(df))
    
    # Limit to top insights and sort by confidence
    all_insights.sort(key=lambda x: x.confidence, reverse=True)
    top_insights = all_insights[:10]  # Top 10 insights
    
    from datetime import datetime
    return InsightReport(
        dataset_name=dataset_name,
        total_rows=len(df),
        total_columns=len(df.columns),
        insights=top_insights,
        generated_at=datetime.utcnow().isoformat(),
        ai_model=ai_model,
    )


# ============================================================================
# Natural Language Query Functions
# ============================================================================

def interpret_nl_query(query: str, df: pd.DataFrame) -> NLQueryResponse:
    """
    Interpret natural language query and generate response.
    
    Args:
        query: Natural language question about data
        df: DataFrame to query
        
    Returns:
        NLQueryResponse with interpretation and suggestions
    """
    query_lower = query.lower()
    
    # Simple heuristic-based interpretation
    interpretation = ""
    visualization = ""
    sql_equivalent = None
    data_slice = None
    
    # Common patterns
    if any(word in query_lower for word in ['top', 'highest', 'best', 'most']):
        # Top N query
        interpretation = "Looking for highest-value items or records"
        visualization = "bar_chart"
        
        if 'seller' in query_lower or 'product' in query_lower:
            # Try to find relevant column
            cols = df.columns.tolist()
            value_col = next((c for c in cols if any(x in c.lower() for x in ['sale', 'price', 'value', 'amount'])), None)
            
            if value_col:
                top_10 = df.nlargest(10, value_col)
                data_slice = top_10.to_dict(orient='records')
    
    elif any(word in query_lower for word in ['compare', 'difference', 'versus', 'vs']):
        interpretation = "Comparing segments or categories"
        visualization = "comparison_chart"
    
    elif any(word in query_lower for word in ['trend', 'over time', 'change', 'growth']):
        interpretation = "Analyzing temporal trends"
        visualization = "line_chart"
    
    elif any(word in query_lower for word in ['distribution', 'spread', 'histogram', 'how many']):
        interpretation = "Understanding data distribution"
        visualization = "histogram"
    
    elif any(word in query_lower for word in ['outlier', 'anomaly', 'unusual', 'strange']):
        interpretation = "Finding anomalies or unusual data points"
        visualization = "scatter_plot"
    
    else:
        interpretation = "General data exploration query"
        visualization = "table"
    
    response = NLQueryResponse(
        query=query,
        interpretation=interpretation,
        suggested_visualization=visualization,
        data_slice=data_slice,
    )
    
    return response


# ============================================================================
# AI Model Integration (with fallback)
# ============================================================================

def _resolve_model_order(model: Optional[str]) -> List[str]:
    if not model or model == "auto" or model == "claude":
        return ["claude-opus", "claude-sonnet", "kimi", "codex"]
    if model == "kimi":
        return ["kimi", "codex"]
    if model == "codex":
        return ["codex"]
    return ["claude-opus", "claude-sonnet", "kimi", "codex"]


def _model_label(model_key: str) -> str:
    labels = {
        "claude-opus": "claude-3-opus",
        "claude-sonnet": "claude-3-5-sonnet",
        "kimi": "kimi-k2.5",
        "codex": "gpt-5.2-codex",
    }
    return labels.get(model_key, model_key)


def generate_insights_with_ai(df: pd.DataFrame, dataset_name: Optional[str] = None, model: Optional[str] = None) -> InsightReport:
    """
    Generate insights using AI with heuristic fallback.

    Args:
        df: DataFrame to analyze
        dataset_name: Optional dataset name
        model: Optional model preference (claude/kimi/codex/auto)

    Returns:
        InsightReport
    """
    from .llm import call_with_fallback

    try:
        # Prepare data summary for LLM
        summary = {
            'shape': df.shape,
            'columns': list(df.columns),
            'dtypes': df.dtypes.to_dict(),
            'null_counts': df.isnull().sum().to_dict(),
            'numeric_stats': df.describe().to_dict(),
            'top_values_sample': {col: df[col].value_counts().head(3).to_dict() for col in df.select_dtypes(include=['object']).columns},
        }

        prompt = f"""Analyze this dataset and provide 5-10 specific, actionable insights:

Dataset name: {dataset_name or 'Unknown'}
Shape: {df.shape}
Columns: {list(df.columns)}

Summary statistics:
{json.dumps(summary, default=str, indent=2)}

Provide insights as JSON array with objects containing: title, description, type (trend/anomaly/pattern/recommendation/opportunity), confidence (0-1).
Format as valid JSON array only."""

        messages = [{"role": "user", "content": prompt}]
        model_order = _resolve_model_order(model)
        response, model_used = call_with_fallback(messages, model_order=model_order, max_tokens=1024)

        if response:
            try:
                insights_data = json.loads(response)
                if isinstance(insights_data, list):
                    insights = [
                        Insight(
                            title=item.get('title', ''),
                            description=item.get('description', ''),
                            type=item.get('type', 'pattern'),
                            confidence=float(item.get('confidence', 0.5)),
                            supporting_data=item.get('supporting_data')
                        )
                        for item in insights_data[:10]
                    ]

                    from datetime import datetime
                    return InsightReport(
                        dataset_name=dataset_name,
                        total_rows=len(df),
                        total_columns=len(df.columns),
                        insights=insights,
                        generated_at=datetime.utcnow().isoformat(),
                        ai_model=_model_label(model_used or "unknown"),
                    )
            except json.JSONDecodeError:
                pass
    except Exception as e:
        print(f"AI insights error: {e}")

    # Fallback to heuristic
    return generate_all_insights(df, dataset_name, ai_model="heuristic")
