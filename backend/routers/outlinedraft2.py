from fastapi import APIRouter, HTTPException
from schemas.outlinedraft2 import (
    DataSectionAnalysisRequest,
    DataSectionAnalysisResponse,
    DataSectionBuildRequest,
    DataSectionBuildResponse,
    DataSection,
    DataSubsection,
    Citation
)
from services.bedrock_service import invoke_bedrock
from services.paper_structure_service import PaperStructureService
from pydantic import BaseModel
from typing import List
import json
import re

router = APIRouter()

class SectionCategorization(BaseModel):
    section_title: str
    is_administrative: bool = False

class CategorizeRequest(BaseModel):
    sections: List[SectionCategorization]

class CategorizedSection(BaseModel):
    section_title: str
    category: str

class CategorizeResponse(BaseModel):
    categorized_sections: List[CategorizedSection]

@router.post("/categorize_sections", response_model=CategorizeResponse)
async def categorize_sections(request: CategorizeRequest):
    """
    Categorize sections based on their titles using the paper structure service.
    Returns the category for each section (Admin, Intro, Method, Data, Analysis, Summary).
    """
    try:
        categorized = []
        for section in request.sections:
            if section.is_administrative:
                category = "Admin"
            else:
                category = PaperStructureService.categorize_section(section.section_title)
            
            categorized.append(CategorizedSection(
                section_title=section.section_title,
                category=category
            ))
        
        return CategorizeResponse(categorized_sections=categorized)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error categorizing sections: {str(e)}")

@router.post("/analyze_data_sections", response_model=DataSectionAnalysisResponse)
async def analyze_data_sections(request: DataSectionAnalysisRequest):
    """
    Phase 1: Identify and outline data sections with structure and intent notes.
    Analyzes both Outline Framework and Outline Draft 1 to identify sections containing
    factual data, evidence, or findings that need to be built into academic prose.
    """
    
    try:
        prompt = f"""
## 🧩 **DATA SECTION IDENTIFICATION ANALYSIS**

You are an advanced academic writing assistant. Your task is to identify sections from the provided outlines that represent **DATA, FINDINGS, RESULTS, or EVIDENCE** sections that should be transformed into scholarly prose.

**THESIS:** {request.thesis}

**METHODOLOGY:** {request.methodology}

**PAPER TYPE:** {request.paper_type}

**OUTLINE FRAMEWORK:**
{json.dumps(request.outline_framework, indent=2)}

**OUTLINE DRAFT 1:**
{json.dumps(request.outline_draft1, indent=2)}

**ANALYSIS TASK:**

1. **Identify Data Sections:** Locate every section or subsection that represents factual data, evidence, findings, or results that support the thesis.

2. **Interpret Academic Purpose:** For each identified section, determine:
   - How it contributes to the research methodology
   - What analytical role it plays
   - What questions it answers
   - How it links to higher-level claims

3. **Plan Structure:** For each section, summarize:
   - Intent and scope (key variables, datasets, timeframes, sources)
   - Logical structure for subsections
   - Connection to thesis and methodology

**OUTPUT FORMAT (JSON):**
{{
    "identified_sections": [
        {{
            "section_index": 0,
            "section_title": "Section Name",
            "section_context": "Context from outline",
            "section_category": "Data/Evidence/Results/Findings",
            "academic_purpose": "How this section contributes to methodology and thesis",
            "key_variables": ["variable1", "variable2"],
            "data_scope": "What timeframes, datasets, sources are covered",
            "subsection_structure": [
                {{
                    "subsection_title": "Subsection Name",
                    "analytical_role": "What question this answers",
                    "evidence_type": "Type of data/evidence presented"
                }}
            ],
            "thesis_connection": "How this section supports the central argument"
        }}
    ],
    "section_purposes": [
        "Purpose of section 1",
        "Purpose of section 2"
    ],
    "recommended_build_order": [0, 1, 2],
    "analysis_summary": "Overall summary of identified data sections and their role in the research"
}}

**GUIDELINES:**
- Focus on sections containing factual information, evidence, case studies, data analysis
- Exclude pure methodology, introduction, or conclusion sections
- Identify the logical flow from foundational data to complex analysis
- Consider how sections build upon each other to support the thesis
"""

        response = invoke_bedrock(prompt)
        
        # Parse JSON response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON found in response")
        
        analysis_data = json.loads(json_match.group())
        
        return DataSectionAnalysisResponse(
            identified_sections=analysis_data.get("identified_sections", []),
            section_purposes=analysis_data.get("section_purposes", []),
            recommended_build_order=analysis_data.get("recommended_build_order", []),
            analysis_summary=analysis_data.get("analysis_summary", "")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing data sections: {str(e)}"
        )

@router.post("/build_data_sections", response_model=DataSectionBuildResponse)
async def build_data_sections(request: DataSectionBuildRequest):
    """
    Phase 2: Build specific data sections into academic prose.
    Transforms identified data sections into 1-3 academic paragraphs each,
    maintaining scholarly tone and proper citation integration.
    """
    
    try:
        # Determine which sections to build
        sections_to_build = []
        if request.target_section_indices:
            for idx in request.target_section_indices:
                if idx < len(request.identified_data_sections):
                    sections_to_build.append(request.identified_data_sections[idx])
        else:
            sections_to_build = request.identified_data_sections[:2]  # Build first 2 by default
        
        prompt = f"""
## 🧩 **DATA SECTION BUILDER — ACADEMIC PROSE GENERATION**

You are constructing well-structured, scholarly "Data" sections of a research paper. Transform the provided outline sections into cohesive, factual, and methodologically grounded academic prose.

**THESIS:** {request.thesis}

**METHODOLOGY:** {request.methodology}

**PAPER TYPE:** {request.paper_type}

**SECTIONS TO BUILD:**
{json.dumps(sections_to_build, indent=2)}

**FULL OUTLINE CONTEXT:**
Framework: {json.dumps(request.outline_framework, indent=2)}
Draft 1: {json.dumps(request.outline_draft1, indent=2)}

**BUILD REQUIREMENTS:**

1. **Transform each section** into 1-2 introductory sentences + multiple subsections
2. **Each subsection** becomes 1-3 academic paragraphs (3-6 sentences each)
3. **Maintain scholarly tone:** formal, third person, neutral, precise
4. **Focus on factual description** and analytical linkage to methodology
5. **Integrate citations** seamlessly using [1], [2] format
6. **Include transitions** between subsections and sections

**OUTPUT FORMAT (JSON):**
{{
    "built_sections": [
        {{
            "section_number": "3",
            "section_title": "Section Title",
            "section_purpose": "1-2 sentences introducing the purpose of this section",
            "subsections": [
                {{
                    "subsection_number": "3.1",
                    "subsection_title": "Subsection Title",
                    "academic_content": "1-3 paragraphs of formal academic prose describing factual data, evidence, or findings. Each paragraph should be 3-6 sentences, logically structured, and connected to the thesis. Integrate citations as [1], [2], etc.",
                    "data_sources": ["Key dataset 1", "Evidence type 2"],
                    "citations": [
                        {{
                            "apa": "Author, A. (Year). Title. Journal.",
                            "categories": ["category1"],
                            "description": "Brief description"
                        }}
                    ],
                    "transition_to_next": "Optional linking sentence to next subsection"
                }}
            ],
            "section_summary": "Brief paragraph highlighting continuity with next analytical phase"
        }}
    ],
    "continuity_notes": [
        "Note about flow between sections"
    ],
    "completion_status": "partial",
    "next_recommended_sections": [2, 3]
}}

**STYLE GUIDELINES:**
- **Voice:** Formal academic prose, third person, neutral and precise
- **Focus:** Factual description and analytical linkage to methodology  
- **Avoid:** Repetition, speculation, unsubstantiated opinion
- **Goal:** Clarity, organization, and research alignment
"""

        response = invoke_bedrock(prompt)
        
        # Parse JSON response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON found in response")
        
        build_data = json.loads(json_match.group())
        
        # Convert to proper objects
        built_sections = []
        for section_data in build_data.get("built_sections", []):
            subsections = []
            for sub_data in section_data.get("subsections", []):
                # Convert citations
                citations = []
                for cit_data in sub_data.get("citations", []):
                    citations.append(Citation(
                        apa=cit_data.get("apa", ""),
                        categories=cit_data.get("categories", []),
                        description=cit_data.get("description", "")
                    ))
                
                # Handle academic_content - could be string or list
                academic_content = sub_data.get("academic_content", "")
                if isinstance(academic_content, list):
                    academic_content = "\n\n".join(academic_content)
                elif not isinstance(academic_content, str):
                    academic_content = str(academic_content)

                subsection = DataSubsection(
                    subsection_number=sub_data.get("subsection_number", ""),
                    subsection_title=sub_data.get("subsection_title", ""),
                    academic_content=academic_content,
                    data_sources=sub_data.get("data_sources", []),
                    citations=citations,
                    transition_to_next=sub_data.get("transition_to_next", "")
                )
                subsections.append(subsection)
            
            section = DataSection(
                section_number=section_data.get("section_number", ""),
                section_title=section_data.get("section_title", ""),
                section_purpose=section_data.get("section_purpose", ""),
                subsections=subsections,
                section_summary=section_data.get("section_summary", "")
            )
            built_sections.append(section)
        
        return DataSectionBuildResponse(
            built_sections=built_sections,
            continuity_notes=build_data.get("continuity_notes", []),
            completion_status=build_data.get("completion_status", "partial"),
            next_recommended_sections=build_data.get("next_recommended_sections", [])
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error building data sections: {str(e)}"
        )