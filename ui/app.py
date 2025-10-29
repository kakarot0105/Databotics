import streamlit as st
import pandas as pd
import duckdb
import requests
from requests.exceptions import RequestException
from io import BytesIO
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path
import os
import openai
try:
    from pycatcher import outlier_detection_functions as pc  # type: ignore
except Exception:
    pc = None

API_URL = os.getenv("DATABOTICS_API_URL", "http://localhost:8000")

def is_api_online(api_url: str) -> bool:
    try:
        r = requests.get(f"{api_url}/openapi.json", timeout=2)
        return r.ok
    except Exception:
        return False

def get_file_for_api(uploaded_file):
    return {'file': (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}

def load_css(file_name):
    with open(file_name) as f:
        st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)

BASE_DIR = Path(__file__).parent
ASSETS_DIR = BASE_DIR / "assets"
st.set_page_config(page_title="Databotics", page_icon=str(ASSETS_DIR / "logo.svg"), layout="wide")
load_css(str(BASE_DIR / "style.css"))

# Top navbar
api_online = is_api_online(API_URL)
st.markdown(
    f"""
    <div class='navbar'>
      <div class='brand'>
        <img src='{str(ASSETS_DIR / 'logo.svg')}' alt='logo'/>
        Databotics
      </div>
      <div class='actions'>
        <span class='pill'>{'API Online' if api_online else 'API Offline'}</span>
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# --- Hero Section ---
with st.container():
    st.markdown("<div class='hero fade-in'>", unsafe_allow_html=True)
    st.image(str(ASSETS_DIR / "logo.svg"), width=96)
    st.markdown("<h1 class='logo'>Databotics</h1>", unsafe_allow_html=True)
    st.markdown("<p class='tagline'>Your AI Data Guardian</p>", unsafe_allow_html=True)
    if st.button("Use Sample Data"):
        try:
            sample_path = (BASE_DIR.parent / "test_data.csv")
            df = pd.read_csv(sample_path)
            con.register("sample_data", df)
            st.session_state.setdefault("workspace_ready", True)
            st.session_state.setdefault("dataframes_cache", {})
            st.session_state["dataframes_cache"]["sample_data"] = df
            st.success("Sample data loaded into workspace as `sample_data`")
        except Exception as e:
            st.error(f"Failed to load sample: {e}")
    st.markdown("</div>", unsafe_allow_html=True)

# Sidebar quick settings
with st.sidebar:
    st.markdown("### Settings")
    new_url = st.text_input("API URL", value=API_URL, help="Set DATABOTICS_API_URL to persist")
    if new_url and new_url != API_URL:
        API_URL = new_url
        api_online = is_api_online(API_URL)
    st.markdown(f"Status: {'🟢 Online' if api_online else '🔴 Offline'}")

# --- Main App ---
with st.container():
    st.markdown("<div class='card slide-in-up'>", unsafe_allow_html=True)
    st.markdown("<span class='badge'>Upload</span>", unsafe_allow_html=True)
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

# If we have any data in memory, enable workspace features
if dataframes or st.session_state.get("dataframes_cache"):
    # Merge cached sample into session workspace
    if st.session_state.get("dataframes_cache"):
        for k, v in st.session_state["dataframes_cache"].items():
            if k not in dataframes:
                dataframes[k] = v
                try:
                    con.register(k, v)
                except Exception:
                    pass

    # Quick metrics
    try:
        first_df_name = list(dataframes.keys())[0]
        first_df = dataframes[first_df_name]
        m1, m2, m3 = st.columns(3)
        m1.metric("Tables Loaded", len(dataframes))
        m2.metric("Rows (first)", f"{len(first_df):,}")
        m3.metric("Columns (first)", f"{first_df.shape[1]}")
    except Exception:
        pass

    st.markdown("<div class='card slide-in-up'>", unsafe_allow_html=True)
    st.subheader("Query Console")
    tab_query, tab_ai = st.tabs(["Query", "Databotics AI"])
    with tab_query:
        st.markdown("<div class='query-console'>", unsafe_allow_html=True)
        tables_df = con.execute("SHOW TABLES").fetchdf()
        default_query = ""
        if len(tables_df) > 0:
            default_query = f"SELECT * FROM {tables_df.iloc[0,0]} LIMIT 10;"
        if "sql_text" not in st.session_state:
            st.session_state["sql_text"] = default_query
        st.text_area("SQL", key="sql_text", height=160, placeholder="Write a SQL query to explore your tables…")
        st.markdown("<span class='ai-assist-icon'>✨</span>", unsafe_allow_html=True)
        if st.button("Run SQL"):
            try:
                res = con.execute(st.session_state["sql_text"]).fetchdf()
                st.dataframe(res.head(1000))
            except Exception as e:
                st.error(str(e))
        st.markdown("</div>", unsafe_allow_html=True)

    with tab_ai:
        nl_question = st.text_input("Describe the query you want (English)")
        if st.button("Databotics AI"):
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
        st.info("Upload or load a sample to see visualizations.")
    else:
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

# Maintain simple state buckets
if "connections" not in st.session_state:
    st.session_state["connections"] = {}

pg_icon, mysql_icon, sf_icon = [
    str(ASSETS_DIR / "postgresql.svg"),
    str(ASSETS_DIR / "mysql.svg"),
    str(ASSETS_DIR / "snowflake.svg"),
]

with st.expander("PostgreSQL", expanded=False):
    st.image(pg_icon, width=48)
    pg_host = st.text_input("Host", value="localhost", key="pg_host")
    pg_port = st.number_input("Port", min_value=1, max_value=65535, value=5432, key="pg_port")
    pg_db = st.text_input("Database", key="pg_db")
    pg_user = st.text_input("User", key="pg_user")
    pg_pwd = st.text_input("Password", type="password", key="pg_pwd")
    col_pg1, col_pg2 = st.columns([1,1])
    with col_pg1:
        if st.button("Test Connection", key="pg_test"):
            try:
                import psycopg2
                conn = psycopg2.connect(host=pg_host, port=pg_port, dbname=pg_db, user=pg_user, password=pg_pwd)
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    cur.fetchone()
                conn.close()
                st.success("Connected to PostgreSQL ✅")
            except ImportError:
                st.error("psycopg2-binary not installed. Run: pip install psycopg2-binary")
            except Exception as e:
                st.error(f"Connection failed: {e}")
    with col_pg2:
        if st.button("List & Load Tables", key="pg_load"):
            try:
                import psycopg2
                import pandas as pd
                conn = psycopg2.connect(host=pg_host, port=pg_port, dbname=pg_db, user=pg_user, password=pg_pwd)
                q = """
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema')
                    ORDER BY 1,2
                    LIMIT 200
                """
                tables = pd.read_sql(q, conn)
                conn.close()
                if tables.empty:
                    st.info("No tables found.")
                else:
                    st.dataframe(tables)
                    st.session_state["pg_tables"] = tables
            except ImportError:
                st.error("psycopg2-binary not installed. Run: pip install psycopg2-binary")
            except Exception as e:
                st.error(f"Failed: {e}")
    if "pg_tables" in st.session_state and not st.session_state["pg_tables"].empty:
        sel = st.selectbox(
            "Select table to load into workspace",
            st.session_state["pg_tables"].apply(lambda r: f"{r['table_schema']}.{r['table_name']}", axis=1),
            key="pg_table_sel",
        )
        if st.button("Load Selected Table to DuckDB", key="pg_fetch"):
            try:
                import psycopg2
                import pandas as pd
                schema, name = sel.split(".", 1)
                conn = psycopg2.connect(host=pg_host, port=pg_port, dbname=pg_db, user=pg_user, password=pg_pwd)
                df_remote = pd.read_sql(f'SELECT * FROM "{schema}"."{name}" LIMIT 1000', conn)
                conn.close()
                local_name = f"{schema}_{name}".replace(".", "_")
                con.register(local_name, df_remote)
                dataframes[local_name] = df_remote
                st.success(f"Loaded {len(df_remote)} rows from {sel} into `{local_name}`")
            except Exception as e:
                st.error(f"Load failed: {e}")

with st.expander("MySQL", expanded=False):
    st.image(mysql_icon, width=48)
    my_host = st.text_input("Host", value="localhost", key="my_host")
    my_port = st.number_input("Port", min_value=1, max_value=65535, value=3306, key="my_port")
    my_db = st.text_input("Database", key="my_db")
    my_user = st.text_input("User", key="my_user")
    my_pwd = st.text_input("Password", type="password", key="my_pwd")
    c1, c2 = st.columns([1,1])
    with c1:
        if st.button("Test Connection", key="my_test"):
            try:
                import pymysql
                conn = pymysql.connect(host=my_host, port=int(my_port), user=my_user, password=my_pwd, database=my_db)
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    cur.fetchone()
                conn.close()
                st.success("Connected to MySQL ✅")
            except ImportError:
                st.error("pymysql not installed. Run: pip install pymysql")
            except Exception as e:
                st.error(f"Connection failed: {e}")
    with c2:
        if st.button("List & Load Tables", key="my_load"):
            try:
                import pymysql
                import pandas as pd
                conn = pymysql.connect(host=my_host, port=int(my_port), user=my_user, password=my_pwd, database=my_db)
                q = """
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_type='BASE TABLE' AND table_schema NOT IN ('mysql','information_schema','performance_schema','sys')
                    ORDER BY 1,2
                    LIMIT 200
                """
                tables = pd.read_sql(q, conn)
                conn.close()
                if tables.empty:
                    st.info("No tables found.")
                else:
                    st.dataframe(tables)
                    st.session_state["my_tables"] = tables
            except ImportError:
                st.error("pymysql not installed. Run: pip install pymysql")
            except Exception as e:
                st.error(f"Failed: {e}")
    if "my_tables" in st.session_state and not st.session_state["my_tables"].empty:
        sel = st.selectbox(
            "Select table to load into workspace",
            st.session_state["my_tables"].apply(lambda r: f"{r['table_schema']}.{r['table_name']}", axis=1),
            key="my_table_sel",
        )
        if st.button("Load Selected Table to DuckDB", key="my_fetch"):
            try:
                import pymysql
                import pandas as pd
                schema, name = sel.split(".", 1)
                conn = pymysql.connect(host=my_host, port=int(my_port), user=my_user, password=my_pwd, database=my_db)
                df_remote = pd.read_sql(f'SELECT * FROM `{schema}`.`{name}` LIMIT 1000', conn)
                conn.close()
                local_name = f"{schema}_{name}".replace(".", "_")
                con.register(local_name, df_remote)
                dataframes[local_name] = df_remote
                st.success(f"Loaded {len(df_remote)} rows from {sel} into `{local_name}`")
            except Exception as e:
                st.error(f"Load failed: {e}")

with st.expander("Snowflake", expanded=False):
    st.image(sf_icon, width=48)
    sf_account = st.text_input("Account", key="sf_account", placeholder="xy12345")
    sf_user = st.text_input("User", key="sf_user")
    sf_pwd = st.text_input("Password", type="password", key="sf_pwd")
    sf_warehouse = st.text_input("Warehouse", key="sf_wh")
    sf_database = st.text_input("Database", key="sf_db")
    sf_schema = st.text_input("Schema", key="sf_schema")
    c1, c2 = st.columns([1,1])
    with c1:
        if st.button("Test Connection", key="sf_test"):
            try:
                import snowflake.connector as sf
                conn = sf.connect(user=sf_user, password=sf_pwd, account=sf_account, warehouse=sf_warehouse, database=sf_database, schema=sf_schema)
                conn.close()
                st.success("Connected to Snowflake ✅")
            except Exception as e:
                st.error(f"Connection failed: {e}")
    with c2:
        if st.button("List & Load Tables", key="sf_load"):
            try:
                import snowflake.connector as sf
                import pandas as pd
                conn = sf.connect(user=sf_user, password=sf_pwd, account=sf_account, warehouse=sf_warehouse, database=sf_database, schema=sf_schema)
                q = """
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_type='BASE TABLE'
                    ORDER BY 1,2
                    LIMIT 200
                """
                tables = pd.read_sql(q, conn)
                conn.close()
                if tables.empty:
                    st.info("No tables found.")
                else:
                    st.dataframe(tables)
                    st.session_state["sf_tables"] = tables
            except Exception as e:
                st.error(f"Failed: {e}")
    if "sf_tables" in st.session_state and not st.session_state["sf_tables"].empty:
        sel = st.selectbox(
            "Select table to load into workspace",
            st.session_state["sf_tables"].apply(lambda r: f"{r['table_schema']}.{r['table_name']}", axis=1),
            key="sf_table_sel",
        )
        if st.button("Load Selected Table to DuckDB", key="sf_fetch"):
            try:
                import snowflake.connector as sf
                import pandas as pd
                schema, name = sel.split(".", 1)
                conn = sf.connect(user=sf_user, password=sf_pwd, account=sf_account, warehouse=sf_warehouse, database=sf_database, schema=sf_schema)
                df_remote = pd.read_sql(f'SELECT * FROM "{schema}"."{name}" LIMIT 1000', conn)
                conn.close()
                local_name = f"{schema}_{name}".replace(".", "_")
                con.register(local_name, df_remote)
                dataframes[local_name] = df_remote
                st.success(f"Loaded {len(df_remote)} rows from {sel} into `{local_name}`")
            except Exception as e:
                st.error(f"Load failed: {e}")

st.markdown("</div>", unsafe_allow_html=True)

# --- Anomaly Detector ---
st.markdown("<div class='card slide-in-up'>", unsafe_allow_html=True)
st.subheader("Anomaly Detector")
st.caption("Detect outliers with PyCatcher and get an AI summary. Falls back to local detection if API is offline.")

def _infer_date_col(frame: pd.DataFrame):
    for c in frame.columns:
        if pd.api.types.is_datetime64_any_dtype(frame[c]):
            return c
    for name in ["date", "timestamp", "time", "datetime", "ds", "day", "month", "year"]:
        for c in frame.columns:
            if c.lower() == name:
                return c
    for c in frame.columns:
        try:
            parsed = pd.to_datetime(frame[c], errors="coerce")
            if parsed.notna().mean() > 0.7:
                return c
        except Exception:
            pass
    return None

def _local_detect(df_in: pd.DataFrame, dcol: str | None, vcol: str | None, method_key: str):
    res = {"anomalies": [], "analysis": None, "error": None}
    ts_df = None
    if dcol and vcol and dcol in df_in.columns and vcol in df_in.columns:
        ts_df = df_in[[dcol, vcol]].dropna().copy()
        try:
            ts_df[dcol] = pd.to_datetime(ts_df[dcol], errors="coerce")
        except Exception:
            pass
        ts_df = ts_df.dropna(subset=[dcol]).sort_values(by=dcol)
    if pc is None:
        res["error"] = "PyCatcher not installed. Run: pip install pycatcher"
    elif ts_df is None or ts_df.shape[0] < 8:
        res["error"] = "Provide a date column and a numeric value column for time-series detection."
    else:
        try:
            df_pc = ts_df[[dcol, vcol]].copy()
            def run_pc(m: str, frame: pd.DataFrame):
                m = m.lower()
                if m == "classic":
                    return pc.detect_outliers_classic(frame)
                if m == "stl":
                    return pc.detect_outliers_stl(frame)
                if m == "mstl":
                    return pc.detect_outliers_mstl(frame)
                if m == "esd":
                    return pc.detect_outliers_esd(frame)
                if m == "moving_average":
                    return pc.detect_outliers_moving_average(frame)
                if m == "iqr":
                    return pc.find_outliers_iqr(frame)
                try:
                    return pc.detect_outliers_stl(frame)
                except Exception:
                    return pc.find_outliers_iqr(frame)
            out = run_pc(method_key, df_pc)
            if isinstance(out, pd.DataFrame) and not out.empty:
                res["anomalies"] = out.to_dict(orient="records")
        except Exception as e:
            res["error"] = f"Local detection error: {e}"

    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            openai.api_key = api_key
            sample = df_in.sample(min(50, len(df_in)))
            sample_csv = sample.to_csv(index=False)
            prompt = (
                "You are a data analyst. Given the sample data and any detected anomalies, summarize "
                "the most likely issues, potential root causes, and next steps. Use concise bullets.\n\n"
                f"Sample (CSV):\n{sample_csv}\n\n"
                f"Anomalies preview: {res['anomalies'][:10]}"
            )
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that analyzes data."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                n=1,
                temperature=0.3,
            )
            res["analysis"] = response.choices[0].message.content.strip()
        except Exception as e:
            res["analysis"] = f"OpenAI error: {e}"
    else:
        res["analysis"] = "Set OPENAI_API_KEY to enable AI summary."
    return res

# Dataset selection and column mapping
active_df_name = None
if dataframes:
    active_df_name = st.selectbox("Dataset", options=list(dataframes.keys()), index=0)
df_for_opts = dataframes.get(active_df_name) if active_df_name else (list(dataframes.values())[0] if dataframes else None)

date_option = None
value_option = None
method_map = {
    "Auto": "auto",
    "Classical (decomposition)": "classic",
    "STL (seasonal-trend)": "stl",
    "MSTL (multi-seasonal)": "mstl",
    "ESD (extreme deviate)": "esd",
    "Moving Average": "moving_average",
    "IQR": "iqr",
}
method_label = st.selectbox("Detection method", options=list(method_map.keys()), index=0)
freq_label = st.selectbox("Frequency", options=["Auto", "D", "W", "M", "Q"], index=0)

col1, col2 = st.columns(2)
with col1:
    if df_for_opts is not None:
        cols = df_for_opts.columns.tolist()
        # try to preselect a date-like column
        guess_date = None
        for c in cols:
            if pd.api.types.is_datetime64_any_dtype(df_for_opts[c]):
                guess_date = c; break
        if guess_date is None:
            for name in ["date", "timestamp", "time", "datetime", "ds", "day", "month", "year"]:
                for c in cols:
                    if c.lower() == name:
                        guess_date = c; break
                if guess_date: break
        date_option = st.selectbox("Date column", options=[""] + cols, index=(cols.index(guess_date)+1 if guess_date in cols else 0))
with col2:
    if df_for_opts is not None:
        num_cols = [c for c in df_for_opts.columns if pd.api.types.is_numeric_dtype(df_for_opts[c])]
        value_option = st.selectbox("Value column", options=[""] + num_cols, index=(num_cols.index(num_cols[-1])+1 if num_cols else 0))

if st.button("Detect Anomalies", key="anomaly_btn"):
    files = None
    data = {}
    # Prepare file and form fields
    if active_df_name and df_for_opts is not None:
        csv_bytes = df_for_opts.to_csv(index=False).encode("utf-8")
        files = {"file": (f"{active_df_name}.csv", csv_bytes, "text/csv")}
        if date_option:
            data["date_col"] = date_option
        if value_option:
            data["value_col"] = value_option
    elif uploaded_files:
        files = get_file_for_api(uploaded_files[0])
    # method/freq
    data["method"] = method_map.get(method_label, "auto")
    if freq_label != "Auto":
        data["freq"] = freq_label

    if not files:
        st.warning("Please upload data or load the sample first.")
    else:
        try:
            r = requests.post(f"{API_URL}/analyze", files=files, data=data, timeout=8)
            rep = r.json()
            if rep.get("error") and not rep.get("analysis"):
                st.error(rep.get("error"))
            # Show Pycatcher results if present
            if rep.get("anomalies"):
                st.write("### Detected Anomalies")
                try:
                    st.dataframe(pd.DataFrame(rep["anomalies"]))
                except Exception:
                    st.write(rep["anomalies"])
            # Plot overlay if possible
            if rep.get("anomalies") and active_df_name and df_for_opts is not None and (date_option or _infer_date_col(df_for_opts)) and value_option:
                dcol = date_option or _infer_date_col(df_for_opts)
                vcol = value_option
                try:
                    base = df_for_opts.dropna(subset=[dcol, vcol]).copy()
                    base[dcol] = pd.to_datetime(base[dcol], errors="coerce")
                    an_df = pd.DataFrame(rep["anomalies"]) if isinstance(rep.get("anomalies"), list) else pd.DataFrame()
                    fig = go.Figure()
                    fig.add_trace(go.Scatter(x=base[dcol], y=base[vcol], mode='lines+markers', name='Series'))
                    if not an_df.empty and "date" in an_df.columns:
                        xs = pd.to_datetime(an_df["date"], errors="coerce")
                        ys = an_df.get("value")
                        fig.add_trace(go.Scatter(x=xs, y=ys, mode='markers', name='Anomalies', marker=dict(color='red', size=9)))
                    fig.update_layout(title="Time Series with Anomalies", template="plotly_dark")
                    st.plotly_chart(fig, use_container_width=True)
                except Exception:
                    pass
            # Show AI analysis
            analysis = rep.get("analysis")
            if analysis:
                st.write("### AI Summary")
                lines = [l.strip() for l in str(analysis).splitlines() if l.strip()]
                for l in lines:
                    st.markdown(f"- {l}")
            if not rep.get("anomalies") and not analysis:
                st.info("No analysis returned.")
        except RequestException:
            st.warning("API unreachable. Running local detection instead…")
            dcol = date_option or (df_for_opts is not None and _infer_date_col(df_for_opts)) or None
            vcol = value_option
            rep = _local_detect(df_for_opts if df_for_opts is not None else pd.DataFrame(), dcol, vcol, data.get("method", "auto"))
            if rep.get("error"):
                st.error(rep["error"])    
            if rep.get("anomalies"):
                st.write("### Detected Anomalies (Local)")
                try:
                    st.dataframe(pd.DataFrame(rep["anomalies"]))
                except Exception:
                    st.write(rep["anomalies"])
            analysis = rep.get("analysis")
            if analysis:
                st.write("### AI Summary")
                lines = [l.strip() for l in str(analysis).splitlines() if l.strip()]
                for l in lines:
                    st.markdown(f"- {l}")
st.markdown("</div>", unsafe_allow_html=True)

# --- Footer ---
st.markdown("<div class='footer'>", unsafe_allow_html=True)
st.write("© 2025 Databotics. All rights reserved.")
st.markdown("</div>", unsafe_allow_html=True)
