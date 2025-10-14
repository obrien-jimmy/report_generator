from pydantic import BaseModel, Field
from typing import List, Optional

class SourceRecommendationRequest(BaseModel):
    final_thesis: str

class RecommendedSource(BaseModel):
    apa: str
    categories: List[str]
    methodologyPoints: List[str]
    description: str

class WorksCitedRequest(BaseModel):
    final_thesis: str
    methodology: str
    section_title: str
    section_context: str
    subsection_title: str
    subsection_context: str
    source_categories: List[str]
    citation_count: int = Field(4, description="Number of citation entries to generate")

class WorksCitedResponse(BaseModel):
    recommended_sources: List[RecommendedSource]

class QuestionCitationRequest(BaseModel):
    final_thesis: str
    methodology: str
    section_title: str
    section_context: str
    subsection_title: str
    subsection_context: str
    question: str
    source_categories: List[str]
    citation_count: int = Field(3, description="Number of citation entries to generate")

class QuestionCitationResponse(BaseModel):
    recommended_sources: List[RecommendedSource]

class CitationSearchRequest(BaseModel):
    title: Optional[str] = ""
    source: Optional[str] = ""
    year: Optional[str] = ""
    author: Optional[str] = ""

class IdentifiedCitation(BaseModel):
    apa: str
    categories: List[str]
    methodologyPoints: List[str]
    description: str