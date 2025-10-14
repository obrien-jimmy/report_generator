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

router = APIRouter()

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
        Generate main sections for a {request.paper_length_pages}-page research paper.
        
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
        Paper Length: {request.paper_length_pages} pages
        {source_categories_str}
        
        Create subsections with titles and context descriptions that will help address the larger section's purpose.
        Each subsection should connect to the methodology and support the thesis.
        
        Format as JSON array:
        [
          {{
            "subsection_title": "Subsection Title",
            "subsection_context": "Brief description of what this subsection covers and how it supports the section and thesis"
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
                Generate a brief context description for the section "{section_title}" in a {request.paper_type} paper.
                
                Thesis: "{request.final_thesis}"
                Methodology: {methodology_description}
                
                Provide a 1-2 sentence description of what this section should cover.
                Return only the description, no additional text.
                """
                
                try:
                    context_response = invoke_bedrock(context_prompt)
                    section_context = context_response.strip()
                except:
                    section_context = f"Analysis and discussion relevant to {section_title.lower()}"
                
                # Auto-categorize sections based on content
                from ..services.paper_structure_service import PaperStructureService
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