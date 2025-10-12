from fastapi import APIRouter, HTTPException
from schemas.citations import CitationValidityRequest, CitationValidityResponse
from services.bedrock_service import invoke_bedrock
import json
import re

router = APIRouter()

@router.post("/check_citation_validity", response_model=CitationValidityResponse)
async def check_citation_validity(request: CitationValidityRequest):
    """
    Check if a citation is valid and supports the given context.
    Returns status: 'valid', 'partial', 'invalid', or 'error'
    """
    try:
        # Extract methodology information
        methodology_description = ""
        if isinstance(request.context.methodology, dict):
            methodology_description = request.context.methodology.get('description', str(request.context.methodology))
        else:
            methodology_description = str(request.context.methodology)

        prompt = f"""
You are an expert academic librarian and research validator. Your task is to analyze a citation and determine if it's valid and appropriately supports the given research context.

CITATION TO VALIDATE:
APA: "{request.citation.apa}"
Title: "{request.citation.title or 'Not provided'}"
Author: "{request.citation.author or 'Not provided'}"
Description: "{request.citation.description or 'Not provided'}"

RESEARCH CONTEXT:
Thesis: "{request.context.thesis}"
Section: "{request.context.section_title}"
Subsection: "{request.context.subsection_title}"
Research Question: "{request.context.question}"
Methodology: {methodology_description}

VALIDATION CRITERIA:
1. Citation Format: Is the APA citation properly formatted?
2. Source Credibility: Does this appear to be a credible academic/professional source?
3. Relevance: Does the source logically support the research question and thesis?
4. Accessibility: Can this source realistically be accessed (not fake, realistic publication)?

INSTRUCTIONS:
- Analyze the citation against the four criteria above
- Determine validity status:
  * "valid": Citation is properly formatted, credible, relevant, and accessible
  * "partial": Citation has minor issues but is generally acceptable (e.g., formatting issues, tangential relevance)
  * "invalid": Citation has major problems (fake source, completely irrelevant, or severely malformed)
  * "error": Unable to properly assess the citation

- If the source appears to be real and accessible, try to provide a realistic web link where it might be found (academic databases, publisher websites, etc.). If unsure, do not provide a link.

Respond in valid JSON format:
{{
    "status": "valid|partial|invalid|error",
    "explanation": "Clear explanation of your assessment addressing format, credibility, relevance, and accessibility",
    "link": "https://example.com/link-to-source or null if no reliable link can be determined"
}}

Return only the JSON response.
        """

        response = invoke_bedrock(prompt)
        
        # Parse JSON response
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_text = json_match.group()
                result = json.loads(json_text)
                
                return CitationValidityResponse(
                    status=result.get('status', 'error'),
                    explanation=result.get('explanation', 'Unable to validate citation'),
                    link=result.get('link') if result.get('link') != 'null' else None
                )
            else:
                return CitationValidityResponse(
                    status='error',
                    explanation='Unable to parse validation response',
                    link=None
                )
                
        except json.JSONDecodeError as parse_error:
            print(f"JSON parse error: {parse_error}")
            return CitationValidityResponse(
                status='error',
                explanation='Error parsing citation validation response',
                link=None
            )
            
    except Exception as e:
        print(f"Citation validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error validating citation: {str(e)}")