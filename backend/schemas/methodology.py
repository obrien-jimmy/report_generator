from pydantic import BaseModel, Field
from typing import List, Optional

class MethodologySelectionRequest(BaseModel):
    methodology_type: str
    # sub_methodology: Optional[str] = None  # Keep but make unused
    final_thesis: str
    paper_type: str
    paper_purpose: str
    paper_tone: str
    paper_structure: str
    source_categories: List[str]
    page_count: int

class MethodologyOption(BaseModel):
    id: str
    name: str
    description: str
    sub_methodologies: Optional[List['MethodologyOption']] = None

class MethodologyOptionsResponse(BaseModel):
    methodologies: List[MethodologyOption]

class GeneratedMethodology(BaseModel):
    title: str
    description: str
    approach: str
    source_focus: str
    structure_alignment: str
    methodology_type: str = Field(description="Either 'Focused', 'Comprehensive', or 'Innovative'")

class MethodologyGenerationResponse(BaseModel):
    methodologies: List[GeneratedMethodology]
    selected_methodology_info: dict

class MethodologyRequest(BaseModel):
    final_thesis: str
    source_categories: List[str]

class MethodologyResponse(BaseModel):
    methodology: str

# Fix forward reference
MethodologyOption.model_rebuild()