from fastapi import APIRouter, HTTPException
from schemas.outlinedraft2 import (
    FusedOutlineRequest,
    FusedOutlineResponse,
    FusedSection,
    FusedSubsection
)
from services.bedrock_service import invoke_bedrock
from services.paper_structure_service import PaperStructureService
import json
import re

router = APIRouter()

@router.post("/generate_fused_outline", response_model=FusedOutlineResponse)
async def generate_fused_outline(request: FusedOutlineRequest):
    """
    Take all 'Data' sections from Outline Draft 1 and create a well-structured,
    fused outline that articulates the facts of the argument per the citations.
    """
    
    try:
        # Build comprehensive context from all data sections
        sections_context = []
        all_citations = []
        
        for section in request.data_sections:
            # Collect all responses and citations from this section
            section_content = {
                "title": section.section_title,
                "context": section.section_context,
                "responses": section.all_responses,
                "citations": [citation.dict() for citation in section.all_citations]
            }
            sections_context.append(section_content)
            all_citations.extend(section.all_citations)
        
        # Create the fusion prompt
        prompt = f"""
You are an expert research analyst tasked with creating a cohesive, well-structured outline for the DATA sections of an academic paper. You have been provided with detailed responses and citations from multiple sections of an initial outline draft.

THESIS: {request.thesis}

METHODOLOGY: {request.methodology}

PAPER TYPE: {request.paper_type}

SECTION DATA FROM OUTLINE DRAFT 1:
{json.dumps(sections_context, indent=2)}

Your task is to:

1. ANALYZE all the responses and citations to identify the key factual arguments and evidence
2. RESTRUCTURE the content into a logical, traditional outline that builds the argument systematically
3. CREATE new section and subsection titles that better organize the evidence
4. FUSE related content from different original sections where it makes logical sense
5. ENSURE each point is backed by specific citations from the provided evidence

REQUIREMENTS:
- Focus on presenting FACTS and EVIDENCE that support the thesis
- Create 3-5 major sections that build the argument logically
- Each section should have 2-4 subsections with specific supporting evidence
- Maintain citation integrity - every claim must reference specific sources
- Organize content to flow from foundational concepts to more complex analysis
- Remove redundancy while preserving important nuances

OUTPUT FORMAT (JSON):
{{
    "sections": [
        {{
            "title": "Section Title",
            "context": "Brief explanation of what this section establishes",
            "subsections": [
                {{
                    "title": "Subsection Title", 
                    "content": "Detailed outline content with key points",
                    "supporting_evidence": ["Key evidence point 1", "Key evidence point 2"],
                    "citations": [relevant citation objects]
                }}
            ],
            "section_summary": "How this section supports the thesis"
        }}
    ],
    "outline_summary": "Overall summary of how this outline supports the thesis",
    "restructuring_notes": ["Note about major restructuring decision 1", "Note 2"]
}}

Focus on creating a compelling, evidence-based argument structure that a reader can follow logically from premise to conclusion.
"""

        # Invoke Bedrock to generate the fused outline
        response = invoke_bedrock(prompt)
        
        # Parse the JSON response
        try:
            # Extract JSON from the response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                outline_data = json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")
            
            # Validate and structure the response
            sections = []
            for section_data in outline_data.get("sections", []):
                subsections = []
                for subsection_data in section_data.get("subsections", []):
                    # Map citations back to original citation objects
                    subsection_citations = []
                    citation_references = subsection_data.get("citations", [])
                    
                    for citation_ref in citation_references:
                        # Find matching citation from original data
                        if isinstance(citation_ref, dict):
                            for orig_citation in all_citations:
                                if (orig_citation.apa == citation_ref.get("apa", "") or 
                                    citation_ref.get("apa", "") in orig_citation.apa):
                                    subsection_citations.append(orig_citation)
                                    break
                    
                    subsection = FusedSubsection(
                        title=subsection_data.get("title", ""),
                        content=subsection_data.get("content", ""),
                        supporting_evidence=subsection_data.get("supporting_evidence", []),
                        citations=subsection_citations
                    )
                    subsections.append(subsection)
                
                section = FusedSection(
                    title=section_data.get("title", ""),
                    context=section_data.get("context", ""),
                    subsections=subsections,
                    section_summary=section_data.get("section_summary", "")
                )
                sections.append(section)
            
            return FusedOutlineResponse(
                sections=sections,
                outline_summary=outline_data.get("outline_summary", ""),
                restructuring_notes=outline_data.get("restructuring_notes", [])
            )
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to parse outline generation response: {str(e)}"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating fused outline: {str(e)}"
        )