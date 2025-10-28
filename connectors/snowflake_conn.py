import os
import pandas as pd
from snowflake.connector import connect
from snowflake.connector.pandas_tools import write_pandas


def sf_client():
    return connect(
        user=os.environ["SF_USER"],
        password=os.environ["SF_PASSWORD"],
        account=os.environ["SF_ACCOUNT"],
        warehouse=os.environ["SF_WAREHOUSE"],
        database=os.environ["SF_DATABASE"],
        schema=os.environ["SF_SCHEMA"],
        role=os.environ.get("SF_ROLE")
    )


def load_dataframe(df: pd.DataFrame, table: str):
    with sf_client() as cnx:
        success, nchunks, nrows, _ = write_pandas(cnx, df, table_name=table.upper(), auto_create_table=True)
        return {"success": bool(success), "rows": int(nrows)}
