# PHASE 4: AI-Powered Insights

## Overview
Automated insight generation using Claude API with intelligent fallback strategies. Generates 5-10 actionable insights from data without manual analysis.

## New Insights Module (`app/insights.py`)

### Core Features

1. **Automatic Insight Discovery**
   - Numeric column analysis (variance, skewness, outliers)
   - Categorical patterns (imbalance, cardinality)
   - Correlation analysis
   - Data quality assessment
   - Business opportunity identification

2. **Claude API Integration**
   - Seamless fallback to heuristic analysis
   - Structured JSON response format
   - Confidence scoring (0.0-1.0)

3. **Natural Language Queries**
   - Interpret plain English questions about data
   - Suggest appropriate visualizations
   - Surface relevant data slices

---

## Insight Types

### 1. Trend Insights
Pattern changes over time or across categories.

**Example**:
```
"Sales show 45% growth Q2 vs Q1, with highest growth in Electronics category"
```

### 2. Anomaly Insights
Unusual data points or outliers.

**Example**:
```
"12 outlier transactions detected (0.5% of data) with values >3 standard deviations above mean"
```

### 3. Pattern Insights
Recurring relationships or distributions.

**Example**:
```
"Product price and customer satisfaction show strong positive correlation (0.78), 
suggesting customers value premium products"
```

### 4. Recommendation Insights
Actions to improve data quality or analysis.

**Example**:
```
"2% missing values in customer_age column (50 rows). Recommend median imputation 
to preserve distribution."
```

### 5. Opportunity Insights
Business opportunities discovered in data.

**Example**:
```
"Identified VIP segment: 8 customers generate 32% of revenue. 
Recommend specialized retention program."
```

---

## Insight Generation Functions

### `generate_all_insights(df, dataset_name=None, ai_model='heuristic')`

Generate insights using heuristic rules.

**Generates insights for**:
- Numeric columns: variance, skewness, outliers, missing values
- Categorical columns: imbalance, high cardinality
- Correlations: strong positive/negative relationships
- Data quality: missing values, duplicates, temporal coverage
- Business opportunities: high-value segments, natural groupings

**Returns**: `InsightReport` with up to 10 insights ranked by confidence

**Example**:
```python
df = pd.read_csv('ecommerce_data.csv')
report = generate_all_insights(df, 'Ecommerce Dataset')

print(f"Generated {len(report.insights)} insights:")
for insight in report.insights:
    print(f"[{insight.type.upper()}] {insight.title} ({insight.confidence:.1%} confidence)")
    print(f"  {insight.description}\n")
```

### `generate_insights_with_ai(df, dataset_name=None)`

Generate insights using Claude API (with heuristic fallback).

**Process**:
1. Prepare data summary with column stats
2. Send to Claude for analysis
3. Parse structured JSON response
4. Fall back to heuristics if API unavailable

**Requires**: `ANTHROPIC_API_KEY` environment variable

**Example Response**:
```json
{
  "dataset_name": "ecommerce_data.csv",
  "total_rows": 2500,
  "total_columns": 15,
  "ai_model": "claude-3-5-sonnet",
  "insights": [
    {
      "title": "High variability in total_sale",
      "description": "The 'total_sale' column shows high coefficient of variation (2.45), indicating large spread in values relative to the mean. This suggests diverse transaction sizes.",
      "type": "pattern",
      "confidence": 0.85,
      "supporting_data": {
        "coefficient_of_variation": 2.45,
        "column": "total_sale"
      }
    }
  ]
}
```

---

## API Endpoints

### Generate Insights

#### `POST /insights`
Generate insights from uploaded file.

**Query Parameters**:
- `use_ai` (bool, default: true) — Use Claude API if available

**Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@data.csv" \
  https://api.databotics.com/insights?use_ai=true
```

**Response**:
```json
{
  "dataset_name": "data.csv",
  "total_rows": 2500,
  "total_columns": 15,
  "ai_model": "claude-3-5-sonnet",
  "generated_at": "2026-02-16T10:30:00.000Z",
  "insights": [...]
}
```

#### `POST /insights/{session_id}`
Generate insights for previously uploaded session file.

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.databotics.com/insights/abc123?use_ai=true
```

---

### Natural Language Queries

#### `POST /query-nl`
Process natural language question about data.

**Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -F "file=@data.csv" \
  -d '{"query": "Show me the top 10 customers by revenue"}' \
  https://api.databotics.com/query-nl
```

**Response**:
```json
{
  "query": "Show me the top 10 customers by revenue",
  "interpretation": "Looking for highest-value items or records",
  "suggested_visualization": "bar_chart",
  "data_slice": [
    {
      "order_id": 100156,
      "customer_id": 12345,
      "total_sale": 4995.0
    }
  ]
}
```

#### `POST /query-nl/{session_id}`
Process NL query on session file.

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the average shipping time by country?"}' \
  https://api.databotics.com/query-nl/abc123
```

---

## Understanding Insights

### Confidence Scores

Each insight has a confidence score (0.0-1.0) indicating reliability:

- **0.9-1.0**: High confidence — Data strongly supports insight
- **0.75-0.9**: Good confidence — Clear statistical pattern
- **0.6-0.75**: Moderate confidence — Pattern exists with caveats
- **<0.6**: Low confidence — Exploratory, requires investigation

### Example Insight Analysis

```json
{
  "title": "Strong positively correlated pair: quantity & total_sale",
  "description": "The columns 'quantity' and 'total_sale' show strong positive correlation (0.987). 
    This suggests they move together or may contain redundant information.",
  "type": "pattern",
  "confidence": 0.95,
  "supporting_data": {
    "column1": "quantity",
    "column2": "total_sale",
    "correlation": 0.987
  }
}
```

**Interpretation**:
- 95% confidence in this correlation
- These variables are nearly perfectly correlated
- Consider dropping one for ML models (multicollinearity)
- Or use together for capturing transaction size patterns

---

## Natural Language Query Handling

### Supported Query Patterns

**Top/Best/Highest queries**:
```
"Show me the top 10 customers"
"What are the best selling products?"
"Highest revenue transactions"
```
→ Returns: `bar_chart` with data_slice of top N records

**Comparison queries**:
```
"Compare sales by country"
"How do regions differ?"
```
→ Returns: `comparison_chart` visualization suggestion

**Trend queries**:
```
"Show me sales trends over time"
"How has growth changed?"
```
→ Returns: `line_chart` suggestion

**Distribution queries**:
```
"How are customers distributed?"
"What is the distribution of order values?"
```
→ Returns: `histogram` suggestion

**Anomaly queries**:
```
"Find unusual transactions"
"Show me outliers"
```
→ Returns: `scatter_plot` suggestion

---

## Sample Insights from E-Commerce Dataset

### Data Quality Insights
```
Title: Data quality concern: Missing values
Description: The dataset contains 75 missing values (0.20% of all cells). 
  Quality assurance recommended before analysis.
Type: recommendation
Confidence: 0.90
```

### Pattern Insights
```
Title: High variability in total_sale
Description: The 'total_sale' column shows high coefficient of variation (2.45), 
  indicating large spread in values relative to the mean. This suggests diverse transaction sizes.
Type: pattern
Confidence: 0.85
```

### Opportunity Insights
```
Title: High-value transaction segment identified
Description: Identified 156 high-value transactions (6.2% of data) with values >$2821. 
  These represent key revenue drivers and warrant VIP treatment.
Type: opportunity
Confidence: 0.75
```

---

## Frontend Integration

### React Example

```typescript
// Fetch insights
const response = await fetch(`/api/insights/${sessionId}?use_ai=true`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

const { insights, ai_model } = await response.json();

// Display insights
{insights.map((insight) => (
  <InsightCard key={insight.title}>
    <Badge>{insight.type.toUpperCase()}</Badge>
    <h3>{insight.title}</h3>
    <p>{insight.description}</p>
    <ConfidenceBar value={insight.confidence} />
    {insight.supporting_data && (
      <DataTable data={insight.supporting_data} />
    )}
  </InsightCard>
))}

// Natural language query
const nlQuery = "Show me top 10 products by revenue";
const nlResponse = await fetch(`/api/query-nl/${sessionId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: nlQuery })
});

const { interpretation, suggested_visualization, data_slice } = 
  await nlResponse.json();

// Render visualization based on suggestion
<ChartFactory 
  type={suggested_visualization} 
  data={data_slice}
/>
```

---

## Environment Configuration

### Claude API Setup

Set environment variable for Claude integration:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Or in your `.env` file:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Fallback Behavior

If Claude API is unavailable:
1. System automatically falls back to heuristic analysis
2. Insights are still generated with high quality
3. Confidence scores reflect heuristic-based analysis
4. `ai_model` field shows "heuristic" vs "claude-3-5-sonnet"

---

## Performance Considerations

**Insight Generation**:
- Heuristic analysis: <500ms for 10K rows
- Claude API analysis: 2-5s for 10K rows (with API latency)
- Memory: Scales linearly with dataset size

**Recommendations**:
- Use heuristic mode for real-time dashboards
- Use Claude for batch analysis jobs
- Cache insights for repeated analyses
- Limit to 10K rows for interactive use

---

## Best Practices

1. **Always Check Confidence**
   - Prioritize insights with >0.8 confidence
   - Investigate lower-confidence insights further
   - Use supporting_data to validate claims

2. **Combine with Visualization**
   - Use suggested_visualization from NL queries
   - Create dashboards around top insights
   - Cross-reference multiple insights

3. **Domain Context**
   - Some insights may be obvious to domain experts
   - Use as starting point, not end point of analysis
   - Validate against business rules

4. **Iterative Analysis**
   - Generate insights on raw data
   - Clean data based on insights
   - Re-generate insights on cleaned data
   - Track improvements

---

## Example Workflow

```python
# 1. Upload data
session = upload_file('sales_data.csv')

# 2. Get instant insights (heuristic, <500ms)
insights = get_insights(session, use_ai=False)
print(f"Found {len(insights)} patterns")

# 3. Get AI insights (Claude, 2-5s)
ai_insights = get_insights(session, use_ai=True)
for insight in ai_insights:
    if insight.confidence > 0.8:
        print(f"⭐ {insight.title}")

# 4. Explore with NL queries
top_customers = query_nl(session, "Who are the top 10 customers by revenue?")
visualize(top_customers)

# 5. Clean data based on insights
plan = create_cleaning_plan(ai_insights)
cleaned = clean_advanced(session, plan)

# 6. Re-analyze cleaned data
final_insights = get_insights(cleaned)
```

---

**Last Updated**: 2026-02-16  
**Status**: Complete with Claude API integration  
**Next**: PHASE 5 - Session Management & Advanced UX
