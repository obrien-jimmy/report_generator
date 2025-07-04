from fastapi import APIRouter, HTTPException
from schemas.thesis import (
    ThesisInteraction, 
    AutoRefineRequest, 
    AutoRefineResponse,
    ProbingQuestionsRequest,
    ProbingQuestionsResponse,
    AnswerProbingQuestionsRequest
)
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

@router.post("/generate_probing_questions", response_model=ProbingQuestionsResponse)
async def generate_probing_questions(request: ProbingQuestionsRequest):
    # Determine if this is a government/military context
    is_gov_military = any(keyword in request.paper_type.lower() for keyword in [
        'position', 'proposal', 'analytical', 'intelligence', 'strategic', 'policy',
        'assessment', 'briefing', 'operational', 'security', 'defense'
    ])
    
    context_examples = ""
    if is_gov_military:
        context_examples = """
Focus on questions that help refine policy implications, strategic considerations, operational impact, or analytical conclusions relevant to government/military contexts.
"""
    
    prompt = f"""
You are an expert academic writing assistant specializing in {request.paper_type}. Generate exactly 5 probing questions to help refine and improve the following thesis statement.

Paper Type: {request.paper_type}
Purpose: {request.paper_purpose}
Required Tone: {request.paper_tone}

Current Thesis: "{request.thesis}"

{context_examples}

Generate questions that help the user:
1. Narrow or broaden the scope appropriately for a {request.paper_type}
2. Clarify their specific argument or position
3. Identify key supporting points or evidence needed
4. Consider counterarguments or alternative perspectives
5. Refine the language and specificity for the {request.paper_tone} tone

Each question should be designed to elicit responses that will help create a stronger, more focused thesis statement appropriate for a {request.paper_type}.

Respond with exactly 5 questions, each on a new line, numbered 1-5:

1. [Question 1]
2. [Question 2]
3. [Question 3]
4. [Question 4]
5. [Question 5]
"""
    try:
        ai_response = invoke_bedrock(prompt)
        # Extract questions from the response
        questions = []
        lines = ai_response.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line and (line.startswith(('1.', '2.', '3.', '4.', '5.')) or line[0].isdigit()):
                # Remove numbering and clean up
                question = re.sub(r'^\d+\.\s*', '', line).strip()
                if question:
                    questions.append(question)
        
        # Ensure we have exactly 5 questions
        if len(questions) < 5:
            # Add generic questions if needed
            generic_questions = [
                "What is the main argument you want to make?",
                "What evidence will you use to support your position?",
                "Who is your intended audience?",
                "What are the potential counterarguments?",
                "What is the broader significance of this topic?"
            ]
            while len(questions) < 5:
                questions.append(generic_questions[len(questions)])
        
        return {"questions": questions[:5]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/answer_probing_questions", response_model=AutoRefineResponse)
async def answer_probing_questions(request: AnswerProbingQuestionsRequest):
    # Filter out empty answers
    answered_questions = []
    for i, answer in enumerate(request.answers):
        if answer.strip():
            answered_questions.append(f"Q: {request.questions[i]}\nA: {answer.strip()}")
    
    if not answered_questions:
        # Return original thesis if no questions were answered
        return {"refined_thesis": request.thesis}
    
    # Determine if this is a government/military context
    is_gov_military = any(keyword in request.paper_type.lower() for keyword in [
        'position', 'proposal', 'analytical', 'intelligence', 'strategic', 'policy',
        'assessment', 'briefing', 'operational', 'security', 'defense'
    ])
    
    context_guidance = ""
    if is_gov_military:
        context_guidance = """
- Frame arguments in terms of policy implications, strategic considerations, or operational impact
- Use terminology appropriate for government/military analytical contexts
- Consider national security, defense policy, or strategic interests where relevant
- Ensure the thesis supports actionable recommendations or clear analytical conclusions
"""
    
    prompt = f"""
You are an expert academic writing assistant specializing in {request.paper_type}. Refine the following thesis statement based on the user's responses to probing questions.

Paper Type: {request.paper_type}
Purpose: {request.paper_purpose}
Required Tone: {request.paper_tone}

Original Thesis: "{request.thesis}"

User's Responses to Probing Questions:
{chr(10).join(answered_questions)}

Instructions:
- Incorporate the user's responses to create a more focused, specific, and arguable thesis
- Ensure the refined thesis aligns with the {request.paper_type} purpose and {request.paper_tone} tone
- Make the thesis clear, concise, and suitable for the intended paper structure
- Maintain the user's intent while improving clarity and specificity{context_guidance}

Respond with ONLY the refined thesis statement enclosed in quotation marks, with NO additional commentary or explanation.

Example Response:
"Refined thesis statement goes here."
"""
    try:
        ai_response = invoke_bedrock(prompt)
        refined_thesis = ai_response.strip().strip('"')
        return {"refined_thesis": refined_thesis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto_refine_thesis", response_model=AutoRefineResponse)
async def auto_refine_thesis(request: AutoRefineRequest):
    # Determine if this is a government/military context based on paper type
    is_gov_military = any(keyword in request.paper_type.lower() for keyword in [
        'position', 'proposal', 'analytical', 'intelligence', 'strategic', 'policy',
        'assessment', 'briefing', 'operational', 'security', 'defense'
    ])
    
    context_guidance = ""
    if is_gov_military:
        context_guidance = """
- Frame arguments in terms of policy implications, strategic considerations, or operational impact
- Use terminology appropriate for government/military analytical contexts
- Consider national security, defense policy, or strategic interests where relevant
- Ensure the thesis supports actionable recommendations or clear analytical conclusions
"""
    
    prompt = f"""
You are an expert academic writing assistant specializing in {request.paper_type}. Your task is to help transform a provided thesis topic or preliminary thesis statement into an ideal thesis statement suitable for a rigorous research paper.

Paper Type: {request.paper_type}
Purpose: {request.paper_purpose}
Required Tone: {request.paper_tone}
Expected Structure: {request.paper_structure}

An ideal thesis statement for a {request.paper_type}:
- Is clear, concise, and focused on the paper's specific purpose
- Presents an arguable claim or position rather than just a factual statement
- Aligns with the {request.paper_tone} tone requirements
- Explicitly outlines the main points or arguments that support the paper's structure
- Provides a scope that is neither too broad nor too narrow for the intended analysis
- Uses precise and scholarly language appropriate for the paper type{context_guidance}

Follow these meticulous steps to refine the provided thesis:

Step 1: Evaluate the Original Thesis
- Identify the central topic and intent in relation to {request.paper_type} requirements
- Assess clarity, conciseness, specificity, and arguability for this paper type
- Identify any vagueness or statements that don't align with the paper's purpose

Step 2: Refine the Topic and Focus
- Ensure the topic aligns with the {request.paper_type} purpose: {request.paper_purpose}
- Narrow down overly broad topics or expand overly narrow ones
- Clearly define the primary argument or position suitable for this paper type

Step 3: Develop a Clear, Arguable Claim
- Transform factual statements into claims that can be supported with evidence
- Ensure the claim matches the required tone: {request.paper_tone}
- Include a perspective that requires evidence-based discussion appropriate for this paper type

Step 4: Outline Main Supporting Points
- Structure the thesis to support the expected paper organization: {request.paper_structure}
- Explicitly state or imply the key arguments the paper will explore
- Provide a roadmap that aligns with the {request.paper_type} format

Step 5: Use Appropriate Language
- Employ language that matches the {request.paper_tone} tone
- Use terminology appropriate for the {request.paper_type} context
- Ensure grammatical correctness and professional readability

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