from pydantic import BaseModel, Field
from typing import List, Optional

class ThesisInteraction(BaseModel):
    current_topic: str
    user_responses: Optional[List[str]] = Field(default_factory=list)
    history: Optional[List[str]] = Field(default_factory=list)

class AutoRefineRequest(BaseModel):
    thesis: str

class AutoRefineResponse(BaseModel):
    refined_thesis: str

class PromptRequest(BaseModel):
    prompt: str

