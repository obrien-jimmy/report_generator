from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from services.bedrock_service import invoke_bedrock
import json
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ThesisInteraction(BaseModel):
    current_topic: str
    user_responses: Optional[List[str]] = Field(default_factory=list)
    history: Optional[List[str]] = Field(default_factory=list)

@app.post("/refine_thesis")
async def refine_thesis(interaction: ThesisInteraction):
    prompt = f"""
    You are a professor skilled in refining thesis statements.  
    Given the original thesis and user responses provided, explicitly provide a SINGLE refined thesis statement enclosed within quotation marks and NO additional commentary or explanations.

    Original Thesis:
    {interaction.current_topic}

    User Responses:
    {"; ".join(interaction.user_responses)}

    Respond explicitly in this format ONLY:
    "Refined thesis goes here."
    """
    try:
        ai_response = invoke_bedrock(prompt)
        match = re.search(r'"([^"]+)"', ai_response)
        refined_thesis = match.group(1).strip() if match else ai_response.strip()
        return {"refined_thesis": refined_thesis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SourceRecommendationRequest(BaseModel):
    final_thesis: str
    paper_length_pages: int

@app.post("/recommend_sources")
async def recommend_sources(request: SourceRecommendationRequest):
    prompt = f"""
    Based on the following thesis and desired paper length ({request.paper_length_pages} pages), explicitly recommend ONLY a numbered list of concise document/source categories suitable for comprehensive research.

    Thesis: {request.final_thesis}

    Return ONLY a numbered list explicitly. No introductory sentences or explanations.
    """
    try:
        recommendations = invoke_bedrock(prompt)
        categories = [cat.strip("- ").strip() for cat in recommendations.split("\n") if cat.strip()]
        return {"recommended_categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PromptRequest(BaseModel):
    prompt: str

@app.post("/ai-response")
async def ai_response(request: PromptRequest):
    try:
        response = invoke_bedrock(request.prompt)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MethodologyRequest(BaseModel):
    final_thesis: str
    source_categories: List[str]

class MethodologyResponse(BaseModel):
    methodology: str

@app.post("/generate_methodology", response_model=MethodologyResponse)
async def generate_methodology(request: MethodologyRequest):
    prompt = f"""
    You are an expert professor creating detailed research methodologies.
    Given the thesis: "{request.final_thesis}" and these explicitly selected source categories: {', '.join(request.source_categories)},
    explicitly articulate a clear and concise research methodology detailing how to effectively analyze each source category to thoroughly address and support the thesis.

    Provide ONLY the methodology explicitly. No additional explanations.
    """
    try:
        methodology_text = invoke_bedrock(prompt).strip()
        return {"methodology": methodology_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class OutlineRequest(BaseModel):
    final_thesis: str
    methodology: str
    paper_length_pages: int
    source_categories: List[str]

class Subsection(BaseModel):
    subsection_title: str
    subsection_context: str

class Section(BaseModel):
    section_title: str
    section_context: str
    subsections: List[Subsection]

class OutlineResponse(BaseModel):
    outline: List[Section]

@app.post("/generate_outline", response_model=OutlineResponse)
async def generate_outline(request: OutlineRequest):
    prompt = f"""
    You are an expert professor creating structured thesis outlines.

    Final Thesis: "{request.final_thesis}"
    Methodology: "{request.methodology}"
    Paper Length: {request.paper_length_pages} pages single-spaced (excluding citations)
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
        raise HTTPException(
            status_code=500,
            detail=f"JSON decode error: {str(e)}. Snippet: {ai_response_cleaned[:500]}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class WorksCitedRequest(BaseModel):
    final_thesis: str
    methodology: str
    section_title: str
    section_context: str
    subsection_title: str
    subsection_context: str
    source_categories: List[str]

class RecommendedSource(BaseModel):
    apa: str
    categories: List[str]
    methodologyPoints: List[str]
    description: str

class WorksCitedResponse(BaseModel):
    recommended_sources: List[RecommendedSource]

@app.post("/generate_works_cited", response_model=WorksCitedResponse)
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
