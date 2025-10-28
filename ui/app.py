import streamlit as st
import pandas as pd
import duckdb
import requests
from io import BytesIO

API_URL = "http://localhost:8000"

def get_file_for_api(uploaded_file):
    return {'file': (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}

st.set_page_config(page_title="Databotics", layout="wide")
st.title("Databotics – Spellcheck for Data")

uploaded_files = st.file_uploader("Drop CSV/XLSX files", type=["csv","xlsx","xls"], accept_multiple_files=True)
con = duckdb.connect(database=':memory:')

dataframes = {}

if uploaded_files:
    for f in uploaded_files:
        raw = f.read()
        # Use header=0 to ensure first row is header
        if f.name.endswith(("xlsx","xls")):
            df = pd.read_excel(BytesIO(raw), header=0)
        else:
            df = pd.read_csv(BytesIO(raw), header=0)
        table = f.name.split(".")[0].replace("-", "_")
        con.register(table, df)
        dataframes[table] = df
        st.success(f"Registered table: `{table}` ({df.shape[0]} rows)")

    st.subheader("Query and Validate")
    # Create columns: left for SQL query & validation, right for AI helper
    col_left, col_right = st.columns([2, 1])
    with col_left:
        st.write("### Query your files")
        tables_df = con.execute("SHOW TABLES").fetchdf()
        default_query = ""
        if len(tables_df) > 0:
            default_query = f"SELECT * FROM {tables_df.iloc[0,0]} LIMIT 10;"
        if "sql_text" not in st.session_state:
            st.session_state["sql_text"] = default_query
        st.text_area("SQL", key="sql_text", height=120)
        if st.button("Run SQL"):
            try:
                res = con.execute(st.session_state["sql_text"]).fetchdf()
                st.dataframe(res.head(1000))
            except Exception as e:
                st.error(str(e))
        st.write("### Validate & Analyze")
        col_rules = st.text_area("Rules (YAML)", "required: []\nunique: []")

        val_col, anal_col = st.columns(2)

        with val_col:
            if st.button("Run Validation"):
                files = get_file_for_api(uploaded_files[0])
                try:
                    r = requests.post(f"{API_URL}/validate", files=files, json={"rules": {}})
                    rep = r.json()
                    if rep.get("ok"):
                        st.success("No issues found ✅")
                    else:
                        st.write(rep.get("issues"))
                except Exception as e:
                    st.error(str(e))

        with anal_col:
            if st.button("Analyze with AI"):
                files = get_file_for_api(uploaded_files[0])
                try:
                    r = requests.post(f"{API_URL}/analyze", files=files)
                    rep = r.json()
                    st.write("### AI Analysis Results")
                    st.write(rep.get("analysis"))
                except Exception as e:
                    st.error(str(e))
    with col_right:
        st.write("### AI SQL Helper")
        nl_question = st.text_input("Describe the query you want (English)")
        if st.button("Generate SQL with AI"):
            if nl_question:
                # build schema dict for tables
                schemas = {}
                for t_name, df in dataframes.items():
                    schemas[t_name] = {col: str(dtype) for col, dtype in df.dtypes.items()}
                try:
                    resp = requests.post("http://localhost:8000/generate_sql", json={"question": nl_question, "tables": schemas})
                    if resp.ok:
                        gen_sql = resp.json().get("sql")
                        if gen_sql:
                            st.success("Generated SQL:")
                            st.code(gen_sql, language="sql")
                            st.session_state["sql_text"] = gen_sql
                        else:
                            st.error(resp.json().get("error", "No SQL returned."))
                    else:
                        st.error(f"Error: {resp.status_code}")
                except Exception as e:
                    st.error(str(e))
