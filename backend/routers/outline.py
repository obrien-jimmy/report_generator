from fastapi import APIRouter, HTTPException
from schemas.outline import (
    OutlineGenerationRequest,
    OutlineGenerationResponse,
    SectionGenerationRequest,
    SectionGenerationResponse,
    SubsectionGenerationRequest,
    SubsectionGenerationResponse,
    QuestionGenerationRequest,
    QuestionGenerationResponse,
    CitationGenerationRequest,
    CitationGenerationResponse,
    OutlineSection,
    OutlineSubsection,
    RecommendedSource
)
from schemas.structure import (
    PaperStructureRequest,
    PaperStructureResponse,
    StructuredOutlineRequest,
    StructuredOutlineResponse
)
from services.bedrock_service import invoke_bedrock
from services.paper_structure_service import PaperStructureService
import json
import re
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/generate_outline", response_model=OutlineGenerationResponse)
async def generate_outline(request: OutlineGenerationRequest):
    try:
        response = invoke_bedrock(request.prompt)
        
        # Parse response to extract outline structure
        # This is a simplified parser - you may need to enhance based on actual response format
        outline = []
        
        # For now, return a basic structure - enhance based on your needs
        sample_outline = [
            OutlineSection(
                section_title="Introduction",
                section_context="Introduction to the research topic and thesis statement",
                subsections=[]
            ),
            OutlineSection(
                section_title="Literature Review",
                section_context="Review of existing literature and research",
                subsections=[]
            ),
            OutlineSection(
                section_title="Analysis",
                section_context="Main analysis and discussion of findings",
                subsections=[]
            ),
            OutlineSection(
                section_title="Conclusion",
                section_context="Summary of findings and implications",
                subsections=[]
            )
        ]
        
        return OutlineGenerationResponse(outline=sample_outline)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating outline: {str(e)}")

@router.post("/generate_sections", response_model=SectionGenerationResponse)
async def generate_sections(request: SectionGenerationRequest):
    try:
        # Extract methodology information
        methodology_description = ""
        if isinstance(request.methodology, dict):
            methodology_description = request.methodology.get('description', str(request.methodology))
        else:
            methodology_description = str(request.methodology)
        
        prompt = f"""
        Generate main sections for a research paper.
        
        Thesis: "{request.final_thesis}"
        Methodology: {methodology_description}
        Source Categories: {', '.join(request.source_categories)}
        
        Create 4-6 main sections with titles and brief context descriptions.
        Format as JSON array:
        [
          {{
            "section_title": "Section Title",
            "section_context": "Brief description of what this section covers"
          }}
        ]
        
        Return only the JSON array.
        """
        
        response = invoke_bedrock(prompt)
        
        # Parse JSON response
        try:
            json_start = response.find('[')
            json_end = response.rfind(']') + 1
            
            if json_start != -1 and json_end != -1:
                sections_json = response[json_start:json_end]
                sections_data = json.loads(sections_json)
                
                sections = [
                    OutlineSection(
                        section_title=section.get('section_title', 'Untitled Section'),
                        section_context=section.get('section_context', 'No context provided'),
                        subsections=[]
                    )
                    for section in sections_data
                ]
            else:
                # Fallback sections
                sections = [
                    OutlineSection(section_title="Introduction", section_context="Introduction and thesis statement", subsections=[]),
                    OutlineSection(section_title="Literature Review", section_context="Review of existing research", subsections=[]),
                    OutlineSection(section_title="Analysis", section_context="Main analysis and discussion", subsections=[]),
                    OutlineSection(section_title="Conclusion", section_context="Summary and implications", subsections=[])
                ]
        except:
            # Fallback sections
            sections = [
                OutlineSection(section_title="Introduction", section_context="Introduction and thesis statement", subsections=[]),
                OutlineSection(section_title="Literature Review", section_context="Review of existing research", subsections=[]),
                OutlineSection(section_title="Analysis", section_context="Main analysis and discussion", subsections=[]),
                OutlineSection(section_title="Conclusion", section_context="Summary and implications", subsections=[])
            ]
        
        return SectionGenerationResponse(sections=sections)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating sections: {str(e)}")

@router.post("/generate_subsections", response_model=SubsectionGenerationResponse)
async def generate_subsections(request: SubsectionGenerationRequest):
    try:
        # Extract methodology information
        methodology_description = ""
        if isinstance(request.methodology, dict):
            methodology_description = request.methodology.get('description', str(request.methodology))
        else:
            methodology_description = str(request.methodology)
        
        # Handle source_categories if present
        source_categories_str = ""
        if hasattr(request, 'source_categories') and request.source_categories:
            source_categories_str = f"Source Categories: {', '.join(request.source_categories)}"
        
        prompt = f"""
        Generate 2-4 subsections for the section "{request.section_title}".
        
        Section Context: {request.section_context}
        Thesis: "{request.final_thesis}"
        Methodology: {methodology_description}
        {source_categories_str}
        
        For each subsection, write a context statement that explains:
        - How it supports its parent section
        - Its connection to the thesis and methodology
        
        Each subsection context MUST include the exact phrase: "This supports the thesis by..."
        
        Be direct, academic, and explicitly linked to the thesis.
        
        Format as JSON array:
        [
          {{
            "subsection_title": "Subsection Title",
            "subsection_context": "1-2 sentences explaining how it supports its parent and thesis. Must include 'This supports the thesis by...'"
          }}
        ]
        
        Return only the JSON array.
        """
        
        response = invoke_bedrock(prompt)
        
        # Parse JSON response
        try:
            json_start = response.find('[')
            json_end = response.rfind(']') + 1
            
            if json_start != -1 and json_end != -1:
                subsections_json = response[json_start:json_end]
                subsections_data = json.loads(subsections_json)
                
                subsections = [
                    OutlineSubsection(
                        subsection_title=subsection.get('subsection_title', 'Untitled Subsection'),
                        subsection_context=subsection.get('subsection_context', 'No context provided')
                    )
                    for subsection in subsections_data
                ]
            else:
                # Fallback subsections
                subsections = [
                    OutlineSubsection(subsection_title=f"{request.section_title} Overview", subsection_context="Overview of the section topic"),
                    OutlineSubsection(subsection_title=f"{request.section_title} Analysis", subsection_context="Detailed analysis of the topic")
                ]
        except:
            # Fallback subsections
            subsections = [
                OutlineSubsection(subsection_title=f"{request.section_title} Overview", subsection_context="Overview of the section topic"),
                OutlineSubsection(subsection_title=f"{request.section_title} Analysis", subsection_context="Detailed analysis of the topic")
            ]
        
        return SubsectionGenerationResponse(subsections=subsections)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating subsections: {str(e)}")

@router.post("/generate_questions", response_model=QuestionGenerationResponse)
async def generate_questions(request: QuestionGenerationRequest):
    try:
        # Extract methodology information
        methodology_description = ""
        if isinstance(request.methodology, dict):
            methodology_description = request.methodology.get('description', str(request.methodology))
        else:
            methodology_description = str(request.methodology)
        
        prompt = f"""
        Generate 3-5 research questions for the subsection "{request.subsection_title}".
        
        Section: {request.section_title}
        Section Context: {request.section_context}
        Subsection Context: {request.subsection_context}
        Thesis: "{request.final_thesis}"
        Methodology: {methodology_description}
        
        Create specific research questions that would guide the research for this subsection.
        Format as JSON array of strings:
        [
          "Question 1?",
          "Question 2?",
          "Question 3?"
        ]
        
        Return only the JSON array.
        """
        
        response = invoke_bedrock(prompt)
        
        # Parse JSON response
        try:
            json_start = response.find('[')
            json_end = response.rfind(']') + 1
            
            if json_start != -1 and json_end != -1:
                questions_json = response[json_start:json_end]
                questions = json.loads(questions_json)
            else:
                # Fallback questions
                questions = [
                    f"What are the key aspects of {request.subsection_title}?",
                    f"How does {request.subsection_title} relate to the thesis?",
                    f"What evidence supports the analysis of {request.subsection_title}?"
                ]
        except:
            # Fallback questions
            questions = [
                f"What are the key aspects of {request.subsection_title}?",
                f"How does {request.subsection_title} relate to the thesis?",
                f"What evidence supports the analysis of {request.subsection_title}?"
            ]
        
        return QuestionGenerationResponse(questions=questions)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating questions: {str(e)}")

@router.post("/generate_question_citations", response_model=CitationGenerationResponse)
async def generate_question_citations(request: CitationGenerationRequest):
    try:
        # Debug logging
        print(f"Received citation request: {request}")
        
        # Extract methodology information
        methodology_description = ""
        if isinstance(request.methodology, dict):
            methodology_description = request.methodology.get('description', str(request.methodology))
        else:
            methodology_description = str(request.methodology)
        
        # Ensure source_categories is not None
        source_categories = request.source_categories if request.source_categories else []
        
        prompt = f"""
        Generate {request.citation_count} recommended academic sources for the research question: "{request.question}"
        
        Context:
        - Section: {request.section_title}
        - Subsection: {request.subsection_title}
        - Subsection Context: {request.subsection_context}
        - Thesis: "{request.final_thesis}"
        - Methodology: {methodology_description}
        - Available Source Categories: {', '.join(source_categories)}
        
        For each source, provide:
        - APA citation
        - Relevant categories from the available source categories
        - Methodology points it supports
        - Brief description of how it relates to the question
        
        Format as JSON array:
        [
          {{
            "apa": "Author, A. A. (Year). Title. Journal/Publisher.",
            "categories": ["Category1", "Category2"],
            "methodologyPoints": ["Point1", "Point2"],
            "description": "Brief description of relevance"
          }}
        ]
        
        Return only the JSON array.
        """
        
        response = invoke_bedrock(prompt)
        
        # Parse JSON response
        try:
            json_start = response.find('[')
            json_end = response.rfind(']') + 1
            
            if json_start != -1 and json_end != -1:
                citations_json = response[json_start:json_end]
                citations_data = json.loads(citations_json)
                
                sources = [
                    RecommendedSource(
                        apa=citation.get('apa', 'Citation not available'),
                        categories=citation.get('categories', ['General']),
                        methodologyPoints=citation.get('methodologyPoints', ['General methodology']),
                        description=citation.get('description', 'No description available')
                    )
                    for citation in citations_data
                ]
            else:
                # Fallback sources
                sources = [
                    RecommendedSource(
                        apa=f"Sample Author (2023). Research on {request.question}. Academic Journal.",
                        categories=source_categories[:2] if source_categories else ['General'],
                        methodologyPoints=[methodology_description[:50] + "..." if len(methodology_description) > 50 else methodology_description],
                        description=f"Relevant source for researching: {request.question}"
                    )
                ]
        except Exception as parse_error:
            print(f"Error parsing JSON: {parse_error}")
            # Fallback sources
            sources = [
                RecommendedSource(
                    apa=f"Sample Author (2023). Research on {request.question}. Academic Journal.",
                    categories=source_categories[:2] if source_categories else ['General'],
                    methodologyPoints=[methodology_description[:50] + "..." if len(methodology_description) > 50 else methodology_description],
                    description=f"Relevant source for researching: {request.question}"
                )
            ]
        
        return CitationGenerationResponse(recommended_sources=sources)
        
    except Exception as e:
        print(f"Error in generate_question_citations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating citations: {str(e)}")

@router.post("/paper_structure", response_model=PaperStructureResponse)
async def get_paper_structure(request: PaperStructureRequest):
    """Get the structured outline for a paper type and methodology combination."""
    try:
        structure_data = PaperStructureService.get_structure_preview(
            request.paper_type,
            request.methodology_id
            # request.sub_methodology_id  # Removed from production, kept for future consideration
        )
        
        return PaperStructureResponse(**structure_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating paper structure: {str(e)}")

@router.post("/generate_structured_outline", response_model=StructuredOutlineResponse)
async def generate_structured_outline(request: StructuredOutlineRequest):
    """Generate a structured outline based on paper type and methodology."""
    try:
        # Get the structured outline
        structure_preview = PaperStructureService.get_structure_preview(
            request.paper_type,
            request.methodology_id
            # request.sub_methodology_id  # Removed from production, kept for future consideration
        )
        
        # Generate sections based on structure
        structure_sections = structure_preview["structure"]
        
        # Extract methodology information
        methodology_description = ""
        if isinstance(request.methodology, dict):
            methodology_description = request.methodology.get('description', str(request.methodology))
        else:
            methodology_description = str(request.methodology)
        
        # Generate contextual sections
        outline_sections = []
        
        # Use custom structure if provided, otherwise use default structure
        if request.custom_structure:
            print(f"Using custom structure with {len(request.custom_structure)} sections")
            for custom_section in request.custom_structure:
                section_title = custom_section["section_title"]
                section_context = custom_section.get("section_context", f"Analysis and discussion of {section_title}")
                
                outline_sections.append({
                    "section_title": section_title,
                    "section_context": section_context,
                    "subsections": [],
                    "is_administrative": False,
                    "pages_allocated": custom_section.get("pages_allocated", 2),
                    # Preserve data section metadata from paper structure preview
                    "is_data_section": custom_section.get("is_data_section", False),
                    "section_type": custom_section.get("section_type", "content"),
                    "category": custom_section.get("category", "content_section")
                })
        else:
            # Default structure generation (for backward compatibility)
            for section_title in structure_sections:
                # Skip administrative sections
                if section_title.lower() in ['title page', 'abstract', 'references (apa 7th)']:
                    outline_sections.append({
                        "section_title": section_title,
                        "section_context": f"Standard {section_title.lower()} section",
                        "subsections": [],
                        "is_administrative": True,
                        "is_data_section": False,
                        "section_type": "administrative",
                        "category": "admin_section"
                    })
                    continue
                
                # Generate contextual description for content sections
                context_prompt = f"""
                Generate a context statement for the section "{section_title}" in a {request.paper_type} paper.
                
                Thesis: "{request.final_thesis}"
                Methodology: {methodology_description}
                
                Write 1-3 sentences explaining:
                - The section's purpose within the paper
                - How it connects to the thesis and methodology
                
                The statement MUST include the exact phrase: "This supports the thesis by..."
                
                Be direct, academic, and explicitly link to the thesis. Return only the context statement.
                """
                
                try:
                    context_response = invoke_bedrock(context_prompt)
                    section_context = context_response.strip()
                except:
                    section_context = f"Analysis and discussion relevant to {section_title.lower()}"
                
                # Auto-categorize sections based on content
                section_category = PaperStructureService.categorize_section(section_title)
                is_data_section = section_category == 'Data'
                
                outline_sections.append({
                    "section_title": section_title,
                    "section_context": section_context,
                    "subsections": [],
                    "is_administrative": False,
                    "is_data_section": is_data_section,
                    "section_type": section_category.lower(),
                    "category": "data_section" if is_data_section else "content_section"
                })
        
        return StructuredOutlineResponse(
            outline=outline_sections,
            structure_preview=structure_preview
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating structured outline: {str(e)}")

@router.post("/generate_section_context")
async def generate_section_context(request: dict):
    """
    Generate thorough context for a section that relates it back to the thesis.
    """
    try:
        final_thesis = request.get('final_thesis')
        section_title = request.get('section_title')
        section_description = request.get('section_description', '')
        methodology = request.get('methodology')
        source_categories = request.get('source_categories', [])
        
        # Extract methodology information
        methodology_description = ""
        if isinstance(methodology, dict):
            methodology_description = methodology.get('description', str(methodology))
        else:
            methodology_description = str(methodology)
        
        prompt = f"""
Generate a thorough context statement for the section "{section_title}" in a research paper.

Thesis: "{final_thesis}"
Methodology: {methodology_description}
Source Categories: {', '.join(source_categories)}
Section Description: {section_description}

Write 2-3 sentences that:
1. Explain the purpose of this section
2. MUST include the exact phrase: "This supports the thesis by..."
3. Explicitly connect it to the thesis and methodology

Be direct, academic, and specific about how this section contributes to proving the thesis.

Return only the context statement, no additional text.
"""
        
        response = invoke_bedrock(prompt)
        context = response.strip()
        
        # Ensure it includes the required phrase
        if "This supports the thesis by" not in context:
            context += f" This supports the thesis by providing essential evidence and analysis for {section_title.lower()}."
        
        return {"context": context}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating section context: {str(e)}")

@router.post("/generate_subsection_context")
async def generate_subsection_context(request: dict):
    """
    Generate thorough context for a subsection that relates it to its parent section and thesis.
    """
    try:
        final_thesis = request.get('final_thesis')
        section_title = request.get('section_title')
        section_context = request.get('section_context')
        subsection_title = request.get('subsection_title')
        subsection_description = request.get('subsection_description', '')
        methodology = request.get('methodology')
        source_categories = request.get('source_categories', [])
        
        # Extract methodology information
        methodology_description = ""
        if isinstance(methodology, dict):
            methodology_description = methodology.get('description', str(methodology))
        else:
            methodology_description = str(methodology)
        
        prompt = f"""
Generate a thorough context statement for the subsection "{subsection_title}" within the section "{section_title}".

Thesis: "{final_thesis}"
Section Context: {section_context}
Methodology: {methodology_description}
Source Categories: {', '.join(source_categories)}
Subsection Description: {subsection_description}

Write 2-3 sentences that:
1. Explain the specific focus of this subsection
2. MUST include the exact phrase: "This supports the larger section by..."
3. MUST also include: "and therefore supports the thesis by..."
4. Explicitly connect it to both the parent section and the thesis

Be direct, academic, and specific about how this subsection contributes to the section and thesis.

Return only the context statement, no additional text.
"""
        
        response = invoke_bedrock(prompt)
        context = response.strip()
        
        # Ensure it includes the required phrases
        if "This supports the larger section by" not in context:
            context += f" This supports the larger section by providing detailed analysis of {subsection_title.lower()}, and therefore supports the thesis by contributing essential evidence."
        elif "and therefore supports the thesis by" not in context and "therefore supports the thesis by" not in context:
            context += f" and therefore supports the thesis by contributing essential evidence."
        
        return {"context": context}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating subsection context: {str(e)}")

@router.post("/generate_sections_subsections")
async def generate_sections_subsections(request: dict):
    """
    Generate sections and subsections for the paper structure preview.
    Takes paper_type, methodology, and structure and returns detailed sections with subsections.
    """
    try:
        paper_type = request.get('paper_type')
        methodology = request.get('methodology')
        structure = request.get('structure', [])
        custom_prompt = request.get('prompt')
        
        if not paper_type:
            raise HTTPException(status_code=400, detail="Paper type is required")
        
        # Extract methodology information
        methodology_description = ""
        if isinstance(methodology, dict):
            methodology_description = methodology.get('description', str(methodology))
        else:
            methodology_description = str(methodology)
        
        # Use custom prompt if provided, otherwise use the enhanced generation prompt
        if custom_prompt:
            prompt = custom_prompt
        else:
            # Enhanced generation: ask the model for strict JSON output that uses the thesis, source categories, methodology
            # to produce focused sections and subsections. We expect the model to return an array of section objects with
            # fields: title, category, focus, subsections: [{title, focus, required_data_examples}], flags: {isData,isAnalysis,isMethod}
            prompt = f"""
You are an expert academic structure generator. Given the paper's thesis, source categories (topics of available evidence), the methodology, and a baseline structure list, produce a focused, actionable set of sections and subsections suitable to drive an outline generator.

Inputs:
- Paper type: {paper_type}
- Methodology (summary): {methodology_description}
- Thesis: {request.get('final_thesis', '')}
- Source categories: {json.dumps(request.get('source_categories', []))}
- Baseline structure titles: {json.dumps(structure)}
You are an expert academic structure generator. Given the paper's thesis, source categories (topics of available evidence), the methodology, and a baseline structure list, produce a focused, actionable set of sections and subsections suitable to drive an outline generator.

Inputs:
- Paper type: {paper_type}
- Methodology (summary): {methodology_description}
- Thesis: {request.get('final_thesis', '')}
- Source categories: {json.dumps(request.get('source_categories', []))}
- Baseline structure titles: {json.dumps(structure)}

Task:
1) For each baseline section, decide whether to (a) keep it as administrative, (b) expand it into focused sections (e.g., Data sections should be specific kinds of evidence such as 'Operational Logs', 'Survey Responses', 'Case Studies'), or (c) mark it as Analysis/Method/Other.
2) For each Data-type section, produce 3-6 concrete subsection topics. Each subsection must be a focused research topic or data element that can be directly analyzed (not a generic meta-heading). Example: 'Network Intrusion Timeline (Event-level logs: timestamps, source IPs, attack vectors)'.
3) For each Analysis-type section, specify which Data sections it analyzes (use exact titles returned in the Data sections), and list focused analysis subtopics (e.g., 'Temporal attack patterns - anomaly detection on event timestamps').
4) For each section, include a short 'focus' sentence (1-2 sentences) that links the section to the thesis and methodology.

Output format (STRICT JSON):
Return only valid JSON: an array of sections. Each section object must have the following keys:
[
  {
    "title": "Section Title",
    "category": "Admin|Intro|Data|Method|Analysis|Impact|Summary|Other",
    "focus": "One or two sentences linking this section to the thesis and methodology",
    "flags": {"isData": true|false, "isAnalysis": true|false, "isMethod": true|false},
    "subsections": [
      {"title": "Subsection title (focused)", "focus": "1-line description of topic and data needed", "required_data_examples": ["example1", "example2"]}
    ],
    // optional for analysis sections
    "analysis_targets": ["Exact Data Section title(s) this analysis will use"]
  }
]

Constraints:
- Use the thesis and source categories to produce subsection topics that directly map to available evidence and testable claims.
- Do not return generic headings like 'Existing Literature' or 'Key Observations' as subsection titles; instead produce concrete topics and data elements.
- Ensure Data sections are specific (e.g., 'Survey: public sentiment about X' not just 'Data Collection Process').
- Ensure Analysis sections include explicit analysis_targets referencing data section titles.

Produce the JSON now.
"""

        try:
            raw = invoke_bedrock(prompt)
            if not raw:
                raise ValueError('Empty response from model')

            # For custom prompts, return the raw text directly
            if custom_prompt:
                return {"sections": raw.strip()}

            # For the default prompt, parse JSON as before
            # Try to extract JSON from the response robustly
            text = raw.strip()
            if '```json' in text:
                text = text[text.find('```json') + 7:]
                if '```' in text:
                    text = text[:text.find('```')]

            # Fallback: find first '[' and last ']' to get JSON array
            if not text.startswith('['):
                start = text.find('[')
                end = text.rfind(']')
                if start != -1 and end != -1:
                    text = text[start:end+1]

            sections_data = json.loads(text)

            # Validate and normalize
            normalized = []
            for sec in sections_data:
                title = sec.get('title') or sec.get('section_title') or ''
                category = sec.get('category') or 'Other'
                focus = sec.get('focus') or sec.get('section_context') or ''
                flags = sec.get('flags') or {}
                isData = flags.get('isData', False) or sec.get('is_data') or sec.get('is_data_section', False)
                isAnalysis = flags.get('isAnalysis', False) or sec.get('is_analysis', False)
                isMethod = flags.get('isMethod', False) or sec.get('is_method', False)

                subs = []
                for s in sec.get('subsections', []) or []:
                    st = s.get('title') or s.get('subsection_title') or s.get('subsection') or ''
                    sf = s.get('focus') or s.get('subsection_context') or ''
                    req = s.get('required_data_examples') or s.get('examples') or []
                    subs.append({"title": st, "focus": sf, "required_data_examples": req})

                analysis_targets = sec.get('analysis_targets') or sec.get('targets') or []

                normalized.append({
                    "title": title,
                    "category": category,
                    "focus": focus,
                    "flags": {"isData": bool(isData), "isAnalysis": bool(isAnalysis), "isMethod": bool(isMethod)},
                    "subsections": subs,
                    "analysis_targets": analysis_targets
                })

            # As a final step, ensure Data sections precede Analysis sections and admin sections are first
            admin = [s for s in normalized if s['category'].lower() in ('admin', 'intro', 'title page', 'abstract')]
            data_secs = [s for s in normalized if s['flags']['isData']]
            analysis_secs = [s for s in normalized if s['flags']['isAnalysis']]
            others = [s for s in normalized if s not in admin + data_secs + analysis_secs]

            final_sections = admin + data_secs + analysis_secs + others

            return {"sections": final_sections}

        except Exception as e:
            # Fallback to previous simpler behavior if parsing or model fails
            logger.error(f"generate_sections_subsections failed to parse model output: {str(e)}")
            generated_sections = []
            for section_title in structure:
                if section_title.lower() in ['title page', 'abstract', 'references (apa 7th)', 'references']:
                    continue
                section_context_prompt = f"""
                Generate a brief context description for the section "{section_title}" in a {paper_type} research paper.
                Paper Type: {paper_type}
                Methodology: {methodology_description}
                Section: {section_title}
                Return a short context sentence.
                """
                try:
                    section_context = invoke_bedrock(section_context_prompt).strip()
                except:
                    section_context = f"Analysis and discussion relevant to {section_title.lower()}"

                subsections = []
                if section_title.lower() not in ['introduction', 'conclusion', 'abstract']:
                    subsections = [
                        {"subsection_title": f"{section_title} Overview", "subsection_context": "Overview and introduction"},
                        {"subsection_title": f"{section_title} Analysis", "subsection_context": "Detailed analysis and discussion"}
                    ]

                generated_sections.append({
                    "title": section_title,
                    "context": section_context,
                    "subsections": subsections
                })

            return {"sections": generated_sections}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating sections and subsections: {str(e)}")