from fastapi import APIRouter, Body
from schemas.finaloutline import FinalOutlineRequest, FinalOutlineTransitionsResponse, FinalOutlineTextResponse, RefineSubsectionRequest
from services.bedrock_service import invoke_bedrock

router = APIRouter(prefix="/api/finaloutline", tags=["finaloutline"])

@router.post("/generate_methodology", response_model=FinalOutlineTextResponse)
async def generate_methodology(data: FinalOutlineRequest = Body(...)):
    # LLM logic here
    return {"text": "Generated methodology paragraph based on outline, thesis, and methodology."}

@router.post("/generate_conclusion", response_model=FinalOutlineTextResponse)
async def generate_conclusion(data: FinalOutlineRequest = Body(...)):
    # LLM logic here
    return {"text": "Generated conclusion paragraph based on outline, thesis, and methodology."}

@router.post("/generate_abstract", response_model=FinalOutlineTextResponse)
async def generate_abstract(data: FinalOutlineRequest = Body(...)):
    # LLM logic here
    return {"text": "Generated abstract paragraph based on outline, thesis, and methodology."}

@router.post("/generate_transitions", response_model=FinalOutlineTransitionsResponse)
async def generate_transitions(data: FinalOutlineRequest = Body(...)):
    # LLM logic here
    return {"transitions": {"I.A": "Transition from I to A...", "A.1": "Transition from A to 1..."}}

@router.post("/refine_outline", response_model=FinalOutlineTextResponse)
async def refine_outline(data: FinalOutlineRequest = Body(...)):
    thesis = data.thesis
    methodology = data.methodology
    outline = data.outline
    responses = data.responses

    refined_sections = []

    for s_idx, section in enumerate(outline):
        section_title = section.get("section_title", f"Section {s_idx+1}")
        subsections = section.get("subsections", [])
        section_refined = f"{roman_numeral(s_idx)}. {section_title}\n"
        for sub_idx, subsection in enumerate(subsections):
            subsection_title = subsection.get("subsection_title", f"Subsection {sub_idx+1}")
            questions = subsection.get("questions", [])
            # Gather responses for this subsection
            sub_responses = []
            for q_idx, _ in enumerate(questions):
                key = f"{s_idx}-{sub_idx}-{q_idx}"
                resp = responses.get(key, "")
                if resp:
                    sub_responses.append(f"{q_idx+1}. {resp}")
            # Build prompt for this subsection
            prompt = f"""
You are an academic writing assistant. Given the following thesis, methodology, section, and subsection (with responses), revise ONLY THIS SUBSECTION as follows:

- The section is level 1 (Roman numeral, e.g., I., II., III.).
- The subsection is level 2 (A., B., C., ...).
- The details within the subsection should start at level 3 (1., 2., 3., ...), and further subpoints should use a., i., 1), a), i) as needed.
- Review the context of the subsection and how it relates to its parent section.
- Ensure the subsection supports the thesis and fits within the methodology.
- Rewrite the subsection, carrying forward all elements that support the argument and flow.
- Keep all pertinent data, including sources.
- Output the refined subsection using up to 7 levels: A., 1., a., i., 1), a), i)
- Each level should be on a new line and properly indented (2 spaces per level).
- Formatting must be clean and uniform.
- Do not repeat the thesis or section at the top; just output the refined subsection.

Thesis:
{thesis}

Methodology:
{methodology}

Section:
{section_title}

Subsection:
{subsection_title}

Responses:
{sub_responses}

Refined Subsection:
"""
            # Call LLM for this subsection
            refined_sub = invoke_bedrock(prompt)
            section_refined += f"  {alpha(sub_idx)}. {subsection_title}\n"
            section_refined += indent_refined_subsection(refined_sub)
        refined_sections.append(section_refined)

    final_outline = "\n".join(refined_sections)
    return {"text": final_outline}


@router.post("/refine_subsection", response_model=FinalOutlineTextResponse)
async def refine_subsection(data: RefineSubsectionRequest):
    print("Received refine_subsection payload:", data)
    prompt = f"""
You are an academic writing assistant. Given the following thesis, methodology, section, and subsection (with responses), revise ONLY THIS SUBSECTION as follows:

- The section is level 1 (Roman numeral, e.g., I., II., III.).
- The subsection is level 2 (A., B., C., ...).
- The details within the subsection should start at level 3 (1., 2., 3., ...), and further subpoints should use a., i., 1), a), i) as needed.
- Review the context of the subsection and how it relates to its parent section.
- Ensure the subsection supports the thesis and fits within the methodology.
- Rewrite the subsection, carrying forward all elements that support the argument and flow.
- Keep all pertinent data, including sources.
- Output the refined subsection using up to 7 levels: A., 1., a., i., 1), a), i)
- Each level should be on a new line and properly indented (2 spaces per level).
- Formatting must be clean and uniform.
- Do not repeat the thesis or section at the top; just output the refined subsection.

Thesis:
{data.thesis}

Methodology:
{data.methodology}

Section:
{data.section_title}

Subsection:
{data.subsection_title}

Responses:
{data.responses}

Refined Subsection:
"""
    refined_sub = invoke_bedrock(prompt)
    return {"text": refined_sub.strip()}


def roman_numeral(n):
    numerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X']
    return numerals[n] if n < len(numerals) else str(n+1)

def alpha(n):
    return chr(65 + n)

def indent_refined_subsection(text):
    # Indent each line by 4 spaces (2 for subsection, 2 for subpoints)
    return "\n".join("    " + line if line.strip() else "" for line in text.strip().splitlines())