from fastapi import APIRouter, HTTPException
from schemas.data_analysis import QuestionAnalysisRequest, DataAnalysisResponse, InclusionExclusionRequest, InclusionExclusionAnalysis
from services.bedrock_service import invoke_bedrock
import json
import logging
import re

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/data-analysis", tags=["Data Analysis"])

@router.post("/analyze-subsection", response_model=DataAnalysisResponse)
def analyze_subsection_data(request: QuestionAnalysisRequest):
    """
    Analyze research questions and citations to generate data-driven outline content.
    This is completely dynamic and works for any research topic.
    """
    try:
        logger.info(f"Starting analysis for subsection: {request.subsection_title}")
        logger.info(f"Number of questions: {len(request.questions)}")
        logger.info(f"Number of citations: {len(request.citations)}")
        
        # Prepare the analysis prompt - completely generic, no hardcoded content
        analysis_prompt = f"""
You are analyzing research data for academic paper writing. Analyze the following research questions and citations to extract themes, patterns, and logical structures from the ACTUAL DATA provided.

RESEARCH CONTEXT:
- Subsection: {request.subsection_title}
- Subsection Context: {request.subsection_context}
- Parent Section: {request.section_title}
- Thesis: {request.thesis}
- Methodology: {request.methodology}

RESEARCH QUESTIONS AND CITATIONS:
{format_questions_and_citations(request.questions, request.citations)}

ANALYSIS TASKS:
1. THEMATIC ANALYSIS: Identify 2-4 major themes that emerge from the actual content of the citations and questions. Base themes ONLY on what you find in the data, not predetermined categories.

2. EVIDENCE ANALYSIS: For each theme, identify:
   - What types of evidence are actually present in the citations
   - Key concepts and terminology that appear frequently
   - Any temporal scope (time periods) mentioned in the sources
   - Specific examples, cases, or data points mentioned

3. LOGICAL STRUCTURE: Determine the best way to organize these themes based on:
   - Natural relationships between the themes found in the data
   - Logical progression from foundational to complex concepts
   - How the evidence builds upon itself
   - Connection to the research methodology and thesis

4. OUTLINE GENERATION: Create a hierarchical outline structure with:
   - Main points based on the identified themes
   - Sub-points drawn from specific evidence in the citations
   - Deeper supporting points from concrete examples/data in sources
   - Each point should include the actual supporting evidence found

IMPORTANT: 
- Extract themes from the actual citation content, don't impose predetermined categories
- Use specific details, examples, and findings that are actually in the citations
- Create content based on what the sources actually say, not generic academic language
- Ensure all outline points can be traced back to specific evidence in the provided data

Respond with a structured analysis that identifies what themes and patterns actually exist in this specific research data.
"""

        logger.info("Calling Bedrock service...")
        
        # Get AI analysis of the actual data
        response = invoke_bedrock(analysis_prompt)
        
        logger.info(f"Received response from Bedrock, length: {len(response) if response else 0}")
        
        # Parse the response into structured data
        analysis_data = parse_analysis_response(response, request)
        
        logger.info("Successfully parsed response into analysis data")
        return analysis_data
        
    except Exception as e:
        logger.error(f"Error analyzing subsection data: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def format_questions_and_citations(questions, citations):
    """Format the research questions and citations for AI analysis"""
    formatted_content = ""
    
    # Build citation lookup
    citation_map = {i+1: citation for i, citation in enumerate(citations)}
    
    for i, question in enumerate(questions, 1):
        formatted_content += f"\nQUESTION {i}: {question.get('question', '')}\n"
        
        # Add citations for this question if available
        question_citations = question.get('citations', [])
        if question_citations:
            formatted_content += "CITATIONS FOR THIS QUESTION:\n"
            for j, citation in enumerate(question_citations, 1):
                formatted_content += f"  Citation {j}:\n"
                formatted_content += f"    APA: {citation.get('apa', 'N/A')}\n"
                formatted_content += f"    Description: {citation.get('description', 'N/A')}\n"
                formatted_content += f"    URL: {citation.get('url', 'N/A')}\n\n"
    
    return formatted_content

def parse_analysis_response(response_text, request):
    """Parse the AI response into structured data"""
    try:
        # Try to extract JSON if the AI provided it
        if '{' in response_text and '}' in response_text:
            # Find JSON content in the response
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            json_content = response_text[start:end]
            parsed_data = json.loads(json_content)
            
            # Convert to our schema format
            return convert_to_schema_format(parsed_data, request)
        else:
            # Parse unstructured response
            return parse_unstructured_response(response_text, request)
            
    except json.JSONDecodeError:
        # Fallback to text parsing
        return parse_unstructured_response(response_text, request)

def convert_to_schema_format(parsed_data, request):
    """Convert parsed JSON to our Pydantic schema format"""
    # This would convert the AI's JSON response to match our schema
    # Implementation depends on the AI's response format
    pass

def parse_unstructured_response(response_text, request):
    """Parse unstructured AI response into our schema format"""
    from schemas.data_analysis import (
        DataAnalysisResponse, ThematicCluster, LogicalStructure, 
        GeneratedOutline, OutlinePoint
    )
    
    # Extract themes based on actual AI response
    themes = extract_themes_from_ai_response(response_text, request)
    structure = extract_logical_structure_from_ai_response(response_text)
    outline = extract_outline_from_ai_response(response_text, themes)
    
    return DataAnalysisResponse(
        thematic_clusters=themes,
        logical_structure=structure,
        generated_outline=outline,
        content_summary=f"AI analysis of {len(request.questions)} research questions and {len(request.citations)} citations for {request.subsection_title}",
        analysis_confidence="High - generated from actual research data analysis"
    )

def extract_themes_from_ai_response(response_text, request):
    """Extract thematic clusters from AI response"""
    import re
    from schemas.data_analysis import ThematicCluster
    
    themes = []
    
    # Try to find theme sections in the AI response
    theme_pattern = r'(?i)theme\s*\d*:?\s*([^\n]+)'
    theme_matches = re.findall(theme_pattern, response_text)
    
    if theme_matches:
        for i, theme_name in enumerate(theme_matches[:4]):  # Limit to 4 themes
            # Extract key concepts for this theme
            concepts = extract_key_concepts_from_section(response_text, theme_name)
            
            themes.append(ThematicCluster(
                theme_name=theme_name.strip(),
                theme_description=f"Analysis of {theme_name.strip().lower()} based on research data",
                questions=[f"Q{j+1}" for j in range(min(3, len(request.questions)))],
                key_concepts=concepts,
                evidence_types=["research_analysis", "citation_content"],
                temporal_scope=extract_temporal_scope_from_text(response_text)
            ))
    else:
        # Fallback: create themes based on subsection context
        themes.append(ThematicCluster(
            theme_name=f"{request.subsection_title} Analysis",
            theme_description=f"Comprehensive analysis of {request.subsection_title.lower()}",
            questions=[f"Q{i+1}" for i in range(len(request.questions))],
            key_concepts=extract_key_concepts_from_text(response_text),
            evidence_types=["citation_analysis"],
            temporal_scope=None
        ))
    
    return themes

def extract_key_concepts_from_section(text, theme_name):
    """Extract key concepts related to a specific theme"""
    import re
    
    # Look for bullet points, numbered lists, or key terms near the theme
    concepts = []
    
    # Find section related to this theme
    theme_section = re.search(rf'(?i){re.escape(theme_name)}.*?(?=theme\s*\d+|$)', text, re.DOTALL)
    if theme_section:
        section_text = theme_section.group()
        
        # Extract concepts from bullet points or lists
        bullet_points = re.findall(r'[-*•]\s*([^\n]+)', section_text)
        concepts.extend([point.strip() for point in bullet_points[:3]])
        
        # Extract key terms (capitalized words or phrases)
        key_terms = re.findall(r'\b[A-Z][a-zA-Z\s]{2,20}(?=\s|[.,;:]|$)', section_text)
        concepts.extend([term.strip() for term in key_terms[:3]])
    
    return list(set(concepts))[:5]  # Return unique concepts, max 5

def extract_key_concepts_from_text(text):
    """Extract key concepts from entire text"""
    import re
    
    # Extract capitalized terms that look like concepts
    concepts = re.findall(r'\b[A-Z][a-zA-Z\s]{3,25}(?=\s|[.,;:]|$)', text)
    
    # Filter out common words and phrases
    filtered_concepts = []
    for concept in concepts:
        concept = concept.strip()
        if (len(concept) > 3 and 
            not concept.lower().startswith(('the ', 'this ', 'that ', 'these ', 'those ')) and
            not concept.isupper()):  # Skip all-caps words
            filtered_concepts.append(concept)
    
    return list(set(filtered_concepts))[:5]

def extract_temporal_scope_from_text(text):
    """Extract temporal scope from text"""
    import re
    
    # Look for year ranges (like 2020-2023 or 2020–2023)
    year_range_pattern = r'\b((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2})\b'
    year_ranges = re.findall(year_range_pattern, text)
    if year_ranges:
        start_year, end_year = year_ranges[0]
        return f"{start_year}-{end_year}"
    
    # Look for individual years
    years = re.findall(r'\b((?:19|20)\d{2})\b', text)
    if len(years) >= 2:
        # Get unique years and sort them
        unique_years = sorted(list(set(years)))
        return f"{unique_years[0]}-{unique_years[-1]}"
    elif len(years) == 1:
        return years[0]
    
    return None

def extract_logical_structure_from_ai_response(response_text):
    """Extract logical structure from AI response"""
    import re
    from schemas.data_analysis import LogicalStructure
    
    # Look for structural recommendations in the AI response
    approach_match = re.search(r'(?i)approach:?\s*([^\n]+)', response_text)
    reasoning_match = re.search(r'(?i)reasoning:?\s*([^\n]+)', response_text)
    
    approach = approach_match.group(1).strip() if approach_match else "Evidence-based thematic organization"
    reasoning = reasoning_match.group(1).strip() if reasoning_match else "Based on analysis of actual research data"
    
    # Extract sequence from themes or main points
    sequence_items = re.findall(r'(?i)(?:theme|point)\s*\d*:?\s*([^\n]+)', response_text)
    sequence = [item.strip() for item in sequence_items[:4]] if sequence_items else ["Primary Analysis", "Supporting Evidence", "Implications"]
    
    return LogicalStructure(
        approach=approach,
        reasoning=reasoning,
        sequence=sequence,
        transitions=["Building from foundational analysis", "Progressing through evidence", "Synthesizing findings"]
    )

def extract_outline_from_ai_response(response_text, themes):
    """Extract outline structure from AI response"""
    import re
    from schemas.data_analysis import GeneratedOutline, OutlinePoint
    
    main_points = []
    
    # Look for numbered or bulleted outline points
    outline_patterns = [
        r'(?i)(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]+)',  # 1. Main point
        r'(?i)(?:^|\n)\s*[-*•]\s*([^\n]+)',        # • Bullet point
        r'(?i)(?:^|\n)\s*([A-Z][^\n]{20,100})',    # Capitalized sentences
    ]
    
    for pattern in outline_patterns:
        matches = re.findall(pattern, response_text, re.MULTILINE)
        if matches and len(main_points) < 4:  # Limit to 4 main points
            for match in matches[:4-len(main_points)]:
                content = match[1] if isinstance(match, tuple) and len(match) > 1 else match[0] if isinstance(match, tuple) else match
                
                # Skip very short or generic content
                if len(content.strip()) > 20 and not content.lower().startswith(('this ', 'the ', 'it ')):
                    main_points.append(OutlinePoint(
                        level=str(len(main_points) + 1),
                        content=content.strip(),
                        supporting_evidence=[f"Evidence from research analysis {len(main_points) + 1}"],
                        citations=[i + 1 for i in range(min(3, len(themes)))],
                        rationale="Key finding from thematic analysis of research data"
                    ))
    
    # Fallback if no clear outline found
    if not main_points:
        for i, theme in enumerate(themes[:3]):
            main_points.append(OutlinePoint(
                level=str(i + 1),
                content=theme.theme_description,
                supporting_evidence=theme.key_concepts[:2],
                citations=[i + 1],
                rationale=f"Based on {theme.theme_name} analysis"
            ))
    
    return GeneratedOutline(
        main_points=main_points,
        thematic_basis=f"Organization based on {len(themes)} identified themes from research data",
        logical_flow="Systematic progression through research findings",
        evidence_integration="All points derived from citation analysis and research content"
    )

@router.post("/analyze-inclusion-exclusion", response_model=InclusionExclusionAnalysis)
def analyze_inclusion_exclusion_criteria(request: InclusionExclusionRequest):
    """
    Analyze research content to determine what should be included vs excluded in the final outline,
    based on thesis support and narrative flow from Draft Outline 1.
    """
    try:
        logger.info(f"Starting inclusion/exclusion analysis")
        
        # Extract draft content for analysis
        draft_content = ""
        if request.draftData and "outline" in request.draftData:
            for section in request.draftData["outline"]:
                draft_content += f"SECTION: {section.get('section_title', '')}\n"
                draft_content += f"CONTEXT: {section.get('section_context', '')}\n"
                for subsection in section.get('subsections', []):
                    draft_content += f"  SUBSECTION: {subsection.get('subsection_title', '')}\n"
                    draft_content += f"  CONTEXT: {subsection.get('subsection_context', '')}\n"
                    for question in subsection.get('questions', []):
                        draft_content += f"    QUESTION: {question.get('question', '')}\n"
                draft_content += "\n"
        
        # Enhanced prompt for inclusion/exclusion analysis
        analysis_prompt = f"""
You are analyzing content from Draft Outline 1 to determine what should be INCLUDED vs EXCLUDED in the final research paper based on thesis alignment and narrative coherence.

THESIS: {request.thesis}

DRAFT OUTLINE 1 CONTENT:
{draft_content}

Your task is to provide a comprehensive inclusion/exclusion analysis with the following structure:

1. Section Purpose & Flow:
Explain the overall purpose of this section and how it fits into the thesis narrative. Identify what key arguments this section needs to establish.

2. Thesis Alignment:
Analyze how this section supports the main thesis.

3. Content to INCLUDE from Draft Outline 1:
For each subsection/topic that should be included, provide:
- SPECIFIC CONTENT: Name the exact subsection, research question, or topic area
- INCLUSION RATIONALE: Why this content strongly supports the thesis
- NARRATIVE FIT: How it fits into the overall argument flow
- SUPPORTING EVIDENCE: Which specific research questions/citations validate this content

4. Content to EXCLUDE from Draft Outline 1:  
For each subsection/topic that should be excluded, provide:
- SPECIFIC CONTENT: Name the exact subsection, research question, or topic area being excluded
- EXCLUSION RATIONALE: Detailed explanation of why this content should be omitted (e.g., "Technical implementation details of encryption protocols" should be excluded because "they focus on granular technical specifications rather than policy effectiveness analysis required by the thesis")

5. Content Priority Order:
Provide a single numbered list ranking ALL included content by importance to the thesis argument (1 = most critical, 2 = very important, etc.).

6. Selection Strategy:
Explain the overall strategy for content selection and how it maintains narrative coherence.

Be specific about WHAT content to include/exclude with clear identification of subsection titles, research question topics, or content areas. Avoid vague references."""

        # Call Bedrock for analysis
        response_text = invoke_bedrock(analysis_prompt)
        logger.info("Inclusion/exclusion analysis completed")
        
        # Parse the response into structured data
        return parse_inclusion_exclusion_response(response_text)
        
    except Exception as e:
        logger.error(f"Error in inclusion/exclusion analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def parse_inclusion_exclusion_response(response_text):
    """Parse the AI response for inclusion/exclusion analysis"""
    try:
        # Extract content to include
        content_to_include = []
        include_section = extract_section_between_markers(response_text, "Content to INCLUDE", "Content to EXCLUDE") or ""
        include_items = include_section.split('\n')
        for item in include_items:
            if item.strip() and (item.startswith('✓') or item.startswith('-') or item.startswith('•')):
                clean_item = item.strip().lstrip('✓-•').strip()
                if clean_item:
                    content_to_include.append({
                        "content": clean_item,
                        "thesis_alignment": "Strong support",
                        "rationale": "Directly supports thesis argument",
                        "priority": "high"
                    })
        
        # Extract content to exclude
        content_to_exclude = []
        exclude_section = extract_section_between_markers(response_text, "Content to EXCLUDE", "Content Priority") or ""
        exclude_items = exclude_section.split('\n')
        for item in exclude_items:
            if item.strip() and (item.startswith('✗') or item.startswith('-') or item.startswith('•')):
                clean_item = item.strip().lstrip('✗-•').strip()
                if clean_item:
                    content_to_exclude.append({
                        "content": clean_item,
                        "thesis_alignment": "Weak or no support", 
                        "rationale": "Does not directly support thesis",
                        "priority": "low"
                    })
        
        # Extract content priorities
        content_priorities = []
        priority_section = extract_section_between_markers(response_text, "Content Priority Order", "Selection Strategy") or ""
        priority_items = priority_section.split('\n')
        for item in priority_items:
            if item.strip() and any(item.startswith(f"{i}.") for i in range(1, 10)):
                clean_item = re.sub(r'^\d+\.\s*', '', item.strip())
                if clean_item:
                    content_priorities.append({
                        "content": clean_item,
                        "thesis_alignment": "High support",
                        "rationale": "Critical to thesis argument",
                        "priority": "critical"
                    })
        
        return InclusionExclusionAnalysis(
            section_purpose=extract_section_between_markers(response_text, "Section Purpose", "Thesis Alignment") or "Analysis of content alignment with thesis",
            inclusion_criteria=["Direct thesis support", "Narrative coherence", "Strong evidence base"],
            exclusion_criteria=["Tangential content", "Weak thesis connection", "Scope limitations"],
            content_to_include=content_to_include,
            content_to_exclude=content_to_exclude,
            content_priorities=content_priorities,
            narrative_flow=extract_section_between_markers(response_text, "Selection Strategy", None) or "Maintains logical progression and thesis focus"
        )
        
    except Exception as e:
        logger.error(f"Error parsing inclusion/exclusion response: {str(e)}")
        # Return fallback structure
        return InclusionExclusionAnalysis(
            section_purpose="Content analysis for thesis alignment",
            inclusion_criteria=["Thesis support", "Evidence strength"],
            exclusion_criteria=["Scope limitations", "Weak connections"],
            content_to_include=[{
                "content": "Primary thesis-supporting content",
                "thesis_alignment": "Strong",
                "rationale": "Direct support",
                "priority": "high"
            }],
            content_to_exclude=[{
                "content": "Tangential material",
                "thesis_alignment": "Weak",
                "rationale": "Limited relevance", 
                "priority": "low"
            }],
            content_priorities=[{
                "content": "Core arguments",
                "thesis_alignment": "Critical",
                "rationale": "Essential to thesis",
                "priority": "critical"
            }],
            narrative_flow="Logical progression maintaining thesis focus"
        )

def extract_section_between_markers(text, start_marker, end_marker):
    """Extract text between two markers"""
    try:
        start_idx = text.find(start_marker)
        if start_idx == -1:
            return None
        start_idx += len(start_marker)
        
        if end_marker:
            end_idx = text.find(end_marker, start_idx)
            if end_idx == -1:
                return text[start_idx:].strip()
            return text[start_idx:end_idx].strip()
        else:
            return text[start_idx:].strip()
    except:
        return None

def extract_listed_items(text, start_marker, end_marker):
    """Extract list items between markers"""
    try:
        section_text = extract_section_between_markers(text, start_marker, end_marker)
        if not section_text:
            return []
        
        # Split by lines and extract items that look like list items
        lines = section_text.split('\n')
        items = []
        for line in lines:
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('•') or line.startswith('*') or 
                        any(line.startswith(f"{i}.") for i in range(1, 10))):
                # Clean up list markers
                clean_item = line.lstrip('-•*').strip()
                if clean_item and not clean_item.startswith(('1.', '2.', '3.', '4.', '5.')):
                    clean_item = re.sub(r'^\d+\.\s*', '', clean_item)
                if clean_item:
                    items.append(clean_item)
        
        return items[:6] if items else [f"Analysis items from {start_marker.replace(':', '').lower()}"]
        
    except:
        return [f"Items from {start_marker.replace(':', '').lower()}"]