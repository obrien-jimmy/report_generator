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

    Provide ONLY the methodology explicitly. Do not start any header, to include "Research Methodology:". Just start listing the methodology considerations.
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


class WorksCitedRequest(BaseModel):
    """Request payload for generating a works cited list."""

    final_thesis: str
    methodology: str
    section_title: str
    section_context: str
    subsection_title: str
    subsection_context: str
    source_categories: List[str]
    citation_count: int = Field(
        4, description="Number of citation entries to generate"
    )

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

class CitationSearchRequest(BaseModel):
    title: Optional[str] = ""
    source: Optional[str] = ""
    year: Optional[str] = ""
    author: Optional[str] = ""

class IdentifiedCitation(BaseModel):
    apa: str
    categories: List[str]
    methodologyPoints: List[str]
    description: str

@app.post("/identify_citation")
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

class AutoRefineRequest(BaseModel):
    thesis: str

class AutoRefineResponse(BaseModel):
    refined_thesis: str

@app.post("/auto_refine_thesis", response_model=AutoRefineResponse)
async def auto_refine_thesis(request: AutoRefineRequest):
    prompt = f"""
You are an expert academic writing assistant. Your task is to help transform a provided thesis topic or preliminary thesis statement into an ideal thesis statement suitable for a rigorous research paper.

An ideal thesis statement:
- Is clear, concise, and focused.
- Presents an arguable claim or position rather than just a factual statement.
- Explicitly outlines the main points or arguments that the paper will discuss.
- Provides a scope that is neither too broad nor too narrow for the intended length of the paper.
- Uses precise and scholarly language.

Follow these meticulous steps to refine the provided thesis:

Step-by-Step Instructions:

Step 1: Evaluate the Original Thesis
- Identify the central topic and intent.
- Assess clarity, conciseness, specificity, and arguability.
- Identify any vagueness or overly broad statements.

Step 2: Refine the Topic and Focus
- Narrow down overly broad topics or expand overly narrow ones.
- Ensure the topic is suitably challenging for academic inquiry.
- Clearly define the primary argument or position.

Step 3: Develop a Clear, Arguable Claim
- Transform factual statements into claims that can be supported or refuted.
- Include a perspective or interpretation that requires evidence-based discussion.

Step 4: Outline Main Supporting Points
- Explicitly state or imply the key arguments or analytical categories the paper will explore.
- Provide a roadmap for the reader to understand the logical flow of the paper.

Step 5: Use Scholarly and Precise Language
- Replace vague terms with specific, precise language appropriate for an academic context.
- Ensure grammatical correctness and readability.

Original User Thesis:
"{request.thesis}"

Respond explicitly with ONLY the refined thesis statement enclosed in quotation marks, with NO additional commentary or explanation.

Example Response:
"Refined thesis statement goes here."
"""
    try:
        ai_response = invoke_bedrock(prompt)
        refined_thesis = ai_response.strip().strip('"')
        return {"refined_thesis": refined_thesis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SectionsRequest(BaseModel):
    final_thesis: str
    methodology: str
    paper_length_pages: int
    source_categories: List[str]

class SectionOnly(BaseModel):
    section_title: str
    section_context: str

class SectionsResponse(BaseModel):
    sections: List[SectionOnly]

@app.post("/generate_sections", response_model=SectionsResponse)
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


class SubsectionsRequest(BaseModel):
    final_thesis: str
    methodology: str
    section_title: str
    section_context: str
    paper_length_pages: int
    source_categories: List[str]

class SubsectionsResponse(BaseModel):
    subsections: List[Subsection]

@app.post("/generate_subsections", response_model=SubsectionsResponse)
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

class QuestionsRequest(BaseModel):
    final_thesis: str
    methodology: str
    section_title: str
    section_context: str
    subsection_title: str
    subsection_context: str

class QuestionsResponse(BaseModel):
    questions: List[str]

@app.post("/generate_questions", response_model=QuestionsResponse)
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
