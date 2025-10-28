import streamlit as st
import pandas as pd
import duckdb
import requests
from io import BytesIO

st.set_page_config(page_title="Databotics", layout="wide")
st.title("Databotics — Spellcheck for Data")

uploaded_files = st.file_uploader("Drop CSV/XLSX files", type=["csv", "xlsx", "xls"], accept_multiple_files=True)
con = duckdb.connect(database=':memory:')

if uploaded_files:
    for f in uploaded_files:
        raw = f.read()
        df = pd.read_excel(BytesIO(raw)) if f.name.endswith(("xlsx","xls")) else pd.read_csv(BytesIO(raw))
        table = f.name.split(".")[0].replace("-", "_")
        con.register(table, df)
        st.success(f"Registered table: `{table}` ({df.shape[0]} rows)")

    st.subheader("Query your files")
    tables_df = con.execute("SHOW TABLES").fetchdf()
    default_query = f"SELECT * FROM {tables_df.iloc[0,0]} LIMIT 10;" if len(tables_df) > 0 else ""
    sql = st.text_area("SQL", value=default_query, height=100)
    if st.button("Run SQL"):
        try:
            result = con.execute(sql).fetchdf()
            st.dataframe(result.head(1000))
        except Exception as e:
            st.error(str(e))

    st.subheader("Validate")
    rules_input = st.text_area("Rules (YAML)", value="required: []\nunique: []")
    if st.button("Run Validation"):
        f0 = uploaded_files[0]
        files = {'file': (f0.name, f0.getvalue(), f0.type)}
        try:
            resp = requests.post("http://localhost:8000/validate", files=files, json={"rules": {}})
            rep = resp.json()
            if rep.get("ok"):
                st.success("No issues found ✅")
            else:
                st.write(rep["issues"])
        except Exception as e:
            st.error(str(e))
