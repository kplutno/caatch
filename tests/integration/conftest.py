"""
conftest.py — Integration test session configuration.

kubectl port-forward is prone to dropping TCP connections under concurrent
load (RemoteDisconnected / ConnectionAborted errors).  This conftest patches
the module-level ``requests.get / post / put / delete`` helpers to use a
shared Session backed by an HTTPAdapter that transparently retries on
connection-level failures, making the integration test suite resilient without
changing any individual test file.
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ── Retry-capable session ──────────────────────────────────────────────────
# ``connect=5``  → retry up to 5 times on TCP-level failures (e.g. port-forward
#                  drops the connection mid-flight before any HTTP bytes arrive)
# ``read=3``     → retry on read-timeout / incomplete responses
# ``backoff_factor=0.4`` → wait 0s, 0.4s, 0.8s, 1.6s, … between attempts
# ``allowed_methods=False`` → disable the method-allowlist so POST/DELETE are
#                             retried too (urllib3 >= 1.26 / 2.x)
_retry = Retry(
    connect=5,
    read=3,
    backoff_factor=0.4,
    allowed_methods=False,
)
_session = requests.Session()
_session.mount("http://", HTTPAdapter(max_retries=_retry))
_session.mount("https://", HTTPAdapter(max_retries=_retry))

# Patch the module-level convenience functions so every ``requests.post(...)``
# call in the test helpers automatically uses the retry-enabled session.
requests.get = _session.get  # type: ignore[method-assign]
requests.post = _session.post  # type: ignore[method-assign]
requests.put = _session.put  # type: ignore[method-assign]
requests.delete = _session.delete  # type: ignore[method-assign]
requests.patch = _session.patch  # type: ignore[method-assign]
requests.head = _session.head  # type: ignore[method-assign]
requests.options = _session.options  # type: ignore[method-assign]
