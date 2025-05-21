import streamlit as st
import numpy as np

def apply_filters(df):
    st.sidebar.header("Filters")

    if df.empty:
        st.warning("No data available for filtering.")
        return df  # or df.head(0) for consistent schema

    # Safe fallback values if amount column has all NaNs
    min_amt = df["amount"].min()
    max_amt = df["amount"].max()

    if np.isnan(min_amt) or np.isnan(max_amt):
        min_amt, max_amt = 0.0, 10000.0  # fallback default

    locs = st.sidebar.multiselect("Location", df["location"].unique(), default=df["location"].unique())
    amt_range = st.sidebar.slider("Amount Range", min_amt, max_amt, (min_amt, max_amt))

    df = df[df["location"].isin(locs)]
    df = df[df["amount"].between(amt_range[0], amt_range[1])]
    return df
