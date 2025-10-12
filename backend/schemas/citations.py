from pydantic import BaseModel
from typing import Optional, Dict, Any

class CitationInfo(BaseModel):
    apa: str
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None

class CitationContext(BaseModel):
    thesis: str
    section_title: str
    subsection_title: str
    question: str
    methodology: Dict[str, Any]

class CitationValidityRequest(BaseModel):
    citation: CitationInfo
    context: CitationContext

class CitationValidityResponse(BaseModel):
    status: str  # 'valid', 'partial', 'invalid', 'error'
    explanation: str
    link: Optional[str] = None