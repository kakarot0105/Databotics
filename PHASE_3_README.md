# PHASE 3: Data Cleaning & Transformation

## Overview
Advanced data cleaning workflows with duplicate removal, missing value handling, and powerful column transformations. Designed for interactive data exploration and preparation.

## New Cleaning Module (`app/cleaning.py`)

Comprehensive data cleaning and transformation library:

### 1. Duplicate Removal

**Function**: `remove_duplicates(df, subset=None, keep='first')`

Removes duplicate rows from DataFrame:
- `subset`: Specific columns to consider (None = all columns)
- `keep`: 'first' (keep first occurrence), 'last' (keep last), False (remove all)

Returns: (cleaned_df, rows_removed)

**Endpoint**: `POST /clean-advanced` or `POST /clean-advanced/{session_id}`

### 2. Column Dropping

**Function**: `drop_columns(df, columns: List[str])`

Removes specified columns safely:
- Ignores non-existent columns
- Raises error if no columns exist
- Returns count of columns dropped

### 3. Null Row Removal

**Function**: `drop_rows_with_nulls(df, columns=None, how='any')`

Removes rows with missing values:
- `columns`: Specific columns to check (None = all)
- `how`: 'any' (drop if any null), 'all' (drop if all null)
- Returns rows removed count

### 4. Missing Value Imputation

#### Numeric Columns
**Function**: `fill_missing_numeric(df, column, strategy='median')`

Strategies for filling numeric missing values:
- **median**: Fill with column median (robust to outliers)
- **mean**: Fill with column mean
- **zero**: Fill with 0
- **forward_fill**: Last observation carried forward (time series)
- **backward_fill**: Next observation carried backward (time series)

#### Categorical Columns
**Function**: `fill_missing_categorical(df, column, strategy='mode')`

Strategies for categorical values:
- **mode**: Most frequent value
- **unknown**: Fill with 'Unknown' string
- **forward_fill**: Last non-null value
- **backward_fill**: Next non-null value

### 5. Comprehensive Cleaning Plan

**Function**: `apply_cleaning_plan(df, plan: CleaningPlan) -> (cleaned_df, report)`

Apply multiple cleaning operations in sequence:

```python
plan = CleaningPlan(
    remove_duplicates=True,
    drop_columns=['unwanted_col1', 'unwanted_col2'],
    fill_missing_strategy='median',  # numeric: median, categorical: mode
    remove_rows_with_nulls=False
)
df_cleaned, report = apply_cleaning_plan(df, plan)
```

**Endpoint**: `POST /clean-advanced`

**Request Body**:
```json
{
  "remove_duplicates": true,
  "drop_columns": ["column1", "column2"],
  "fill_missing_strategy": "median",
  "remove_rows_with_nulls": false
}
```

**Response**:
```json
{
  "report": {
    "original_shape": [2500, 15],
    "final_shape": [2420, 13],
    "rows_removed": 80,
    "columns_removed": 2,
    "operations": [
      {"operation": "remove_duplicates", "rows_removed": 30},
      {"operation": "drop_columns", "columns_removed": 2},
      {"operation": "fill_missing", "strategy": "median"}
    ],
    "warnings": [],
    "summary": {
      "duplicates_removed": true,
      "columns_dropped": 2,
      "rows_removed": 80,
      "missing_values_filled": true
    }
  }
}
```

---

## Column Transformations

### 1. Normalization (Min-Max & Z-Score)

**Function**: `normalize_column(df, column, method='min_max')`

Normalize numeric columns to standard ranges:

#### Min-Max Scaling
- **Formula**: (x - min) / (max - min)
- **Range**: [0, 1]
- **Use**: When original scale matters, feature engineering
- **Pros**: Preserves zero, bounded output
- **Cons**: Sensitive to outliers

#### Z-Score Standardization
- **Formula**: (x - mean) / std
- **Range**: Centered at 0, typically [-3, 3]
- **Use**: Machine learning, statistical analysis
- **Pros**: Handles outliers better
- **Cons**: Unbounded range

#### Robust Scaling
- **Formula**: (x - median) / IQR
- **Range**: More robust version of z-score
- **Use**: Data with outliers
- **Pros**: Outlier-resistant
- **Cons**: Less standard in ML

**Endpoint**: `POST /transform?column=price&transformation=normalize&method=min_max`

**Response**:
```json
{
  "transformation": "normalize",
  "column": "unit_price",
  "parameters": {
    "method": "min_max",
    "min": 10.5,
    "max": 500.0
  }
}
```

### 2. Scaling to Custom Range

**Function**: `scale_numeric(df, column, target_min=0, target_max=100)`

Scale values to arbitrary range (e.g., 0-100):
- Useful for percentage scaling
- Example: Convert prices to 0-100 rating scale

**Endpoint**: `POST /transform?column=price&transformation=scale`

### 3. Log Transformation

**Function**: `log_transform(df, column, base=np.e)`

Apply logarithmic transformation:
- **Use**: Reduce skewness, stabilize variance
- **Best For**: Right-skewed distributions (prices, counts)
- **Requirement**: Only positive values
- **Inverse**: exp(x) for natural log

**Endpoint**: `POST /transform?column=order_value&transformation=log`

**Response**:
```json
{
  "transformation": "log",
  "column": "order_value",
  "parameters": {
    "method": "log",
    "base": 2.718281828
  }
}
```

### 4. One-Hot Encoding

**Function**: `one_hot_encode(df, column, drop_original=True)`

Convert categorical variables to binary columns:
- **Input**: Single categorical column with N unique values
- **Output**: N binary columns (0 or 1)
- **Use**: Machine learning models that require numeric inputs
- **Example**: 
  - Input: category = ['Electronics', 'Clothing', 'Books']
  - Output: category_Electronics, category_Clothing, category_Books (0/1)

**Endpoint**: `POST /transform?column=product_category&transformation=one_hot_encode`

**Response**:
```json
{
  "transformation": "one_hot_encode",
  "column": "product_category",
  "parameters": {
    "original_column": "product_category",
    "new_columns": ["product_category_Electronics", "product_category_Clothing", "product_category_Home & Garden", "product_category_Sports", "product_category_Books"],
    "unique_values": ["Electronics", "Clothing", "Home & Garden", "Sports", "Books"],
    "value_counts": {
      "Electronics": 512,
      "Books": 498,
      ...
    }
  }
}
```

---

## Missing Value Analysis

### Missing Value Summary

**Function**: `get_missing_value_summary(df) -> Dict`

Detailed analysis of missing values:
- Total missing count
- Per-column breakdown with counts and percentages
- Prioritized for cleaning

**Endpoint**: `POST /missing-values`

**Response**:
```json
{
  "total_missing": 75,
  "columns_with_missing": {
    "customer_age": {
      "count": 50,
      "percentage": 2.0
    },
    "shipping_days": {
      "count": 25,
      "percentage": 1.0
    }
  }
}
```

---

## Cleaning Recommendations

### Auto-Generated Suggestions

**Function**: `suggest_cleaning_operations(df) -> Dict`

AI-like suggestions for data cleaning:
- Duplicate count
- Columns with any missing values
- High-cardinality columns (potentially problematic)
- Low-variance columns (potentially useless)

**Endpoint**: `POST /suggest-cleaning`

**Response**:
```json
{
  "suggestions": {
    "duplicates": 30,
    "missing_columns": ["customer_age", "shipping_days"],
    "high_cardinality": ["order_id", "customer_id"],
    "low_variance": []
  }
}
```

**Interpretation**:
- **Duplicates**: 30 exact duplicate rows detected → consider removing
- **Missing Columns**: Focus on these for imputation strategy
- **High Cardinality**: Unique IDs (drop if not needed) or naturally high-variance features
- **Low Variance**: Constant/near-constant columns → provide little predictive value

---

## API Endpoints

### Cleaning Operations
- `POST /clean-advanced` — Apply cleaning plan
- `POST /clean-advanced/{session_id}` — Clean session file
- `POST /missing-values` — Get missing value summary
- `POST /missing-values/{session_id}` — Get summary from session
- `POST /suggest-cleaning` — Get cleaning suggestions
- `POST /suggest-cleaning/{session_id}` — Suggestions for session

### Transformations
- `POST /transform?column=X&transformation=normalize&method=min_max` — Normalize column
- `POST /transform?column=X&transformation=scale` — Scale to range
- `POST /transform?column=X&transformation=log` — Log transform
- `POST /transform?column=X&transformation=one_hot_encode` — Encode categorical
- Same endpoints with `/{session_id}` for session files

---

## Workflow Example

### Typical Data Cleaning Pipeline

```python
# 1. Upload data
POST /upload → session_id: abc123

# 2. Analyze what needs cleaning
GET /missing-values/abc123
GET /suggest-cleaning/abc123

# 3. Apply cleaning plan
POST /clean-advanced/abc123
{
  "remove_duplicates": true,
  "drop_columns": ["unwanted_col"],
  "fill_missing_strategy": "median",
  "remove_rows_with_nulls": false
}
→ Download cleaned_data.csv

# 4. Transform for analysis/ML
POST /transform/abc123?column=price&transformation=normalize&method=z_score
POST /transform/abc123?column=category&transformation=one_hot_encode
→ Download transformed_data.csv

# 5. Analyze cleaned data
POST /correlate/abc123
POST /outliers/abc123
```

---

## Frontend Integration

### React Component Example

```typescript
// 1. Missing value analysis
const missingResponse = await fetch(`/missing-values/${sessionId}`, {
  method: 'POST'
});
const { total_missing, columns_with_missing } = await missingResponse.json();

// 2. Get cleaning suggestions
const suggestResponse = await fetch(`/suggest-cleaning/${sessionId}`, {
  method: 'POST'
});
const { suggestions } = await suggestResponse.json();

// 3. Create cleaning plan
const plan = {
  remove_duplicates: suggestions.duplicates > 0,
  drop_columns: suggestions.high_cardinality.filter(col => !isImportant(col)),
  fill_missing_strategy: 'median',
  remove_rows_with_nulls: false
};

// 4. Apply cleaning
const cleanResponse = await fetch(`/clean-advanced/${sessionId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(plan)
});
const { report } = await cleanResponse.json();

// 5. Transform columns
for (const col of columnsToNormalize) {
  await fetch(`/transform/${sessionId}?column=${col}&transformation=normalize`, {
    method: 'POST'
  });
}
```

---

## Best Practices

### Missing Values
1. **Analyze** missing value patterns first (MCAR, MAR, MNAR)
2. **Choose strategy** based on column type:
   - Numeric: median (robust), mean (normal), forward_fill (time series)
   - Categorical: mode (most common), 'Unknown' (informative)
3. **Document** imputation in your metadata
4. **Avoid** dropping entire rows unless <5% missing

### Normalization
1. **Min-Max**: When original scale matters, feature is already roughly uniform
2. **Z-Score**: ML models (Linear Regression, SVM), when scale varies
3. **Robust**: When outliers present, or extreme values possible
4. **Never** normalize target variable for regression

### Encoding
1. **One-Hot**: For tree-based models, neural networks, linear models
2. **Ordinal**: When categories have natural order (low < medium < high)
3. **Target**: For high-cardinality categories (100+ unique values)
4. **Never** forget to encode test data identically to training data

### Transformations
1. **Log**: Right-skewed (prices, counts), positive values only
2. **Square Root**: Moderate right skew, handles zeros
3. **Box-Cox**: Automatic optimal transformation (lambda parameter)
4. **Always** test impact on downstream models

---

## Example: E-Commerce Dataset Cleaning

**Original Data Issues**:
- 30 duplicate orders (same customer, product, timestamp)
- 2% missing customer_age, 1% missing shipping_days
- product_category needs encoding for ML

**Cleaning Plan**:
```json
{
  "remove_duplicates": true,
  "drop_columns": ["internal_id", "temp_field"],
  "fill_missing_strategy": "median",
  "remove_rows_with_nulls": false
}
```

**Result**:
- 2,470 clean rows (removed 30 duplicates)
- 13 columns (dropped 2)
- All missing values filled
- Ready for analysis

**Transformations**:
1. Normalize total_sale (z_score for ML)
2. One-hot encode product_category
3. One-hot encode payment_method
4. Log transform unit_price (reduce right skew)

**Output**: ML-ready dataset

---

**Last Updated**: 2026-02-16  
**Status**: Complete, interactive-ready  
**Next**: PHASE 4 - AI-Powered Insights
