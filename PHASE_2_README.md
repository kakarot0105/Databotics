# PHASE 2: Core Analytics Implementation

## Overview
Enhanced Databotics with professional-grade analytics capabilities for data exploration, correlation analysis, distribution analysis, and outlier detection.

## New Analytics Module (`app/analytics.py`)

A comprehensive analytics module providing core statistical functions:

### 1. Data Profiling
**Function**: `profile_data(df: pd.DataFrame) -> DataProfile`

Comprehensive dataset analysis including:
- Row and column counts
- Memory usage (MB)
- Column-level statistics:
  - Data types
  - Null value counts and percentages
  - Unique value counts
  - Numeric statistics: min, max, mean, median, std, skewness
  - Categorical top-5 values with counts and percentages
- Missing value summary with detailed breakdown

**Endpoint**: `POST /profile-advanced`, `POST /profile-advanced/{session_id}`

**Example Response**:
```json
{
  "row_count": 2500,
  "column_count": 15,
  "memory_usage_mb": 0.45,
  "columns": [
    {
      "name": "total_sale",
      "dtype": "float64",
      "non_null_count": 2500,
      "null_count": 0,
      "unique_count": 2498,
      "stats": {
        "min": 10.5,
        "max": 4995.0,
        "mean": 1245.75,
        "median": 1120.30,
        "std": 850.25,
        "skewness": 0.342
      }
    }
  ],
  "missing_summary": {
    "total_missing": 75,
    "columns_with_missing": [
      {
        "column": "customer_age",
        "missing_count": 50,
        "missing_percentage": 2.0
      }
    ]
  }
}
```

### 2. Correlation Matrix Analysis
**Function**: `compute_correlation_matrix(df: pd.DataFrame, method: str = 'pearson') -> CorrelationMatrix`

Computes correlation between all numeric columns:
- Supports Pearson, Spearman, and Kendall correlation methods
- Automatically handles missing values (median imputation)
- Returns correlation coefficients in -1.0 to 1.0 range

**Endpoint**: `POST /correlate`, `POST /correlate/{session_id}`

**Query Parameters**:
- `method`: 'pearson' (default), 'spearman', 'kendall'

**Example Response**:
```json
{
  "columns": ["quantity", "unit_price", "discount_percent", "customer_age", "shipping_days", "customer_satisfaction", "total_sale"],
  "data": [
    [1.0, 0.042, -0.156, 0.089, -0.023, 0.045, 0.987],
    [0.042, 1.0, -0.234, 0.123, 0.078, -0.089, 0.654],
    ...
  ],
  "method": "pearson"
}
```

**Use Cases**:
- Identify related variables
- Feature selection for ML models
- Detect multicollinearity
- Understand relationships in data

### 3. Distribution Analysis
**Function**: `analyze_distribution(df: pd.DataFrame, column: str) -> DistributionAnalysis`

Detailed statistical analysis of individual columns:
- **Numeric columns**: min, Q1, median, mean, Q3, max, std
- **Categorical columns**: mode, top-10 values with counts and percentages
- Null value counts

**Endpoint**: `POST /distributions`, `POST /distributions/{session_id}`

**Example Response**:
```json
{
  "distributions": [
    {
      "column_name": "total_sale",
      "dtype": "float64",
      "count": 2500,
      "missing": 0,
      "unique": 2498,
      "min": 10.5,
      "q1": 742.3,
      "median": 1120.3,
      "mean": 1245.75,
      "q3": 1680.4,
      "max": 4995.0,
      "std": 850.25
    },
    {
      "column_name": "product_category",
      "dtype": "object",
      "count": 2500,
      "missing": 0,
      "unique": 5,
      "mode": "Electronics",
      "top_values": [
        {"value": "Electronics", "count": 512, "percentage": 20.48},
        {"value": "Books", "count": 498, "percentage": 19.92}
      ]
    }
  ]
}
```

### 4. Outlier Detection (IQR Method)
**Function**: `detect_outliers(df: pd.DataFrame, column: str, method: str = 'iqr', threshold: float = 1.5) -> OutlierDetectionResult`

Identifies statistical outliers using the Interquartile Range (IQR) method:
- **Formula**: 
  - Lower Bound = Q1 - threshold × IQR
  - Upper Bound = Q3 + threshold × IQR
  - Values outside [Lower, Upper] are outliers
- Default threshold 1.5 is standard (can be adjusted)
- Returns outlier indices and values
- Automatically analyzes all numeric columns

**Endpoint**: `POST /outliers`, `POST /outliers/{session_id}`

**Query Parameters**:
- `method`: 'iqr' (only option currently)
- `threshold`: 1.5 (default), can increase for stricter detection

**Example Response**:
```json
{
  "outliers": [
    {
      "column_name": "total_sale",
      "method": "iqr",
      "outlier_count": 18,
      "outlier_percentage": 0.72,
      "lower_bound": -398.45,
      "upper_bound": 2821.15,
      "outliers": [
        {"index": 156, "value": 4995.0},
        {"index": 234, "value": 4872.5}
      ]
    }
  ],
  "method": "iqr",
  "threshold": 1.5
}
```

**Use Cases**:
- Data quality assessment
- Identify unusual transactions
- Fraud detection
- Anomaly analysis

### 5. Box Plot Data Generation
**Function**: `generate_box_plot_data(df: pd.DataFrame, column: str) -> BoxPlotData`

Generates visualization-ready box plot data:
- Quartiles: min, Q1, median, Q3, max
- Summary statistics: mean, standard deviation
- Detected outliers (up to 100)

**Endpoint**: `POST /box-plots`, `POST /box-plots/{session_id}`

**Example Response**:
```json
{
  "box_plots": [
    {
      "column_name": "total_sale",
      "dtype": "float64",
      "min": 10.5,
      "q1": 742.3,
      "median": 1120.3,
      "q3": 1680.4,
      "max": 4995.0,
      "mean": 1245.75,
      "std": 850.25,
      "outliers": [4995.0, 4872.5, 4756.3]
    }
  ]
}
```

**Use Cases**:
- Distribution visualization
- Identify skewness and outliers
- Compare distributions across groups
- Quality assessment

## API Endpoints Summary

### Profile & Data Quality
- `POST /profile` — Quick profile (existing, kept for compatibility)
- `POST /profile/{session_id}` — Quick profile from session
- `POST /profile-advanced` — Comprehensive profile with all statistics
- `POST /profile-advanced/{session_id}` — Comprehensive profile from session

### Correlation Analysis
- `POST /correlate?method=pearson` — Compute correlation matrix
- `POST /correlate/{session_id}?method=pearson` — Correlation from session

### Distribution Analysis
- `POST /distributions` — Analyze all columns
- `POST /distributions/{session_id}` — Analyze session data

### Outlier Detection
- `POST /outliers?threshold=1.5` — Detect outliers in all numeric columns
- `POST /outliers/{session_id}?threshold=1.5` — Detect outliers in session

### Visualization Data
- `POST /box-plots` — Generate box plot data
- `POST /box-plots/{session_id}` — Box plots from session

## Sample Dataset Analysis

Using the provided e-commerce dataset (`test-data/sample.csv`):

**Dataset Characteristics**:
- **Size**: 2,500 transactions × 15 columns
- **Numeric Columns** (8):
  - order_id, quantity, unit_price, discount_percent
  - customer_age, shipping_days, customer_satisfaction, total_sale
- **Categorical Columns** (7):
  - order_date, product_category, product_subcategory, customer_country, payment_method, is_returning_customer
- **Missing Values**: 2% in customer_age, 1% in shipping_days

**Sample Insights**:
- Total_sale highly correlated with quantity and unit_price
- Customer_satisfaction shows interesting distribution patterns
- Shipping_days varies significantly by country
- Discount_percent doesn't directly impact satisfaction (based on sample data)

## Implementation Details

### Error Handling
All functions include proper error handling:
- Missing columns: `ValueError: Column 'X' not found in dataset`
- Non-numeric for numeric-only operations: `ValueError: Column 'X' must be numeric`
- No numeric columns: `ValueError: No numeric columns found in dataset`

### Performance Considerations
- Correlation matrix: O(n·m²) where n=rows, m=numeric columns
- Outlier detection: O(n·m) single-pass analysis
- Memory efficient: Uses DataFrame operations optimized in pandas
- Handles large datasets (tested up to 100K+ rows)

### Data Quality Handling
- Missing values automatically filled with median (correlation only)
- Handles mixed data types gracefully
- Skips problematic columns instead of failing completely
- Returns reasonable defaults for empty data

## Frontend Integration Notes

For React/TypeScript frontend integration:

```typescript
// Fetch correlation matrix
const response = await fetch(`/api/correlate/${sessionId}`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { columns, data, method } = await response.json();

// Visualize with libraries like:
// - Plotly (heatmap for correlation)
// - Recharts (box plots)
// - Apache ECharts (distribution charts)

// Detect outliers
const outlierRes = await fetch(`/api/outliers/${sessionId}?threshold=1.5`, {
  method: 'POST'
});
const { outliers } = await outlierRes.json();
```

## Next Steps (PHASE 3)

- Data cleaning endpoints with transformations
- Column normalization and scaling
- One-hot encoding for categorical variables
- Missing value imputation strategies

---

**Last Updated**: 2026-02-16  
**Status**: Complete and tested  
**Ready for**: Frontend integration and PHASE 3
