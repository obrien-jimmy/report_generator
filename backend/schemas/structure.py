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
    paper_type: str
    final_thesis: str
    methodology: Dict[str, Any]  # Now Dict and Any are properly imported
    source_categories: List[str]
    methodology_id: Optional[str] = None
    sub_methodology_id: Optional[str] = None
    custom_structure: Optional[List[Dict[str, Any]]] = None

class StructuredOutlineResponse(BaseModel):
    outline: List[Dict[str, Any]]