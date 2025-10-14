from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class Citation(BaseModel):
    apa: str
    categories: Optional[List[str]] = []
    title: Optional[str] = ""
    author: Optional[str] = ""
    description: Optional[str] = ""
    methodologyPoints: Optional[List[str]] = []

class DataSectionAnalysisRequest(BaseModel):
    """Request to analyze and identify data sections from outline drafts"""
    outline_framework: List[Dict[str, Any]]
    outline_draft1: List[Dict[str, Any]]
    thesis: str
    methodology: str
    paper_type: str

class DataSubsection(BaseModel):
    """A data subsection with academic prose content"""
    subsection_number: str
    subsection_title: str
    academic_content: str  # 1-3 paragraphs of academic prose
    data_sources: List[str]  # Key datasets/evidence described
    citations: List[Citation]
    transition_to_next: Optional[str] = ""  # Linking sentence to next subsection

class DataSection(BaseModel):
    """A complete data section with multiple subsections"""
    section_number: str
    section_title: str
    section_purpose: str  # 1-2 sentences introducing section purpose
    subsections: List[DataSubsection]
    section_summary: str  # Brief paragraph linking to next analytical phase

class DataSectionBuildRequest(BaseModel):
    """Request to build specific data sections into academic prose"""
    identified_data_sections: List[Dict[str, Any]]  # Sections identified as "Data" 
    outline_framework: List[Dict[str, Any]]
    outline_draft1: List[Dict[str, Any]]
    thesis: str
    methodology: str
    paper_type: str
    target_section_indices: Optional[List[int]] = []  # Which sections to build (iterative)

class DataSectionAnalysisResponse(BaseModel):
    """Response containing identified data sections and their structure"""
    identified_sections: List[Dict[str, Any]]  # Sections that contain factual data/evidence
    section_purposes: List[str]  # Purpose of each identified section
    recommended_build_order: List[int]  # Suggested order for building sections
    analysis_summary: str

class DataSectionBuildResponse(BaseModel):
    """Response containing built data sections in academic prose"""
    built_sections: List[DataSection]
    continuity_notes: List[str]  # Notes about flow between sections
    completion_status: str  # "partial" or "complete"
    next_recommended_sections: List[int]  # Which sections to build next