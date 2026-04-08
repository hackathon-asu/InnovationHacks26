# --------0x0x0x0x0x0-----------
# InsightRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
Payer-specific policy retrievers.
Each retriever implements BasePolicyRetriever and knows how to find,
download, and return policy documents for its specific payer.
"""
from app.retrievers.base import BasePolicyRetriever, FetchResult

__all__ = ["BasePolicyRetriever", "FetchResult"]
