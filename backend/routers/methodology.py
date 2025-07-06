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
        # Get methodology info from the predefined options
        methodologies = [
            MethodologyOption(
                id="quantitative",
                name="Quantitative Analysis",
                description="An approach focused on measuring and analyzing variables numerically to test hypotheses and estimate relationships or effects. Best suited for data-rich research with statistical analysis needs.",
                sub_methodologies=[
                    MethodologyOption(id="statistical_techniques", name="Core Statistical Techniques", description="Descriptive and inferential statistics, hypothesis testing, and ANOVA. Limited by available quantitative data sources."),
                    MethodologyOption(id="regression_models", name="Regression & Generalized Models", description="Linear regression, logistic regression, and generalized linear models. Requires structured datasets."),
                    MethodologyOption(id="descriptive_correlational", name="Descriptive & Correlational Designs", description="Descriptive research, correlational studies, and exploratory data analysis using available data sources."),
                    MethodologyOption(id="meta_analysis_quant", name="Meta-Analysis & Meta-Regression", description="Effect-size computation and meta-regression analysis from published studies. Good RAG compatibility."),
                    MethodologyOption(id="bibliometric", name="Bibliometric & Network Analysis", description="Citation analysis, co-authorship networks, and keyword co-occurrence mapping from literature databases.")
                ]
            ),
            MethodologyOption(
                id="qualitative",
                name="Qualitative Analysis",
                description="An approach centered on understanding meanings, experiences, and social contexts through systematic analysis of textual and documentary sources.",
                sub_methodologies=[
                    MethodologyOption(id="thematic_analysis", name="Thematic Analysis", description="Identifying, analyzing, and reporting patterns (themes) within qualitative data sources. Excellent RAG compatibility."),
                    MethodologyOption(id="content_analysis", name="Content Analysis", description="Systematic coding and categorization of textual data to quantify patterns and interpret context. Perfect for RAG/LLM analysis."),
                    MethodologyOption(id="case_study", name="Case Study", description="In-depth exploration of specific cases using documents, reports, and archival materials to build comprehensive understanding."),
                    MethodologyOption(id="discourse_analysis", name="Discourse Analysis", description="Study of language use and communication practices through systematic analysis of texts and documents."),
                    MethodologyOption(id="narrative_analysis", name="Narrative Analysis", description="Examination of how narratives are constructed in documents, reports, and communications."),
                    MethodologyOption(id="archival_analysis", name="Document & Archival Analysis", description="Analysis of historical records, official documents, and archival materials. Excellent for RAG-based research.")
                ]
            ),
            MethodologyOption(
                id="literature_review",
                name="Literature-Based Review",
                description="A systematic approach to collecting, analyzing, and synthesizing existing scholarship. Perfectly suited for RAG/LLM-based research and comprehensive source analysis.",
                sub_methodologies=[
                    MethodologyOption(id="systematic_review", name="Systematic Review", description="Fully protocolled process of search, appraisal, and synthesis. Excellent for comprehensive RAG-based analysis."),
                    MethodologyOption(id="narrative_review", name="Narrative (Traditional) Review", description="Broad overview of a topic, organized thematically or chronologically. Perfect RAG compatibility."),
                    MethodologyOption(id="scoping_review", name="Scoping Review", description="Maps key concepts and gaps without formal quality assessment. Ideal for exploratory RAG research."),
                    MethodologyOption(id="integrative_review", name="Integrative Review", description="Combines diverse study types for holistic insight. Excellent for mixed-source RAG analysis."),
                    MethodologyOption(id="critical_review", name="Critical Review", description="Evaluates methodological rigor and theoretical contributions through systematic source analysis."),
                    MethodologyOption(id="conceptual_review", name="Conceptual Review", description="Clarifies and refines key concepts, definitions, and theoretical frameworks from literature sources."),
                    MethodologyOption(id="meta_synthesis", name="Meta-Synthesis", description="Aggregates qualitative findings into higher-order interpretations through systematic literature analysis.")
                ]
            ),
            MethodologyOption(
                id="mixed_methods",
                name="Mixed Methods",
                description="An integrative approach that combines multiple analytical strategies to provide comprehensive analysis through diverse source types and analytical techniques.",
                sub_methodologies=[
                    MethodologyOption(id="sequential_concurrent", name="Sequential & Concurrent Analysis", description="Combines literature review with quantitative data analysis in structured phases. Good RAG compatibility."),
                    MethodologyOption(id="case_study_mixed", name="Case-Study Mixed Methods", description="Combines qualitative document analysis with available quantitative measures within case studies."),
                    MethodologyOption(id="mixed_methods_systematic_review", name="Mixed-Methods Systematic Review", description="Systematic review incorporating both quantitative and qualitative syntheses. Excellent RAG compatibility.")
                ]
            )
        ]
        
        # Find the selected methodology
        selected_methodology_obj = None
        selected_sub_methodology_obj = None
        
        for methodology in methodologies:
            if methodology.id == request.methodology_type:
                selected_methodology_obj = methodology
                
                # Find sub-methodology if specified
                if request.sub_methodology and methodology.sub_methodologies:
                    for sub_method in methodology.sub_methodologies:
                        if sub_method.id == request.sub_methodology:
                            selected_sub_methodology_obj = sub_method
                            break
                break
        
        if not selected_methodology_obj:
            raise HTTPException(status_code=400, detail=f"Methodology type '{request.methodology_type}' not found")
        
        # Determine the methodology context for the prompt
        methodology_name = selected_methodology_obj.name
        methodology_description = selected_methodology_obj.description
        
        if selected_sub_methodology_obj:
            sub_methodology_name = selected_sub_methodology_obj.name
            sub_methodology_description = selected_sub_methodology_obj.description
            methodology_context = f"{methodology_name} - {sub_methodology_name}: {sub_methodology_description}"
        else:
            methodology_context = f"{methodology_name}: {methodology_description}"
        
        # Generate methodology options with proper context
        methodology_prompt = f"""
        Generate 3 specific methodology approaches for this research paper using the selected methodology type.

        SELECTED METHODOLOGY: {methodology_context}

        Research Details:
        - Thesis: "{request.final_thesis}"
        - Paper Type: {request.paper_type}
        - Paper Purpose: {request.paper_purpose}
        - Page Count: {request.page_count}
        - Source Categories: {', '.join(request.source_categories)}

        IMPORTANT: All 3 methodologies must be variations of "{methodology_name}" methodology{f" specifically using {sub_methodology_name} approach" if selected_sub_methodology_obj else ""}.

        Each methodology should:
        1. Be a specific application of the selected methodology type
        2. Address the thesis directly
        3. Utilize the available source categories appropriately
        4. Align with the paper type and purpose

        Return exactly 3 methodologies in this JSON format:
        [
          {{
            "title": "Specific {methodology_name} Approach Title",
            "description": "Brief description focusing on {methodology_name} methods",
            "approach": "Detailed implementation using {methodology_name} techniques",
            "source_focus": "How {methodology_name} will analyze the source categories",
            "structure_alignment": "How this {methodology_name} approach aligns with {request.paper_type} structure"
          }},
          {{
            "title": "Alternative {methodology_name} Approach Title",
            "description": "Different {methodology_name} approach description",
            "approach": "Alternative implementation of {methodology_name} methods",
            "source_focus": "Different {methodology_name} source analysis strategy",
            "structure_alignment": "Alternative {methodology_name} structural alignment"
          }},
          {{
            "title": "Comprehensive {methodology_name} Approach Title",
            "description": "Comprehensive {methodology_name} methodology description",
            "approach": "Full implementation of {methodology_name} techniques",
            "source_focus": "Comprehensive {methodology_name} source utilization",
            "structure_alignment": "Complete {methodology_name} structural integration"
          }}
        ]

        Return only the JSON array, no additional text.
        """
        
        response = invoke_bedrock(methodology_prompt)
        
        if not response or not response.strip():
            # Create default methodologies based on selected methodology
            methodologies_data = create_default_methodologies(
                selected_methodology_obj, 
                selected_sub_methodology_obj, 
                request
            )
        else:
            # Clean and parse the response
            response_cleaned = response.strip()
            json_start = response_cleaned.find('[')
            json_end = response_cleaned.rfind(']') + 1
            
            if json_start == -1 or json_end == -1:
                methodologies_data = create_default_methodologies(
                    selected_methodology_obj, 
                    selected_sub_methodology_obj, 
                    request
                )
            else:
                methodologies_json = response_cleaned[json_start:json_end]
                
                try:
                    methodologies_data = json.loads(methodologies_json)
                except json.JSONDecodeError:
                    methodologies_data = create_default_methodologies(
                        selected_methodology_obj, 
                        selected_sub_methodology_obj, 
                        request
                    )
        
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
            "methodology_type": request.methodology_type,
            "methodology_name": methodology_name,
            "sub_methodology": request.sub_methodology,
            "sub_methodology_name": sub_methodology_name if selected_sub_methodology_obj else None,
            "source_categories": request.source_categories
        }
        
        return MethodologyGenerationResponse(
            methodologies=methodologies,
            selected_methodology_info=selected_info
        )
        
    except Exception as e:
        print(f"Error in generate_methodology_options: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating methodologies: {str(e)}")


def create_default_methodologies(selected_methodology_obj, selected_sub_methodology_obj, request):
    """Create default methodologies based on the selected methodology type"""
    methodology_name = selected_methodology_obj.name
    sub_methodology_name = selected_sub_methodology_obj.name if selected_sub_methodology_obj else None
    
    if request.methodology_type == "qualitative":
        if sub_methodology_name == "Case Study":
            return [
                {
                    "title": "Single-Case Study Analysis",
                    "description": f"In-depth case study examination to explore {request.final_thesis}",
                    "approach": "Detailed analysis of a single case using multiple data sources and triangulation",
                    "source_focus": f"Primary focus on {', '.join(request.source_categories[:3])} for comprehensive case documentation",
                    "structure_alignment": f"Case study structure with background, analysis, and conclusions for {request.paper_type}"
                },
                {
                    "title": "Comparative Case Study",
                    "description": f"Multiple case comparison to understand {request.final_thesis}",
                    "approach": "Cross-case analysis comparing similarities and differences across cases",
                    "source_focus": f"Balanced use of {', '.join(request.source_categories)} across all cases",
                    "structure_alignment": f"Comparative structure with individual case analyses and cross-case synthesis"
                },
                {
                    "title": "Longitudinal Case Study",
                    "description": f"Time-based case study tracking developments related to {request.final_thesis}",
                    "approach": "Chronological analysis of case development over time",
                    "source_focus": f"Temporal organization of {', '.join(request.source_categories)} to show progression",
                    "structure_alignment": f"Chronological structure showing case evolution over time"
                }
            ]
        elif sub_methodology_name == "Thematic Analysis":
            return [
                {
                    "title": "Inductive Thematic Analysis",
                    "description": f"Data-driven thematic analysis to explore {request.final_thesis}",
                    "approach": "Bottom-up coding and theme development from source materials",
                    "source_focus": f"Systematic coding of {', '.join(request.source_categories)} to identify emergent themes",
                    "structure_alignment": f"Theme-based structure organizing findings by identified patterns"
                },
                {
                    "title": "Deductive Thematic Analysis",
                    "description": f"Theory-driven thematic analysis to test {request.final_thesis}",
                    "approach": "Top-down coding using predetermined theoretical framework",
                    "source_focus": f"Targeted analysis of {', '.join(request.source_categories)} using theoretical lens",
                    "structure_alignment": f"Theory-guided structure aligning themes with theoretical framework"
                },
                {
                    "title": "Hybrid Thematic Analysis",
                    "description": f"Combined inductive-deductive thematic analysis for {request.final_thesis}",
                    "approach": "Mixed approach combining data-driven and theory-driven coding",
                    "source_focus": f"Comprehensive analysis of {', '.join(request.source_categories)} using multiple perspectives",
                    "structure_alignment": f"Integrated structure balancing emergent and theoretical themes"
                }
            ]
        # Add more qualitative sub-methodologies as needed
        else:
            return [
                {
                    "title": f"{methodology_name} Documentary Analysis",
                    "description": f"Systematic {methodology_name.lower()} analysis of documents to support {request.final_thesis}",
                    "approach": f"Comprehensive {methodology_name.lower()} examination of available source materials",
                    "source_focus": f"Focus on {', '.join(request.source_categories)} using {methodology_name.lower()} techniques",
                    "structure_alignment": f"{methodology_name} structure appropriate for {request.paper_type}"
                },
                {
                    "title": f"Interpretive {methodology_name}",
                    "description": f"Interpretive approach using {methodology_name.lower()} methods for {request.final_thesis}",
                    "approach": f"Interpretive analysis using {methodology_name.lower()} frameworks",
                    "source_focus": f"Deep analysis of {', '.join(request.source_categories)} through interpretive lens",
                    "structure_alignment": f"Interpretive structure supporting {methodology_name.lower()} findings"
                },
                {
                    "title": f"Comprehensive {methodology_name}",
                    "description": f"Full {methodology_name.lower()} methodology to address {request.final_thesis}",
                    "approach": f"Complete implementation of {methodology_name.lower()} techniques and procedures",
                    "source_focus": f"Systematic use of all {', '.join(request.source_categories)} categories",
                    "structure_alignment": f"Traditional {methodology_name.lower()} structure for {request.paper_type}"
                }
            ]
    
    elif request.methodology_type == "literature_review":
        if sub_methodology_name == "Systematic Review":
            return [
                {
                    "title": "PRISMA-Guided Systematic Review",
                    "description": f"Systematic review following PRISMA guidelines to examine {request.final_thesis}",
                    "approach": "Structured search, screening, and synthesis following systematic review protocols",
                    "source_focus": f"Systematic inclusion of {', '.join(request.source_categories)} based on inclusion criteria",
                    "structure_alignment": f"PRISMA-compliant structure with methodology, results, and discussion sections"
                },
                {
                    "title": "Narrative Systematic Review",
                    "description": f"Narrative synthesis within systematic review framework for {request.final_thesis}",
                    "approach": "Systematic search with narrative synthesis of findings",
                    "source_focus": f"Comprehensive narrative synthesis of {', '.join(request.source_categories)}",
                    "structure_alignment": f"Systematic review structure with narrative synthesis presentation"
                },
                {
                    "title": "Thematic Systematic Review",
                    "description": f"Thematically organized systematic review addressing {request.final_thesis}",
                    "approach": "Systematic search with thematic organization of findings",
                    "source_focus": f"Thematic grouping of {', '.join(request.source_categories)} by key themes",
                    "structure_alignment": f"Theme-based systematic review structure"
                }
            ]
        # Add more literature review sub-methodologies as needed
        else:
            return [
                {
                    "title": f"{methodology_name} Synthesis",
                    "description": f"Comprehensive {methodology_name.lower()} to synthesize knowledge about {request.final_thesis}",
                    "approach": f"Systematic collection and synthesis using {methodology_name.lower()} methods",
                    "source_focus": f"Comprehensive coverage of {', '.join(request.source_categories)}",
                    "structure_alignment": f"Traditional {methodology_name.lower()} structure for {request.paper_type}"
                },
                {
                    "title": f"Critical {methodology_name}",
                    "description": f"Critical examination through {methodology_name.lower()} of {request.final_thesis}",
                    "approach": f"Critical analysis and evaluation using {methodology_name.lower()} framework",
                    "source_focus": f"Critical evaluation of {', '.join(request.source_categories)}",
                    "structure_alignment": f"Critical analysis structure for {request.paper_type}"
                },
                {
                    "title": f"Integrative {methodology_name}",
                    "description": f"Integrative {methodology_name.lower()} combining multiple perspectives on {request.final_thesis}",
                    "approach": f"Integration of diverse sources using {methodology_name.lower()} techniques",
                    "source_focus": f"Integrative analysis of all {', '.join(request.source_categories)}",
                    "structure_alignment": f"Integrative structure supporting comprehensive analysis"
                }
            ]
    
    # Add more methodology types as needed (quantitative, mixed_methods)
    
    # Default fallback
    return [
        {
            "title": f"{methodology_name} Approach",
            "description": f"Systematic {methodology_name.lower()} analysis to address {request.final_thesis}",
            "approach": f"Comprehensive {methodology_name.lower()} methodology implementation",
            "source_focus": f"Strategic use of {', '.join(request.source_categories)} through {methodology_name.lower()} lens",
            "structure_alignment": f"{methodology_name} structure aligned with {request.paper_type} requirements"
        },
        {
            "title": f"Enhanced {methodology_name}",
            "description": f"Advanced {methodology_name.lower()} approach for {request.final_thesis}",
            "approach": f"Enhanced {methodology_name.lower()} techniques and analysis",
            "source_focus": f"Optimized use of {', '.join(request.source_categories)}",
            "structure_alignment": f"Advanced {methodology_name.lower()} structure"
        },
        {
            "title": f"Integrated {methodology_name}",
            "description": f"Integrated {methodology_name.lower()} methodology for {request.final_thesis}",
            "approach": f"Comprehensive integration of {methodology_name.lower()} methods",
            "source_focus": f"Integrated analysis of all {', '.join(request.source_categories)}",
            "structure_alignment": f"Integrated structure supporting {methodology_name.lower()} findings"
        }
    ]