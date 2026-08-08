# app/routers/__init__.py
"""
API Routers - Modular endpoint organization.

Note: File endpoints are defined in main.py to maintain proper path ordering.
"""

from .admin import router as admin_router
from .audit import router as audit_router
from .auth import router as auth_router
from .dashboard import router as dashboard_router
from .examples import router as examples_router
from .health import router as health_router
from .insights import router as insights_router
from .integrations import router as integrations_router
from .items import router as items_router
from .orchestrator import router as orchestrator_router
from .policies import router as policies_router
from .workbench import router as workbench_router

# Imported last: app.services.ai_chat reaches back into the dashboard/
# policies/workbench routers, so those must already be fully imported above.
from .ai_chat import router as ai_chat_router  # noqa: E402

__all__ = [
    "health_router",
    "auth_router",
    "admin_router",
    "audit_router",
    "items_router",
    "examples_router",
    "policies_router",
    "workbench_router",
    "insights_router",
    "dashboard_router",
    "integrations_router",
    "orchestrator_router",
    "ai_chat_router",
]
