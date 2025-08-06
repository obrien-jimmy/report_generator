from pydantic import BaseModel
from typing import Any, Dict, List

class FinalOutlineRequest(BaseModel):
    outline: Any
    responses: Dict[str, str]
    thesis: str
    methodology: Any

class FinalOutlineTextResponse(BaseModel):
    text: str

class FinalOutlineTransitionsResponse(BaseModel):
    transitions: Dict[str, str]

class RefineSubsectionRequest(BaseModel):
    section_title: str
    subsection_title: str
    thesis: str
    methodology: str
    responses: list[str]
    citation_references: Dict[str, str] = {}  # Maps reference_id to citation info