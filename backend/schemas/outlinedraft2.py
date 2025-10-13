from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class Citation(BaseModel):
    apa: str
    categories: Optional[List[str]] = []
    title: Optional[str] = ""
    author: Optional[str] = ""
    description: Optional[str] = ""
    methodologyPoints: Optional[List[str]] = []

class OutlineDraft1Section(BaseModel):
    """Structure for sections coming from Outline Draft 1"""
    section_title: str
    section_context: Optional[str] = ""
    category: Optional[str] = ""  # Data, Method, Analysis, etc.
    subsections: List[Dict[str, Any]] = []
    all_responses: List[str] = []  # Combined responses from all questions
    all_citations: List[Citation] = []  # All citations from this section

class FusedOutlineRequest(BaseModel):
    data_sections: List[OutlineDraft1Section]
    thesis: str
    methodology: str
    paper_type: str

class FusedSubsection(BaseModel):
    title: str
    content: str
    supporting_evidence: List[str]
    citations: List[Citation]

class FusedSection(BaseModel):
    title: str
    context: str
    subsections: List[FusedSubsection]
    section_summary: str

class FusedOutlineResponse(BaseModel):
    sections: List[FusedSection]
    outline_summary: str
    restructuring_notes: List[str]