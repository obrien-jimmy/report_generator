from fastapi import APIRouter, HTTPException
from schemas.outline import (
    OutlineRequest, OutlineResponse,
    SectionsRequest, SectionsResponse, 
    SubsectionsRequest, SubsectionsResponse,
    QuestionsRequest, QuestionsResponse
)
from schemas.methodology import MethodologyRequest, MethodologyResponse
from schemas.structure import PaperStructureRequest, PaperStructureResponse
from services.bedrock_service import invoke_bedrock
from services.paper_structure_service import PaperStructureService
import json
import re

router = APIRouter()

@router.post("/generate_methodology", response_model=MethodologyResponse)
async def generate_methodology(request: MethodologyRequest):
    prompt = f"""
    You are an expert professor creating detailed research methodologies.
    Given the thesis: "{request.final_thesis}" and these explicitly selected source categories: {', '.join(request.source_categories)},
    explicitly articulate a clear and concise research methodology detailing how to effectively analyze each source category to thoroughly address and support the thesis.

    Provide ONLY the methodology explicitly. Do not start any header, to include "Research Methodology:". Just start listing the methodology considerations.
    """
    try:
        methodology_text = invoke_bedrock(prompt).strip()
        return {"methodology": methodology_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_outline", response_model=OutlineResponse)
async def generate_outline(request: OutlineRequest):
    if request.paper_length_pages == -2:
        paper_length_pages = "the maximum level of detail possible"
    elif request.paper_length_pages == -1:
        paper_length_pages = "a flexible length suitable to the complexity of the thesis"
    else:
        paper_length_pages = f"{request.paper_length_pages} pages"

    prompt = f"""
    You are an expert professor creating structured thesis outlines.

    Final Thesis: "{request.final_thesis}"
    Methodology: "{request.methodology}"
    Paper Length: {paper_length_pages} single-spaced (excluding citations)
    Source Categories: {", ".join(request.source_categories)}

    Explicitly generate a structured JSON outline EXACTLY matching this format:

    {{
        "outline":[{{
            "section_title":"<Explicit Section Title>",
            "section_context":"<Explain clearly how this section relates specifically to the thesis and explicitly identify which methodology section(s) it addresses>",
            "subsections":[{{
                "subsection_title":"<Explicit Subsection Title>",
                "subsection_context":"<Clearly describe how this subsection relates specifically to its parent section, thesis, and explicitly identify which methodology section(s) it addresses>"
            }}]
        }}]
    }}

    Provide ONLY JSON. Do NOT include anything outside this JSON structure.
    """

    try:
        ai_response = invoke_bedrock(prompt)
        ai_response_cleaned = re.sub(r'[\x00-\x1F\x7F]', '', ai_response).strip()
        json_start = ai_response_cleaned.find('{')
        json_end = ai_response_cleaned.rfind('}') + 1

        if json_start == -1 or json_end == -1:
            raise ValueError("No valid JSON found in the response.")

        ai_response_json = ai_response_cleaned[json_start:json_end]
        structured_response = json.loads(ai_response_json)
        return structured_response

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON decode error: {str(e)}. Snippet: {ai_response_cleaned[:500]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_sections", response_model=SectionsResponse)
async def generate_sections(request: SectionsRequest):
    prompt = f"""
    Explicitly provide ONLY high-level sections for an academic outline based on:

    Thesis: "{request.final_thesis}"
    Methodology: "{request.methodology}"
    Paper length: {request.paper_length_pages if request.paper_length_pages > 0 else 'maximum detail'}
    Source Categories: {', '.join(request.source_categories)}

    Provide explicitly in the following JSON format:

    {{
        "sections": [
            {{
                "section_title": "Explicit Section Title",
                "section_context": "Clear explanation relating explicitly to the thesis and methodology"
            }}
        ]
    }}

    Return ONLY valid JSON explicitly, no commentary or explanations.
    """

    try:
        ai_response = invoke_bedrock(prompt)
        ai_response_cleaned = re.sub(r'[\x00-\x1F\x7F]', '', ai_response).strip()
        sections_json = json.loads(ai_response_cleaned)
        return sections_json
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_subsections", response_model=SubsectionsResponse)
async def generate_subsections(request: SubsectionsRequest):
    prompt = f"""
    Explicitly provide subsections (and optionally sub-subsections) for the given section:

    Thesis: "{request.final_thesis}"
    Methodology: "{request.methodology}"
    Section Title: "{request.section_title}"
    Section Context: "{request.section_context}"
    Paper length: {request.paper_length_pages if request.paper_length_pages > 0 else 'maximum detail'}
    Source Categories: {', '.join(request.source_categories)}

    Provide explicitly in the following JSON format:

    {{
        "subsections": [
            {{
                "subsection_title": "Explicit Subsection Title",
                "subsection_context": "Clear explanation relating explicitly to the parent section, thesis, and methodology"
            }}
        ]
    }}

    Return ONLY valid JSON explicitly, no commentary or explanations.
    """

    try:
        ai_response = invoke_bedrock(prompt)
        ai_response_cleaned = re.sub(r'[\x00-\x1F\x7F]', '', ai_response).strip()
        subsections_json = json.loads(ai_response_cleaned)
        return subsections_json
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_questions", response_model=QuestionsResponse)
async def generate_questions(request: QuestionsRequest):
    prompt = f"""
    Given the following details, explicitly generate ONLY a precise, thorough list of critical questions and information requirements needed to fully address the subsection described:

    Thesis: "{request.final_thesis}"
    Methodology: "{request.methodology}"
    Section Title: "{request.section_title}"
    Section Context: "{request.section_context}"
    Subsection Title: "{request.subsection_title}"
    Subsection Context: "{request.subsection_context}"

    Explicitly respond in this JSON structure ONLY:

    {{
        "questions": [
            "Question 1",
            "Question 2"
        ]
    }}

    Provide exactly enough questions to thoroughly address the subsection. No additional explanation.
    """

    try:
        ai_response = invoke_bedrock(prompt)
        cleaned_response = re.sub(r'[\x00-\x1F\x7F]', '', ai_response).strip()

        json_start = cleaned_response.find('{')
        json_end = cleaned_response.rfind('}') + 1

        if json_start == -1 or json_end == -1:
            raise ValueError("LLM response did not return valid JSON.")

        response_json = json.loads(cleaned_response[json_start:json_end])

        if "questions" not in response_json:
            raise ValueError("Expected 'questions' key missing from response JSON.")

        return response_json

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON decode error: {str(e)}. Snippet: {cleaned_response[:200]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@router.post("/paper_structure_preview", response_model=PaperStructureResponse)
async def get_paper_structure_preview(request: PaperStructureRequest):
    """Get enhanced paper structure preview with metadata"""
    try:
        preview = PaperStructureService.get_structure_preview(
            paper_type=request.paper_type,
            methodology_id=request.methodology_id
            # sub_methodology_id=request.sub_methodology_id  # Removed from production, kept for future consideration
        )
        
        return PaperStructureResponse(
            structure=preview["structure"],
            total_sections=preview["total_sections"],
            paper_type=preview["paper_type"],
            methodology=preview["methodology"],
            # sub_methodology=preview["sub_methodology"],  # Removed from production, kept for future consideration
            has_methodology_sections=preview["has_methodology_sections"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating structure preview: {str(e)}")