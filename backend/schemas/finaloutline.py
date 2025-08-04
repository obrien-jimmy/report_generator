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