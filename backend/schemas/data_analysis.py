from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class QuestionAnalysisRequest(BaseModel):
    questions: List[Dict[str, Any]] = Field(..., description="List of research questions with citations")
    citations: List[Dict[str, Any]] = Field(..., description="List of all citations")
    subsection_title: str = Field(..., description="Title of the subsection being analyzed")
    subsection_context: str = Field(..., description="Context/description of the subsection")
    section_title: str = Field(..., description="Title of the parent section")
    thesis: str = Field(..., description="Main thesis statement")
    methodology: str = Field(..., description="Research methodology")

class ThematicCluster(BaseModel):
    theme_name: str = Field(..., description="Name of the identified theme")
    theme_description: str = Field(..., description="Description of what this theme covers")
    questions: List[str] = Field(..., description="Questions that belong to this theme")
    key_concepts: List[str] = Field(..., description="Key concepts identified in this theme")
    evidence_types: List[str] = Field(..., description="Types of evidence found")
    temporal_scope: Optional[str] = Field(None, description="Time period covered by this theme")

class LogicalStructure(BaseModel):
    approach: str = Field(..., description="Recommended logical approach for organizing content")
    reasoning: str = Field(..., description="Explanation of why this approach was chosen")
    sequence: List[str] = Field(..., description="Recommended order for presenting themes")
    transitions: List[str] = Field(..., description="Suggested transitions between themes")

class OutlinePoint(BaseModel):
    level: str = Field(..., description="Outline level (1, a, i, etc.)")
    content: str = Field(..., description="The actual content of this outline point")
    supporting_evidence: List[str] = Field(..., description="Key evidence supporting this point")
    citations: List[int] = Field(..., description="Citation numbers that support this point")
    rationale: str = Field(..., description="Why this point is important and how it connects")

class GeneratedOutline(BaseModel):
    main_points: List[OutlinePoint] = Field(..., description="Main outline points")
    thematic_basis: str = Field(..., description="Explanation of how themes were organized")
    logical_flow: str = Field(..., description="Description of the logical progression")
    evidence_integration: str = Field(..., description="How evidence was integrated")

# Inclusion/Exclusion Analysis Schemas
class InclusionExclusionRequest(BaseModel):
    draftData: Dict[str, Any] = Field(..., description="Draft outline data to analyze")
    thesis: str = Field(..., description="Main thesis statement")

class ContentItem(BaseModel):
    content: str = Field(..., description="Content description")
    thesis_alignment: str = Field(..., description="How well this supports the thesis")
    rationale: str = Field(..., description="Reasoning for inclusion/exclusion")
    priority: str = Field(..., description="Priority level (high/medium/low)")

class InclusionExclusionAnalysis(BaseModel):
    section_purpose: str = Field(..., description="Overall purpose of this section")
    inclusion_criteria: List[str] = Field(..., description="Criteria for content inclusion")
    exclusion_criteria: List[str] = Field(..., description="Criteria for content exclusion")
    content_to_include: List[ContentItem] = Field(..., description="Content that should be included")
    content_to_exclude: List[ContentItem] = Field(..., description="Content that should be excluded")
    content_priorities: List[ContentItem] = Field(..., description="Prioritized content recommendations")
    narrative_flow: str = Field(..., description="How this fits into overall narrative")

class DataAnalysisResponse(BaseModel):
    thematic_clusters: List[ThematicCluster] = Field(..., description="Identified themes from the data")
    logical_structure: LogicalStructure = Field(..., description="Recommended structure")
    generated_outline: GeneratedOutline = Field(..., description="AI-generated outline based on analysis")
    content_summary: str = Field(..., description="Summary of what was found in the data")
    analysis_confidence: str = Field(..., description="Confidence level in the analysis")