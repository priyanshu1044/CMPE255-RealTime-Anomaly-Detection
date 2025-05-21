import streamlit as st
from streamlit_option_menu import option_menu
from pages import Dashboard, Analytics, Export, Investigation

st.set_page_config(page_title="Anomaly Detection App", layout="wide")

with st.sidebar:
    selected = option_menu(
        menu_title="Navigation",
        options=["Dashboard", "Analytics", "Investigation", "Export"],
        icons=["bar-chart", "graph-up", "search", "cloud-download"],
        default_index=0
    )

if selected == "Dashboard":
    Dashboard.render()
elif selected == "Analytics":
    Analytics.render()
elif selected == "Investigation":
    Investigation.render()
elif selected == "Export":
    Export.render()
