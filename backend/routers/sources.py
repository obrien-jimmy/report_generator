from fastapi import APIRouter, HTTPException
from schemas.sources import (
    SourceRecommendationRequest, WorksCitedRequest, WorksCitedResponse,
    CitationSearchRequest, QuestionCitationRequest, QuestionCitationResponse
)
from services.bedrock_service import invoke_bedrock
import json
import re

router = APIRouter()

@router.post("/recommend_sources")
async def recommend_sources(request: SourceRecommendationRequest):
    prompt = f"""
    Based on the following thesis, explicitly recommend ONLY a numbered list of concise document/source categories suitable for comprehensive research.

    Thesis: {request.final_thesis}

    Return ONLY a numbered list explicitly. No introductory sentences or explanations.
    """
    try:
        recommendations = invoke_bedrock(prompt)
        categories = [cat.strip("- ").strip() for cat in recommendations.split("\n") if cat.strip()]
        # Filter out empty categories and ensure we have valid data
        categories = [cat for cat in categories if cat and len(cat.strip()) > 0]
        return {"recommended_categories": categories}
    except Exception as e:
        error_msg = str(e)
        print(f"recommend_sources error: {error_msg}")  # Log the actual error
        if "ThrottlingException" in error_msg or "TooManyRequestsException" in error_msg:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait a moment and try again.")
        elif "ValidationException" in error_msg:
            raise HTTPException(status_code=400, detail="Invalid request. Please check your input.")
        else:
            raise HTTPException(status_code=500, detail=f"Service error: {error_msg}")

@router.post("/generate_works_cited", response_model=WorksCitedResponse)
async def generate_works_cited(request: WorksCitedRequest):
    prompt = f"""
    You are an academic researcher skilled in identifying ideal primary and secondary source documents for scholarly papers.

    Thesis: "{request.final_thesis}"

    Research Methodology: "{request.methodology}"

    Section Title: "{request.section_title}"
    Section Context: "{request.section_context}"

    Subsection Title: "{request.subsection_title}"
    Subsection Context: "{request.subsection_context}"

    Source Categories: {', '.join(request.source_categories)}
    Number of Citations Requested: {request.citation_count}

    Explicitly return a JSON array exactly matching the following structure:

    [
    {{
        "apa": "Author, A. A. (Year). Title of work. Publisher.",
        "categories": ["Explicit relevant category name(s) chosen earlier (exact match required)"],
        "methodologyPoints": ["Explicit Methodology Section Title (Section #)"],
        "description": "Explicitly state in one concise sentence how this source specifically supports the subsection context."
    }}
    ]

    Explicitly adhere to the following rules:
    - Each APA citation must follow the format: "Author, A. A. (Year). Title of work. Publisher."
    - Only use categories from the provided Source Categories list, exactly as given.
    - Clearly include the associated methodology point(s) with explicit numbering (e.g., "National Security Assessment (3)").
    - Provide exactly {request.citation_count} citation(s).
    - Provide ONLY valid JSON explicitly, without any additional commentary or explanation.
    """

    try:
        response = invoke_bedrock(prompt)
        response_cleaned = re.sub(r'[\x00-\x1F\x7F]', '', response).strip()

        json_start = response_cleaned.find('[')
        json_end = response_cleaned.rfind(']') + 1
        if json_start == -1 or json_end == -1:
            raise ValueError("No valid JSON array found in response.")

        sources_json = response_cleaned[json_start:json_end]
        recommended_sources = json.loads(sources_json)
        return {"recommended_sources": recommended_sources}
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"JSON decode error: {str(e)}. Snippet: {response_cleaned[:500]}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/identify_citation")
async def identify_citation(request: CitationSearchRequest):
    prompt = f"""
    You are an academic assistant tasked with precisely identifying and formatting scholarly citations.

    Explicitly identify the correct APA citation and related information for the following details:
    Title: "{request.title}"
    Source/Publication: "{request.source}"
    Year: "{request.year}"
    Author: "{request.author}"

    If some details are missing, explicitly find the most relevant scholarly work that closely matches the provided information.

    Explicitly return a JSON object exactly matching this structure and format:

    {{
      "apa": "Author, A. A. (Year). Title of work. Publisher.",
      "categories": ["Relevant categories"],
      "methodologyPoints": ["Relevant methodology points"],
      "description": "One sentence explicitly describing how this source is relevant."
    }}

    Provide ONLY the explicit JSON, no additional explanations.
    """

    try:
        ai_response = invoke_bedrock(prompt)
        ai_response_cleaned = re.sub(r'[\x00-\x1F\x7F]', '', ai_response).strip()

        json_start = ai_response_cleaned.find('{')
        json_end = ai_response_cleaned.rfind('}') + 1
        if json_start == -1 or json_end == -1:
            raise ValueError("No valid JSON found in the response.")

        identified_citation_json = ai_response_cleaned[json_start:json_end]
        identified_citation = json.loads(identified_citation_json)

        return {"citation": identified_citation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_question_citations", response_model=QuestionCitationResponse)
async def generate_question_citations(request: QuestionCitationRequest):
    prompt = f"""
    You are an academic researcher skilled in identifying ideal sources to answer specific research questions.

    Thesis: "{request.final_thesis}"
    Research Methodology: "{request.methodology}"
    Section Title: "{request.section_title}"
    Section Context: "{request.section_context}"
    Subsection Title: "{request.subsection_title}"
    Subsection Context: "{request.subsection_context}"
    Specific Question: "{request.question}"
    Source Categories: {', '.join(request.source_categories)}

    Generate citations that specifically help answer the question "{request.question}" within the context of:
    1. The subsection: {request.subsection_title}
    2. The larger section: {request.section_title}
    3. The overall methodology approach
    4. Supporting the main thesis

    Explicitly return a JSON array exactly matching the following structure:

    [
    {{
        "apa": "Author, A. A. (Year). Title of work. Publisher.",
        "categories": ["Explicit relevant category name(s) from the provided list"],
        "methodologyPoints": ["Explicit Methodology Section Title"],
        "description": "Explicitly state in one concise sentence how this source specifically helps answer the question '{request.question}' within the subsection context."
    }}
    ]

    Rules:
    - Each APA citation must follow standard format
    - Only use categories from the provided Source Categories list
    - Include methodology points that this source addresses
    - Provide exactly {request.citation_count} citation(s)
    - Focus specifically on answering the question within the academic context
    - Provide ONLY valid JSON, no additional commentary
    """

    try:
        response = invoke_bedrock(prompt)
        response_cleaned = re.sub(r'[\x00-\x1F\x7F]', '', response).strip()

        json_start = response_cleaned.find('[')
        json_end = response_cleaned.rfind(']') + 1
        if json_start == -1 or json_end == -1:
            raise ValueError("No valid JSON array found in response.")

        sources_json = response_cleaned[json_start:json_end]
        recommended_sources = json.loads(sources_json)
        return {"recommended_sources": recommended_sources}
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"JSON decode error: {str(e)}. Snippet: {response_cleaned[:500]}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))