"""
db.py — Supabase client factory.

Keys are stripped of whitespace/newlines defensively so a trailing
newline in .env or a Render env var never causes "Illegal header value".
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.dirname(_BACKEND_DIR)
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))
load_dotenv(os.path.join(_ROOT_DIR, ".env"))  # optional repo-root fallback


# Strip all whitespace — guards against trailing \n from .env or Render
SUPABASE_URL: str         = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_ANON_KEY: str    = os.environ.get("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_KEY: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()


def get_anon_client() -> Client:
    """Anon client — honours RLS. Use for public/unauthenticated calls."""
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def get_service_client() -> Client:
    """
    Service-role client — bypasses RLS.
    Use ONLY for server-side admin operations and audit logging.
    Never expose responses from this client directly to the browser.
    """
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_user_client(access_token: str) -> Client:
    """
    Returns a Supabase client with the user's JWT set for RLS queries.
    """
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    try:
        client.postgrest.auth(access_token.strip())
    except Exception:
        pass
    return client
