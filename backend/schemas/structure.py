from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class PaperStructureRequest(BaseModel):
    paper_type: str
    methodology_id: Optional[str] = None
    sub_methodology_id: Optional[str] = None

class PaperStructureResponse(BaseModel):
    structure: List[str]
    total_sections: int
    paper_type: str
    methodology: Optional[str] = None
    sub_methodology: Optional[str] = None
    has_methodology_sections: bool

class StructuredOutlineRequest(BaseModel):
    final_thesis: str
    paper_type: str
    methodology: Dict[str, Any]
    paper_length_pages: int
    source_categories: List[str]
    methodology_id: Optional[str] = None
    sub_methodology_id: Optional[str] = None

class StructuredOutlineResponse(BaseModel):
    outline: List[Dict[str, Any]]
    structure_preview: Dict[str, Any]