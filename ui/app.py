import streamlit as st
import pandas as pd
import duckdb
import requests
from io import BytesIO
import plotly.express as px

API_URL = "http://localhost:8000"

def get_file_for_api(uploaded_file):
    return {'file': (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}

def load_css(file_name):
    with open(file_name) as f:
        st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)

st.set_page_config(page_title="Databotics", layout="wide")
load_css("/Users/nikhilnarahari/Documents/GitHub/Databotics/ui/style.css")

# --- Hero Section ---
with st.container():
    st.markdown("<div class='hero fade-in'>", unsafe_allow_html=True)
    st.image("/Users/nikhilnarahari/Documents/GitHub/Databotics/ui/assets/logo.svg", width=100)
    st.markdown("<h1 class='logo'>Databotics</h1>", unsafe_allow_html=True)
    st.markdown("<p class='tagline'>Your AI Data Guardian</p>", unsafe_allow_html=True)
    if st.button("Try Now"):
        pass # Add action for the button
    st.markdown("</div>", unsafe_allow_html=True)

# --- Main App ---
with st.container():
    st.markdown("<div class='card slide-in-up'>", unsafe_allow_html=True)
    uploaded_files = st.file_uploader("Drop CSV/XLSX files", type=["csv","xlsx","xls"], accept_multiple_files=True)
    st.markdown("</div>", unsafe_allow_html=True)

con = duckdb.connect(database=':memory:')
dataframes = {}

if uploaded_files:
    for f in uploaded_files:
        raw = f.read()
        if f.name.endswith(("xlsx","xls")):
            df = pd.read_excel(BytesIO(raw), header=0)
        else:
            df = pd.read_csv(BytesIO(raw), header=0)
        table = f.name.split(".")[0].replace("-", "_")
        con.register(table, df)
        dataframes[table] = df
        st.success(f"Registered table: `{table}` ({df.shape[0]} rows)")

    st.markdown("<div class='card slide-in-up'>", unsafe_allow_html=True)
    st.subheader("Query Console")
    col_left, col_right = st.columns([2, 1])
    with col_left:
        st.markdown("<div class='query-console'>", unsafe_allow_html=True)
        tables_df = con.execute("SHOW TABLES").fetchdf()
        default_query = ""
        if len(tables_df) > 0:
            default_query = f"SELECT * FROM {tables_df.iloc[0,0]} LIMIT 10;"
        if "sql_text" not in st.session_state:
            st.session_state["sql_text"] = default_query
        st.text_area("SQL", key="sql_text", height=150)
        st.markdown("<span class='ai-assist-icon'>✨</span>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
        if st.button("Run SQL"):
            try:
                res = con.execute(st.session_state["sql_text"]).fetchdf()
                st.dataframe(res.head(1000))
            except Exception as e:
                st.error(str(e))

    with col_right:
        st.write("### AI SQL Helper")
        nl_question = st.text_input("Describe the query you want (English)")
        if st.button("Generate SQL with AI"):
            if nl_question:
                schemas = {}
                for t_name, df in dataframes.items():
                    schemas[t_name] = {col: str(dtype) for col, dtype in df.dtypes.items()}
                try:
                    resp = requests.post(f"{API_URL}/generate_sql", json={"question": nl_question, "tables": schemas})
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
    st.markdown("</div>", unsafe_allow_html=True)

    # --- Visualization Dashboard ---
    st.markdown("<div class='card slide-in-up'>", unsafe_allow_html=True)
    st.subheader("Visualization Dashboard")
    if not dataframes:
        st.info("Upload a file to see visualizations.")
    else:
        # Create a sample chart
        first_df_name = list(dataframes.keys())[0]
        first_df = dataframes[first_df_name]
        if len(first_df.columns) > 1:
            try:
                fig = px.scatter(first_df, x=first_df.columns[0], y=first_df.columns[1], title=f"Sample Plot of {first_df_name}")
                st.plotly_chart(fig, use_container_width=True)
            except Exception as e:
                st.warning(f"Could not generate a plot: {e}")
        else:
            st.info("Not enough columns to create a plot.")
    st.markdown("</div>", unsafe_allow_html=True)

# --- Database Connectors ---
st.markdown("<div class='card slide-in-up'>", unsafe_allow_html=True)
st.subheader("Database Connectors")
col1, col2, col3 = st.columns(3)
with col1:
    st.markdown("<div class='connector-card'>", unsafe_allow_html=True)
    st.image("/Users/nikhilnarahari/Documents/GitHub/Databotics/ui/assets/postgresql.svg", width=64)
    st.write("PostgreSQL")
    st.markdown("</div>", unsafe_allow_html=True)
with col2:
    st.markdown("<div class='connector-card'>", unsafe_allow_html=True)
    st.image("/Users/nikhilnarahari/Documents/GitHub/Databotics/ui/assets/mysql.svg", width=64)
    st.write("MySQL")
    st.markdown("</div>", unsafe_allow_html=True)
with col3:
    st.markdown("<div class='connector-card'>", unsafe_allow_html=True)
    st.image("/Users/nikhilnarahari/Documents/GitHub/Databotics/ui/assets/snowflake.svg", width=64)
    st.write("Snowflake")
    st.markdown("</div>", unsafe_allow_html=True)
st.markdown("</div>", unsafe_allow_html=True)

# --- Footer ---
st.markdown("<div class='footer'>", unsafe_allow_html=True)
st.write("© 2025 Databotics. All rights reserved.")
st.markdown("</div>", unsafe_allow_html=True)
