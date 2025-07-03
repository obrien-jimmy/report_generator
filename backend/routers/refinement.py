from fastapi import APIRouter, HTTPException
from schemas.thesis import ThesisInteraction, AutoRefineRequest, AutoRefineResponse
from services.bedrock_service import invoke_bedrock
import re

router = APIRouter()

@router.post("/refine_thesis")
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

@router.post("/auto_refine_thesis", response_model=AutoRefineResponse)
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