from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class OutlineSubsection(BaseModel):
    subsection_title: str
    subsection_context: str

class OutlineSection(BaseModel):
    section_title: str
    section_context: str
    subsections: List[OutlineSubsection] = []

class OutlineGenerationRequest(BaseModel):
    prompt: str

class OutlineGenerationResponse(BaseModel):
    outline: List[OutlineSection]

class SectionGenerationRequest(BaseModel):
    final_thesis: str
    methodology: Dict[str, Any]  # Can handle both string and object formats
    source_categories: List[str]

class SectionGenerationResponse(BaseModel):
    sections: List[OutlineSection]

class SubsectionGenerationRequest(BaseModel):
    section_title: str
    section_context: str
    final_thesis: str
    methodology: Dict[str, Any]
    source_categories: Optional[List[str]] = []

class SubsectionGenerationResponse(BaseModel):
    subsections: List[OutlineSubsection]

class QuestionGenerationRequest(BaseModel):
    final_thesis: str
    methodology: Dict[str, Any]
    section_title: str
    section_context: str
    subsection_title: str
    subsection_context: str

class QuestionGenerationResponse(BaseModel):
    questions: List[str]

class CitationGenerationRequest(BaseModel):
    final_thesis: str
    methodology: Dict[str, Any]
    section_title: str
    section_context: str
    subsection_title: str
    subsection_context: str
    question: str
    source_categories: List[str] = []
    citation_count: int = 3

class RecommendedSource(BaseModel):
    apa: str
    categories: List[str]
    methodologyPoints: List[str]
    description: str

class CitationGenerationResponse(BaseModel):
    recommended_sources: List[RecommendedSource]

# Additional schemas needed by structure.py
class OutlineRequest(BaseModel):
    final_thesis: str
    methodology: str
    source_categories: List[str]

class OutlineResponse(BaseModel):
    outline: List[OutlineSection]

class SectionsRequest(BaseModel):
    final_thesis: str
    methodology: str
    source_categories: List[str]

class SectionsResponse(BaseModel):
    sections: List[OutlineSection]

class SubsectionsRequest(BaseModel):
    final_thesis: str
    methodology: str
    section_title: str
    section_context: str
    source_categories: List[str]

class SubsectionsResponse(BaseModel):
    subsections: List[OutlineSubsection]

class QuestionsRequest(BaseModel):
    final_thesis: str
    methodology: str
    section_title: str
    section_context: str
    subsection_title: str
    subsection_context: str

class QuestionsResponse(BaseModel):
    questions: List[str]

# Fix forward references
OutlineSection.model_rebuild()