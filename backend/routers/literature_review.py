from fastapi import APIRouter, HTTPException
from schemas.literature_review import (
    CitationResponseRequest,
    FusedResponseRequest,
    LLMResponse
)
from services.bedrock_service import invoke_bedrock

router = APIRouter()

# --- Routers only, no Pydantic models here ---

@router.post("/generate_citation_response", response_model=LLMResponse)
async def generate_citation_response(request: CitationResponseRequest):
    reference_number = request.reference_id or str(request.citation_number)
    prompt = f"""
You are an expert on the works of {request.citation.author or "the cited author"}.
Your task is to answer the following research question using ONLY the cited work, quoting exactly and providing a detailed, multi-tiered outline starting at level 3 with the following numbering format:

OUTLINE NUMBERING FORMAT (starting at level 3):
1. (Level 3: Numbers with periods)
  a. (Level 4: Lowercase letters with periods)
    i. (Level 5: Lowercase Roman numerals with periods)
      1) (Level 6: Numbers with parentheses)
        a) (Level 7: Lowercase letters with parentheses)
          i) (Level 8: Lowercase Roman numerals with parentheses)

REFERENCE CITATION FORMAT:
- This citation has been assigned reference number: [{reference_number}]
- When referencing this citation in your outline, use: [{reference_number}]
- Example: "Direct quote from the source" [{reference_number}]

STRICT INSTRUCTIONS:
- Use only direct quotes from the cited text. Do NOT paraphrase or summarize.
- Every outline point must include an exact quote and reference the citation as [{reference_number}].
- Do not include any information not found in the cited work.
- Make the outline as detailed as possible, using all relevant material from the citation.
- Do not add commentary, explanation, or any content not present in the cited work.
- Follow the exact numbering format specified above, starting with "1." for your first main point.
- Always use [{reference_number}] for citation references, not the full citation text.

Thesis: {request.thesis}
Methodology: {request.methodology}
Section Context: {request.section_context}
Subsection Context: {request.subsection_context}

Question: {request.question}

Citation: {request.citation.apa or request.citation.title or request.citation.source}
Reference Number: [{reference_number}]

Begin your outline below:
"""
    try:
        response = invoke_bedrock(prompt)
        return LLMResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating citation response: {str(e)}")

@router.post("/generate_fused_response", response_model=LLMResponse)
async def generate_fused_response(request: FusedResponseRequest):
    # Build citation references mapping
    citation_refs = {}
    for ref in (request.citation_references or []):
        citation_refs[ref.reference_id] = ref.citation
    
    # Build citations list with reference numbers
    citations_list = "\n".join([
        f"[{ref.reference_id}]: {ref.citation.apa or ref.citation.title or ref.citation.source}" 
        for ref in (request.citation_references or [])
    ])
    
    # Build outlines list with reference numbers
    outlines_list = "\n\n".join([
        f"Citation [{(request.citation_references or [])[i].reference_id if i < len(request.citation_references or []) else str(i+1)}]:\n{resp}" 
        for i, resp in enumerate(request.citation_responses)
    ])
    
    prompt = f"""
You are an expert academic analyst.

Given the following detailed outlines (one per citation) answering the question, create a master outline that:
- Combines the arguments of each citation
- Groups supporting factors
- Calls out contradictions between citations
- Presents the result in a detailed, multi-tiered outline starting at level 3 with the following numbering format:

OUTLINE NUMBERING FORMAT (starting at level 3):
1. (Level 3: Numbers with periods)
  a. (Level 4: Lowercase letters with periods)
    i. (Level 5: Lowercase Roman numerals with periods)
      1) (Level 6: Numbers with parentheses)
        a) (Level 7: Lowercase letters with parentheses)
          i) (Level 8: Lowercase Roman numerals with parentheses)

REFERENCE CITATION FORMAT:
- Use the reference numbers provided (e.g., [1], [2], [3], etc.)
- Example: "Direct quote from the source" [1]
- When multiple citations support a point: [1, 2]

STRICT INSTRUCTIONS:
- Use only the information and quotes provided in the citation outlines below.
- Do NOT paraphrase or invent new content.
- Clearly indicate which citation each point comes from using the reference number format [X].
- For each group or contradiction, specify which reference numbers are involved.
- The final outline must be as detailed as possible, preserving the original quotes and attributions.
- Follow the exact numbering format specified above, starting with "1." for your first main point.
- Always use the reference number format [X] for citations, not the citation numbers.

Thesis: {request.thesis}
Methodology: {request.methodology}
Section Context: {request.section_context}
Subsection Context: {request.subsection_context}

Question: {request.question}

Citations with Reference Numbers:
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