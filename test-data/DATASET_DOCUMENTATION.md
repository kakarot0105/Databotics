# Databotics Sample Dataset Documentation

## Overview
A realistic e-commerce transaction dataset designed for analytics, machine learning, and business intelligence exercises.

### Dataset Characteristics
- **Total Rows**: 2,500 transactions
- **Total Columns**: 15 features
- **Date Range**: 2023-01-01 to 2023-12-31
- **Missing Values**: ~2% (customer_age), ~1% (shipping_days)
- **Data Types**: 8 numeric, 7 categorical/date

## Column Definitions

### Identifiers
- **order_id** (INT): Unique order identifier (100000-102499)
- **customer_id** (INT): Unique customer identifier (10000-14999)

### Temporal
- **order_date** (DATE): Order placement date (YYYY-MM-DD format)

### Product Information
- **product_category** (STRING): Main product category
  - Values: Electronics, Clothing, Home & Garden, Sports, Books
- **product_subcategory** (STRING): Product subcategory
  - Values: Laptops, Phones, Shirts, Shoes, Furniture, Decor, Equipment, Novels, Textbooks

### Transaction Details
- **quantity** (INT): Number of units ordered (1-10)
- **unit_price** (FLOAT): Price per unit in USD ($10-$500)
- **discount_percent** (INT): Applied discount percentage (0%, 5%, 10%, 15%, 20%, 25%)
- **total_sale** (FLOAT): Final transaction amount after discount (quantity × unit_price × (1 - discount_percent/100))

### Customer Information
- **customer_age** (INT): Customer age in years (18-75)
  - **Missing**: ~2% of records
- **customer_country** (STRING): Customer country
  - Values: USA, UK, Canada, Germany, France, Australia, Japan
- **is_returning_customer** (STRING): Whether customer has made previous purchases
  - Values: Yes, No

### Fulfillment & Satisfaction
- **payment_method** (STRING): Payment method used
  - Values: Credit Card, PayPal, Debit Card, Apple Pay, Google Pay
- **shipping_days** (INT): Days to deliver after order (1-30)
  - **Missing**: ~1% of records
- **customer_satisfaction** (INT): Customer rating (1-5 stars)

## Data Quality Notes

### Missing Values
- **customer_age**: 50 missing values (~2%) - recommend imputation with median age
- **shipping_days**: 25 missing values (~1%) - likely same-day or next-day delivery

### Distributions
- **customer_satisfaction**: Uniformly distributed (1-5)
- **discount_percent**: Categorical with 6 discrete values
- **quantity**: Right-skewed (more single-unit orders)
- **unit_price**: Uniform distribution across range

### Relationships to Explore
- Does **shipping_days** correlate with **customer_satisfaction**?
- Do certain **product_category** items have higher **unit_price**?
- Does **discount_percent** affect **customer_satisfaction**?
- Geographic differences: **customer_country** vs. **total_sale**?
- Customer loyalty: **is_returning_customer** vs. **customer_satisfaction**?

## Use Cases

### Analytics & Visualization
- Sales trends over time
- Product category performance
- Geographic market analysis
- Payment method preferences
- Customer satisfaction analysis

### Statistical Analysis
- Correlation analysis (price vs. satisfaction, shipping vs. satisfaction)
- Distribution analysis (price, quantity, age, satisfaction)
- Outlier detection (unusual transactions)
- Missing value imputation

### Machine Learning
- Predict customer satisfaction from order features
- Classify product categories from order patterns
- Forecast sales by category
- Customer segmentation

## File Details
- **Format**: CSV (comma-separated values)
- **Encoding**: UTF-8
- **Location**: `/home/ubuntu/clawd/Databotics/test-data/sample.csv`
- **File Size**: ~150KB
- **Generated**: 2026-02-16

## Random Seed
`seed=42` — Dataset is reproducible and deterministic for testing purposes.
