from pydantic import BaseModel
from typing import List, Optional

class Citation(BaseModel):
    apa: Optional[str] = None
    title: Optional[str] = None
    source: Optional[str] = None
    author: Optional[str] = None
    reference_id: Optional[str] = None

    class Config:
        extra = "ignore"

class CitationReference(BaseModel):
    reference_id: str
    citation: Citation

class CitationResponseRequest(BaseModel):
    question: str
    citation: Citation
    section_context: Optional[str] = ""
    subsection_context: Optional[str] = ""
    thesis: str
    methodology: str
    question_number: int
    citation_number: int
    reference_id: Optional[str] = None

class FusedResponseRequest(BaseModel):
    question: str
    citation_responses: List[str]
    citations: List[Citation]
    section_context: Optional[str] = ""
    subsection_context: Optional[str] = ""
    thesis: str
    methodology: str
    question_number: int
    citation_references: Optional[List[CitationReference]] = []

class LLMResponse(BaseModel):
    response: str