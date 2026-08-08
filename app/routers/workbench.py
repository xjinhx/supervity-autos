# app/routers/workbench.py
"""
AI Workbench — a read-only display surface over Supabase `workbench_resolutions`.

Resolution happens in Auto's own Workbench forms; the Workbench Resolution
Logger Operator writes the outcome here. This page never resolves anything
itself — that would create a second, disconnected source of truth.
"""

import logging

from fastapi import APIRouter, HTTPException

from ..schemas.workbench import WorkbenchResolutionOut
from ..services import supabase_client

log = logging.getLogger(__name__)

router = APIRouter(prefix="/workbench", tags=["Workbench"])


@router.get("", response_model=list[WorkbenchResolutionOut])
def list_workbench_resolutions(item_type: str | None = None, limit: int = 100):
    return supabase_client.list_workbench_resolutions(item_type=item_type, limit=limit)


@router.get("/{resolution_id}", response_model=WorkbenchResolutionOut)
def get_workbench_resolution(resolution_id: str):
    resolution = supabase_client.get_workbench_resolution(resolution_id)
    if resolution is None:
        raise HTTPException(status_code=404, detail="Workbench resolution not found")
    return resolution
