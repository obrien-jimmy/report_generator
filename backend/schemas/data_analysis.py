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
    literatureReviewData: Dict[str, Any] = Field(..., description="Literature review data to analyze")
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

# Build Data Outline Schemas
class SectionPosition(BaseModel):
    current: int = Field(..., description="Current section number")
    total: int = Field(..., description="Total number of sections")

class PreviousSection(BaseModel):
    title: str = Field(..., description="Title of the previous section")
    key_points: List[str] = Field(..., description="Key points from the previous section")

class BuildDataOutlineRequest(BaseModel):
    section_title: str = Field(..., description="Title of the section to build")
    section_context: str = Field(..., description="Context/description of the section")
    subsections: List[Dict[str, Any]] = Field(..., description="Subsections with questions and citations")
    logic_framework: List[Dict[str, Any]] = Field(..., description="Logic analysis results from Step 2")
    draft_outline_context: Optional[Dict[str, Any]] = Field(None, description="Context from Draft Outline 1")
    thesis: str = Field(..., description="Main thesis statement")
    methodology: str = Field(..., description="Research methodology")
    paper_type: str = Field(..., description="Type of academic paper")
    section_position: SectionPosition = Field(..., description="Position of this section in the paper")
    previous_sections: List[PreviousSection] = Field(default_factory=list, description="Previous sections for context")

class SubsectionOutline(BaseModel):
    subsection_title: str = Field(..., description="Title of the subsection")
    context_integration: Optional[str] = Field(None, description="How Step 1 context shapes this subsection")
    logic_integration: Optional[str] = Field(None, description="How Step 2 logic focuses this subsection")
    draft_integration: Optional[str] = Field(None, description="What Step 3 draft content is incorporated")
    main_points: List[str] = Field(..., description="Main points to cover")
    supporting_details: List[str] = Field(..., description="Supporting details and evidence")
    transitions: List[str] = Field(..., description="Transition statements")
    citations_used: List[int] = Field(..., description="Citation numbers referenced")
    step_integration_notes: Optional[str] = Field(None, description="How all 5 steps contributed to this subsection outline")

class BuildDataOutlineResponse(BaseModel):
    section_title: str = Field(..., description="Title of the section")
    
# Subsection Outline Generation Schemas
class ContextChain(BaseModel):
    subsection_context: str = Field(..., description="Context of the subsection")
    methodology_alignment: str = Field(..., description="How subsection aligns with methodology")
    thesis_connection: str = Field(..., description="Connection to thesis")
    section_title: str = Field(..., description="Parent section title")
    subsection_title: str = Field(..., description="Subsection title")
    position: str = Field(..., description="Position in outline (e.g., I.A.)")

class LiteratureResponse(BaseModel):
    content: str = Field(..., description="Response content")
    question: Optional[str] = Field(None, description="Original question")
    citations: List[Dict[str, Any]] = Field(default_factory=list, description="Associated citations")
    type: str = Field(..., description="Type of response")

class OutlineRequirements(BaseModel):
    levels: int = Field(6, description="Number of outline levels")
    format: str = Field("academic", description="Outline format")
    starting_level: int = Field(3, description="Starting level number")
    max_points_per_level: int = Field(4, description="Maximum points per level")

class SubsectionOutlineRequest(BaseModel):
    context_chain: ContextChain = Field(..., description="Context chain for subsection")
    literature_responses: List[LiteratureResponse] = Field(..., description="Literature review responses")
    thesis: str = Field(..., description="Main thesis statement")
    methodology: str = Field(..., description="Research methodology")
    paper_type: str = Field(..., description="Type of academic paper")
    outline_requirements: OutlineRequirements = Field(..., description="Outline generation requirements")

class OutlineLevel6(BaseModel):
    level: str = Field(..., description="Level identifier (1), (2), (3)")
    content: str = Field(..., description="Content text")
    citations: List[str] = Field(default_factory=list, description="Citation references")

class OutlineLevel5(BaseModel):
    level: str = Field(..., description="Level identifier i), ii), iii)")
    content: str = Field(..., description="Content text")
    citations: List[str] = Field(default_factory=list, description="Citation references")
    level6Points: List[OutlineLevel6] = Field(default_factory=list, description="Level 6 sub-points")

class OutlineLevel4(BaseModel):
    level: str = Field(..., description="Level identifier a), b), c)")
    content: str = Field(..., description="Content text")
    citations: List[str] = Field(default_factory=list, description="Citation references")
    deeperPoints: List[OutlineLevel5] = Field(default_factory=list, description="Level 5 sub-points")

class OutlineLevel3(BaseModel):
    level: str = Field(..., description="Level identifier 1., 2., 3.")
    content: str = Field(..., description="Content text")
    citations: List[str] = Field(default_factory=list, description="Citation references")
    reference: str = Field(..., description="Reference information")
    subPoints: List[OutlineLevel4] = Field(default_factory=list, description="Level 4 sub-points")

class SubsectionOutlineResponse(BaseModel):
    detailed_outline: List[OutlineLevel3] = Field(..., description="6-level detailed outline")
    context_analysis: str = Field(..., description="Analysis of context chain")
    literature_integration: str = Field(..., description="How literature was integrated")
    outline_rationale: str = Field(..., description="Rationale for outline structure")
    section_overview: str = Field(..., description="Overview of what this section will cover")
    subsection_outlines: List[SubsectionOutline] = Field(..., description="Detailed outlines for each subsection")
    logical_flow: str = Field(..., description="Description of the logical flow")
    integration_notes: str = Field(..., description="How this integrates with Draft Outline 1 and other sections")
    methodology_alignment: str = Field(..., description="How this section aligns with the research methodology")