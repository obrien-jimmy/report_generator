from fastapi import APIRouter, HTTPException
from schemas.methodology import (
    MethodologySelectionRequest,
    MethodologyOptionsResponse,
    MethodologyGenerationResponse,
    MethodologyRequest,
    MethodologyResponse,
    MethodologyOption,
    GeneratedMethodology
)
from services.bedrock_service import invoke_bedrock
import json
import re

router = APIRouter()

@router.get("/methodology_options", response_model=MethodologyOptionsResponse)
async def get_methodology_options():
    methodologies = [
        MethodologyOption(
            id="quantitative",
            name="Quantitative Analysis",
            description="An approach focused on measuring and analyzing variables numerically to test hypotheses and estimate relationships or effects. Best suited for data-rich research with statistical analysis needs.",
            rank=1,
            sub_methodologies=[
                MethodologyOption(id="statistical_techniques", name="Core Statistical Techniques", description="Descriptive and inferential statistics, hypothesis testing, and ANOVA. Limited by available quantitative data sources.", rank=1),
                MethodologyOption(id="regression_models", name="Regression & Generalized Models", description="Linear regression, logistic regression, and generalized linear models. Requires structured datasets.", rank=2),
                MethodologyOption(id="descriptive_correlational", name="Descriptive & Correlational Designs", description="Descriptive research, correlational studies, and exploratory data analysis using available data sources.", rank=3),
                MethodologyOption(id="meta_analysis_quant", name="Meta-Analysis & Meta-Regression", description="Effect-size computation and meta-regression analysis from published studies. Good RAG compatibility.", rank=4),
                MethodologyOption(id="bibliometric", name="Bibliometric & Network Analysis", description="Citation analysis, co-authorship networks, and keyword co-occurrence mapping from literature databases.", rank=5)
            ]
        ),
        MethodologyOption(
            id="qualitative",
            name="Qualitative Analysis",
            description="An approach centered on understanding meanings, experiences, and social contexts through systematic analysis of textual and documentary sources.",
            rank=2,
            sub_methodologies=[
                MethodologyOption(id="thematic_analysis", name="Thematic Analysis", description="Identifying, analyzing, and reporting patterns (themes) within qualitative data sources. Excellent RAG compatibility.", rank=1),
                MethodologyOption(id="content_analysis", name="Content Analysis", description="Systematic coding and categorization of textual data to quantify patterns and interpret context. Perfect for RAG/LLM analysis.", rank=2),
                MethodologyOption(id="case_study", name="Case Study", description="In-depth exploration of specific cases using documents, reports, and archival materials to build comprehensive understanding.", rank=3),
                MethodologyOption(id="discourse_analysis", name="Discourse Analysis", description="Study of language use and communication practices through systematic analysis of texts and documents.", rank=4),
                MethodologyOption(id="narrative_analysis", name="Narrative Analysis", description="Examination of how narratives are constructed in documents, reports, and communications.", rank=5),
                MethodologyOption(id="archival_analysis", name="Document & Archival Analysis", description="Analysis of historical records, official documents, and archival materials. Excellent for RAG-based research.", rank=6)
            ]
        ),
        MethodologyOption(
            id="literature_review",
            name="Literature-Based Review",
            description="A systematic approach to collecting, analyzing, and synthesizing existing scholarship. Perfectly suited for RAG/LLM-based research and comprehensive source analysis.",
            rank=3,
            sub_methodologies=[
                MethodologyOption(id="systematic_review", name="Systematic Review", description="Fully protocolled process of search, appraisal, and synthesis. Excellent for comprehensive RAG-based analysis.", rank=1),
                MethodologyOption(id="narrative_review", name="Narrative (Traditional) Review", description="Broad overview of a topic, organized thematically or chronologically. Perfect RAG compatibility.", rank=2),
                MethodologyOption(id="scoping_review", name="Scoping Review", description="Maps key concepts and gaps without formal quality assessment. Ideal for exploratory RAG research.", rank=3),
                MethodologyOption(id="integrative_review", name="Integrative Review", description="Combines diverse study types for holistic insight. Excellent for mixed-source RAG analysis.", rank=4),
                MethodologyOption(id="critical_review", name="Critical Review", description="Evaluates methodological rigor and theoretical contributions through systematic source analysis.", rank=5),
                MethodologyOption(id="conceptual_review", name="Conceptual Review", description="Clarifies and refines key concepts, definitions, and theoretical frameworks from literature sources.", rank=6),
                MethodologyOption(id="meta_synthesis", name="Meta-Synthesis", description="Aggregates qualitative findings into higher-order interpretations through systematic literature analysis.", rank=7)
            ]
        ),
        MethodologyOption(
            id="mixed_methods",
            name="Mixed Methods",
            description="An integrative approach that combines multiple analytical strategies to provide comprehensive analysis through diverse source types and analytical techniques.",
            rank=4,
            sub_methodologies=[
                MethodologyOption(id="sequential_concurrent", name="Sequential & Concurrent Analysis", description="Combines literature review with quantitative data analysis in structured phases. Good RAG compatibility.", rank=1),
                MethodologyOption(id="case_study_mixed", name="Case-Study Mixed Methods", description="Combines qualitative document analysis with available quantitative measures within case studies.", rank=2),
                MethodologyOption(id="mixed_methods_systematic_review", name="Mixed-Methods Systematic Review", description="Systematic review incorporating both quantitative and qualitative syntheses. Excellent RAG compatibility.", rank=3)
            ]
        )
    ]
    
    return MethodologyOptionsResponse(methodologies=methodologies)

@router.post("/generate_methodology_options", response_model=MethodologyGenerationResponse)
async def generate_methodology_options(request: MethodologySelectionRequest):
    try:
        # Determine methodology context
        selected_methodology = request.methodology_type
        sub_methodology = request.sub_methodology or "general"
        
        # Generate methodology options with simpler prompt
        methodology_prompt = f"""
        Generate 3 methodology approaches for this research paper:

        Thesis: "{request.final_thesis}"
        Paper Type: {request.paper_type}
        Page Count: {request.page_count}
        Source Categories: {', '.join(request.source_categories)}
        Methodology Type: {selected_methodology}
        Sub-methodology: {sub_methodology}

        Return exactly 3 methodologies in this JSON format:
        [
          {{
            "title": "Methodology Title",
            "description": "Brief description of the methodology approach",
            "approach": "How this methodology will be implemented",
            "source_focus": "Which source categories will be emphasized",
            "structure_alignment": "How this aligns with the paper structure"
          }},
          {{
            "title": "Another Methodology",
            "description": "Brief description of the second methodology",
            "approach": "Implementation details",
            "source_focus": "Source emphasis",
            "structure_alignment": "Structure alignment"
          }},
          {{
            "title": "Third Methodology",
            "description": "Brief description of the third methodology",
            "approach": "Implementation approach",
            "source_focus": "Source focus",
            "structure_alignment": "Structure alignment"
          }}
        ]

        Return only the JSON array, no additional text.
        """
        
        response = invoke_bedrock(methodology_prompt)
        
        if not response or not response.strip():
            raise ValueError("Empty response from Bedrock service")
        
        # Clean the response
        response_cleaned = response.strip()
        print(f"Raw response: {response_cleaned}")  # Debug logging
        
        # Find JSON array in response
        json_start = response_cleaned.find('[')
        json_end = response_cleaned.rfind(']') + 1
        
        if json_start == -1 or json_end == -1:
            # If no JSON found, create default methodologies
            methodologies_data = [
                {
                    "title": "Literature Review Approach",
                    "description": f"Systematic analysis of existing literature to support the thesis: {request.final_thesis}",
                    "approach": "Comprehensive review and synthesis of selected source categories",
                    "source_focus": f"Primary focus on {', '.join(request.source_categories[:3])}",
                    "structure_alignment": f"Structured to align with {request.paper_type} requirements"
                },
                {
                    "title": "Comparative Analysis",
                    "description": "Comparative examination of different perspectives and evidence",
                    "approach": "Cross-reference and compare findings across source categories",
                    "source_focus": "Balanced use of all selected source categories",
                    "structure_alignment": "Organized to support argumentative structure"
                },
                {
                    "title": "Thematic Synthesis",
                    "description": "Thematic organization of evidence to support key arguments",
                    "approach": "Group sources by themes and synthesize findings",
                    "source_focus": "Emphasis on sources that support main themes",
                    "structure_alignment": "Theme-based organization matching paper structure"
                }
            ]
        else:
            methodologies_json = response_cleaned[json_start:json_end]
            print(f"Extracted JSON: {methodologies_json}")  # Debug logging
            
            try:
                methodologies_data = json.loads(methodologies_json)
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                # Fallback to default methodologies
                methodologies_data = [
                    {
                        "title": "Literature Review Approach",
                        "description": f"Systematic analysis of existing literature to support the thesis: {request.final_thesis}",
                        "approach": "Comprehensive review and synthesis of selected source categories",
                        "source_focus": f"Primary focus on {', '.join(request.source_categories[:3])}",
                        "structure_alignment": f"Structured to align with {request.paper_type} requirements"
                    },
                    {
                        "title": "Comparative Analysis",
                        "description": "Comparative examination of different perspectives and evidence",
                        "approach": "Cross-reference and compare findings across source categories",
                        "source_focus": "Balanced use of all selected source categories",
                        "structure_alignment": "Organized to support argumentative structure"
                    },
                    {
                        "title": "Thematic Synthesis",
                        "description": "Thematic organization of evidence to support key arguments",
                        "approach": "Group sources by themes and synthesize findings",
                        "source_focus": "Emphasis on sources that support main themes",
                        "structure_alignment": "Theme-based organization matching paper structure"
                    }
                ]
        
        # Convert to GeneratedMethodology objects
        methodologies = []
        for m in methodologies_data:
            methodology = GeneratedMethodology(
                title=str(m.get("title", "Untitled Methodology")),
                description=str(m.get("description", "No description available")),
                approach=str(m.get("approach", "No approach specified")),
                source_focus=str(m.get("source_focus", "No source focus specified")),
                structure_alignment=str(m.get("structure_alignment", "No structure alignment specified"))
            )
            methodologies.append(methodology)
        
        selected_info = {
            "methodology_type": selected_methodology,
            "sub_methodology": sub_methodology,
            "source_categories": request.source_categories
        }
        
        return MethodologyGenerationResponse(
            methodologies=methodologies,
            selected_methodology_info=selected_info
        )
        
    except Exception as e:
        print(f"Error in generate_methodology_options: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating methodologies: {str(e)}")

@router.post("/generate_methodology", response_model=MethodologyResponse)
async def generate_methodology(request: MethodologyRequest):
    prompt = f"""
    You are an expert professor creating detailed research methodologies.
    Given the thesis: "{request.final_thesis}" and these explicitly selected source categories: {', '.join(request.source_categories)},
    explicitly articulate a clear and concise research methodology detailing how to effectively analyze each source category to thoroughly address and support the thesis.

    Provide ONLY the methodology explicitly. Do not start any header, to include "Research Methodology:". Just start listing the methodology considerations.
    """
    try:
        methodology_text = invoke_bedrock(prompt).strip()
        return MethodologyResponse(methodology=methodology_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))