from fastapi import APIRouter, HTTPException
from schemas.outlinedraft import (
    Citation,
    CitationResponseRequest,
    FusedResponseRequest,
    LLMResponse
)
from services.bedrock_service import invoke_bedrock

router = APIRouter()

# --- Routers only, no Pydantic models here ---

@router.post("/generate_citation_response", response_model=LLMResponse)
async def generate_citation_response(request: CitationResponseRequest):
    prompt = f"""
You are an expert on the works of {request.citation.author or "the cited author"}.
Your task is to answer the following research question using ONLY the cited work, quoting exactly and providing a detailed, multi-tiered outline (I, 1, A, a, bullets) with slight indentations for each hierarchy.

STRICT INSTRUCTIONS:
- Use only direct quotes from the cited text. Do NOT paraphrase or summarize.
- Every outline point must include an exact quote and reference the citation as [{request.citation.apa or request.citation.title or request.citation.source}].
- Do not include any information not found in the cited work.
- Make the outline as detailed as possible, using all relevant material from the citation.
- Do not add commentary, explanation, or any content not present in the cited work.

Thesis: {request.thesis}
Methodology: {request.methodology}
Section Context: {request.section_context}
Subsection Context: {request.subsection_context}

Question: {request.question}

Citation: {request.citation.apa or request.citation.title or request.citation.source}

Begin your outline below:
"""
    try:
        response = invoke_bedrock(prompt)
        return LLMResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating citation response: {str(e)}")

@router.post("/generate_fused_response", response_model=LLMResponse)
async def generate_fused_response(request: FusedResponseRequest):
    citations_list = "\n".join(
        [f"{i+1}: {c.apa or c.title or c.source}" for i, c in enumerate(request.citations)]
    )
    outlines_list = "\n\n".join(
        [f"Citation {i+1} [{request.question_number}.{i+1}]:\n{resp}" for i, resp in enumerate(request.citation_responses)]
    )
    prompt = f"""
You are an expert academic analyst.

Given the following detailed outlines (one per citation) answering the question, create a master outline that:
- Combines the arguments of each citation
- Groups supporting factors
- Calls out contradictions between citations
- Presents the result in a detailed, multi-tiered outline (I, 1, A, a, bullets)
- Identifies any additional resources the analyst might want to consider

STRICT INSTRUCTIONS:
- Use only the information and quotes provided in the citation outlines below.
- Do NOT paraphrase or invent new content.
- Clearly indicate which citation each point comes from using [citation number] (e.g., [{request.question_number}.1], [{request.question_number}.2], etc.).
- For each group or contradiction, specify which citations are involved.
- The final outline must be as detailed as possible, preserving the original quotes and attributions.

Thesis: {request.thesis}
Methodology: {request.methodology}
Section Context: {request.section_context}
Subsection Context: {request.subsection_context}

Question: {request.question}

Citations:
{citations_list}

Citation Outlines:
{outlines_list}

Master Outline:
"""
    try:
        response = invoke_bedrock(prompt)
        return LLMResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating fused response: {str(e)}")