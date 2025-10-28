# Databotics  

Databotics is a lightweight data validation and cleaning tool. It aims to be a "spellcheck for data" by detecting anomalies, invalid types, missing keys, and other issues before you load data into a database.  

## Features  
- Drag-and-drop CSV or Excel files to explore your data  
- Run SQL queries against uploaded files using DuckDB  
- Validate datasets with configurable rules (required columns, uniqueness, ranges, regex)  
- Clean data by trimming whitespace and coercing types  
- Load cleaned datasets into Snowflake (more connectors coming soon)  

## Architecture (MVP)  

The MVP uses FastAPI for validation APIs, Streamlit for the UI, DuckDB for local SQL queries, and a Snowflake connector. See `app/` and `ui/` directories for code.
yes
