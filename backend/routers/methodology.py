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
                description="An approach focused on measuring and analyzing variables numerically to test hypotheses and estimate relationships or effects. Best suited for data-rich research with statistical analysis needs."
            ),
            MethodologyOption(
                id="qualitative",
                name="Qualitative Analysis", 
                description="An approach centered on understanding meanings, experiences, and social contexts through systematic analysis of textual and documentary sources."
            ),
            MethodologyOption(
                id="literature_review",
                name="Literature-Based Review",
                description="A systematic approach to collecting, analyzing, and synthesizing existing scholarship. Perfectly suited for RAG/LLM-based research and comprehensive source analysis."
            ),
            MethodologyOption(
                id="mixed_methods",
                name="Mixed Methods",
                description="An integrative approach that combines multiple analytical strategies to provide comprehensive analysis through diverse source types and analytical techniques."
            )
        ]
        
        # Find the selected methodology (no sub-methodology needed)
        selected_methodology_obj = None
        
        for methodology in methodologies:
            if methodology.id == request.methodology_type:
                selected_methodology_obj = methodology
                break
        
        if not selected_methodology_obj:
            raise HTTPException(status_code=400, detail=f"Methodology type '{request.methodology_type}' not found")
        
        methodology_name = selected_methodology_obj.name
        methodology_description = selected_methodology_obj.description
        
        # Enhanced methodology generation prompt (no sub-methodology)
        methodology_prompt = f"""
        Generate 3 distinct {methodology_name} methodology approaches for this research paper. Each methodology must be a clear variation of {methodology_name} with distinct characteristics.

        RESEARCH CONTEXT:
        - Thesis Statement: "{request.final_thesis}"
        - Paper Type: {request.paper_type}
        - Paper Purpose: {request.paper_purpose}
        - Paper Tone: {request.paper_tone}
        - Paper Structure: {request.paper_structure}
        - Page Count: {request.page_count} pages
        - Available Source Categories: {', '.join(request.source_categories)}

        METHODOLOGY REQUIREMENTS:
        - Must be {methodology_name} approach only
        - Must clearly articulate HOW the thesis will be proven/supported using {methodology_name} methods
        - Must align with {request.paper_type} paper requirements
        - Must strategically utilize the available source categories
        - Must be appropriate for {request.page_count} page length

        Generate exactly 3 methodologies with these DISTINCT characteristics:
        1. **FOCUSED APPROACH**: Targeted {methodology_name} method with narrow, precise focus on specific thesis aspects
        2. **COMPREHENSIVE APPROACH**: Broad {methodology_name} method covering multiple dimensions and comprehensive analysis
        3. **INNOVATIVE APPROACH**: Creative {methodology_name} method with unique perspective or novel application

        Return exactly 3 methodologies in this JSON format:
        [
          {{
            "title": "Focused {methodology_name}: [Specific Focus Area]",
            "description": "Targeted {methodology_name} approach that focuses specifically on [key thesis aspect]",
            "approach": "Detailed step-by-step {methodology_name} process with narrow focus, explaining specific techniques and procedures for targeted analysis",
            "source_focus": "Strategic use of {', '.join(request.source_categories)} with primary focus on sources most relevant to targeted analysis",
            "structure_alignment": "Focused structure within {request.paper_type} format that supports targeted {methodology_name} analysis",
            "methodology_type": "Focused"
          }},
          {{
            "title": "Comprehensive {methodology_name}: [Broad Analysis Scope]", 
            "description": "Broad {methodology_name} approach that addresses multiple dimensions of the thesis",
            "approach": "Multi-faceted {methodology_name} implementation covering various aspects systematically and comprehensively",
            "source_focus": "Comprehensive utilization of all {', '.join(request.source_categories)} to ensure complete analytical coverage",
            "structure_alignment": "Comprehensive structure within {request.paper_type} format supporting thorough {methodology_name} analysis",
            "methodology_type": "Comprehensive"
          }},
          {{
            "title": "Innovative {methodology_name}: [Creative Application]",
            "description": "Creative {methodology_name} approach offering unique perspective or novel application",
            "approach": "Novel application of {methodology_name} techniques with creative or innovative elements",
            "source_focus": "Creative integration of {', '.join(request.source_categories)} using innovative {methodology_name} techniques",
            "structure_alignment": "Innovative structure within {request.paper_type} framework that enhances analysis through creative methodology",
            "methodology_type": "Innovative"
          }}
        ]

        Return only the JSON array, no additional text.
        """
        
        response = invoke_bedrock(methodology_prompt)
        
        if not response or not response.strip():
            # Create default methodologies based on primary methodology only
            methodologies_data = create_primary_methodology_defaults(selected_methodology_obj, request)
        else:
            # Clean and parse the response
            response_cleaned = response.strip()
            json_start = response_cleaned.find('[')
            json_end = response_cleaned.rfind(']') + 1
            
            if json_start == -1 or json_end == -1:
                methodologies_data = create_primary_methodology_defaults(selected_methodology_obj, request)
            else:
                methodologies_json = response_cleaned[json_start:json_end]
                
                try:
                    methodologies_data = json.loads(methodologies_json)
                except json.JSONDecodeError:
                    methodologies_data = create_primary_methodology_defaults(selected_methodology_obj, request)
        
        # Convert to GeneratedMethodology objects
        methodologies = []
        for m in methodologies_data:
            methodology = GeneratedMethodology(
                title=str(m.get("title", "Untitled Methodology")),
                description=str(m.get("description", "No description available")),
                approach=str(m.get("approach", "No approach specified")),
                source_focus=str(m.get("source_focus", "No source focus specified")),
                structure_alignment=str(m.get("structure_alignment", "No structure alignment specified")),
                methodology_type=str(m.get("methodology_type", "Focused"))
            )
            methodologies.append(methodology)
        
        selected_info = {
            "methodology_type": request.methodology_type,
            "methodology_name": methodology_name,
            "sub_methodology": None,  # Always None now
            "sub_methodology_name": None,  # Always None now
            "source_categories": request.source_categories,
            "paper_type": request.paper_type,
            "paper_purpose": request.paper_purpose
        }
        
        return MethodologyGenerationResponse(
            methodologies=methodologies,
            selected_methodology_info=selected_info
        )
        
    except Exception as e:
        print(f"Error in generate_methodology_options: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating methodologies: {str(e)}")


def create_primary_methodology_defaults(selected_methodology_obj, request):
    """Create default methodologies based on primary methodology only"""
    methodology_name = selected_methodology_obj.name
    thesis_key_concept = " ".join(request.final_thesis.split()[:5]) + "..." if len(request.final_thesis.split()) > 5 else request.final_thesis
    
    if request.methodology_type == "qualitative":
        return [
            {
                "title": f"Focused Qualitative Analysis: Targeted Examination of {thesis_key_concept}",
                "description": f"Targeted qualitative methodology that focuses specifically on key evidence patterns supporting {request.final_thesis}",
                "approach": f"Systematic qualitative analysis using focused coding and thematic identification to target specific aspects of the thesis. The methodology employs selective data collection and analysis techniques to build concentrated evidence supporting the central argument through precise qualitative examination.",
                "source_focus": f"Strategic analysis of {', '.join(request.source_categories[:2]) if len(request.source_categories) >= 2 else ', '.join(request.source_categories)} with primary focus on sources most directly relevant to thesis validation through qualitative evidence extraction.",
                "structure_alignment": f"Focused qualitative structure within {request.paper_type} format: targeted methodology, concentrated analysis, specific evidence presentation, precise thesis validation.",
                "methodology_type": "Focused"
            },
            {
                "title": f"Comprehensive Qualitative Analysis: Multi-Dimensional Examination of {thesis_key_concept}",
                "description": f"Broad qualitative methodology that addresses multiple dimensions and contexts relevant to {request.final_thesis}",
                "approach": f"Multi-faceted qualitative implementation using diverse analytical techniques including thematic analysis, content analysis, and interpretive examination to provide comprehensive support for the thesis through systematic qualitative investigation across multiple dimensions.",
                "source_focus": f"Comprehensive utilization of all {', '.join(request.source_categories)} to ensure complete qualitative coverage, with systematic analysis across all source types to build comprehensive thesis support through diverse qualitative evidence.",
                "structure_alignment": f"Comprehensive qualitative structure within {request.paper_type} format: multi-method approach, systematic analysis across dimensions, integrated evidence synthesis, thorough thesis validation.",
                "methodology_type": "Comprehensive"
            },
            {
                "title": f"Innovative Qualitative Analysis: Creative Interpretation of {thesis_key_concept}",
                "description": f"Creative qualitative methodology offering unique analytical perspective on {request.final_thesis} through innovative interpretive techniques",
                "approach": f"Novel application of qualitative techniques combining traditional methods with creative analytical approaches such as narrative construction, metaphorical analysis, or interpretive synthesis to provide fresh insights supporting the thesis through innovative qualitative investigation.",
                "source_focus": f"Creative integration of {', '.join(request.source_categories)} using innovative qualitative techniques to reveal new interpretive patterns and insights that strengthen thesis support through novel analytical perspectives.",
                "structure_alignment": f"Innovative qualitative structure within {request.paper_type} framework: creative methodology explanation, novel analytical process, unique insights presentation, innovative thesis validation.",
                "methodology_type": "Innovative"
            }
        ]
    
    elif request.methodology_type == "quantitative":
        return [
            {
                "title": f"Focused Quantitative Analysis: Statistical Testing of {thesis_key_concept}",
                "description": f"Targeted quantitative methodology that focuses specifically on statistical relationships supporting {request.final_thesis}",
                "approach": f"Precise statistical analysis using focused hypothesis testing and targeted quantitative techniques to examine specific numerical relationships that support the thesis. The methodology employs selective statistical methods to build concentrated empirical evidence for the central argument.",
                "source_focus": f"Strategic analysis of {', '.join(request.source_categories[:2]) if len(request.source_categories) >= 2 else ', '.join(request.source_categories)} with primary focus on quantitative data sources most directly relevant to statistical thesis validation.",
                "structure_alignment": f"Focused quantitative structure within {request.paper_type} format: targeted statistical methodology, concentrated analysis, specific empirical evidence, precise thesis validation.",
                "methodology_type": "Focused"
            },
            {
                "title": f"Comprehensive Quantitative Analysis: Multi-Variable Examination of {thesis_key_concept}",
                "description": f"Broad quantitative methodology that addresses multiple statistical dimensions relevant to {request.final_thesis}",
                "approach": f"Multi-faceted quantitative implementation using diverse statistical techniques including descriptive analysis, inferential testing, and predictive modeling to provide comprehensive empirical support for the thesis through systematic quantitative investigation.",
                "source_focus": f"Comprehensive utilization of all {', '.join(request.source_categories)} containing quantitative data to ensure complete statistical coverage and build comprehensive thesis support through diverse numerical evidence.",
                "structure_alignment": f"Comprehensive quantitative structure within {request.paper_type} format: multi-method statistical approach, systematic analysis across variables, integrated empirical synthesis, thorough thesis validation.",
                "methodology_type": "Comprehensive"
            },
            {
                "title": f"Innovative Quantitative Analysis: Advanced Statistical Modeling of {thesis_key_concept}",
                "description": f"Creative quantitative methodology offering unique statistical perspective on {request.final_thesis} through advanced analytical techniques",
                "approach": f"Novel application of quantitative techniques combining traditional statistics with advanced methods such as machine learning algorithms, predictive modeling, or complex multivariate analysis to provide innovative empirical insights supporting the thesis.",
                "source_focus": f"Creative integration of {', '.join(request.source_categories)} using advanced quantitative techniques to reveal new statistical patterns and relationships that strengthen thesis support through innovative analytical methods.",
                "structure_alignment": f"Innovative quantitative structure within {request.paper_type} framework: advanced methodology explanation, novel statistical process, unique empirical insights, innovative thesis validation.",
                "methodology_type": "Innovative"
            }
        ]
    
    elif request.methodology_type == "literature_review":
        return [
            {
                "title": f"Focused Literature Review: Targeted Synthesis of {thesis_key_concept}",
                "description": f"Targeted literature review methodology that focuses specifically on scholarship directly supporting {request.final_thesis}",
                "approach": f"Systematic literature collection and analysis focusing on sources most directly relevant to thesis validation. The methodology employs strategic search criteria and selective synthesis to build concentrated evidence supporting the central argument through focused scholarly examination.",
                "source_focus": f"Strategic analysis of {', '.join(request.source_categories[:2]) if len(request.source_categories) >= 2 else ', '.join(request.source_categories)} with primary focus on literature most directly relevant to thesis validation through systematic scholarly synthesis.",
                "structure_alignment": f"Focused literature review structure within {request.paper_type} format: targeted search methodology, concentrated analysis, specific scholarly evidence, precise thesis validation.",
                "methodology_type": "Focused"
            },
            {
                "title": f"Comprehensive Literature Review: Multi-Perspective Synthesis of {thesis_key_concept}",
                "description": f"Broad literature review methodology that addresses multiple scholarly perspectives relevant to {request.final_thesis}",
                "approach": f"Multi-faceted literature review implementation using systematic search, comprehensive analysis, and integrated synthesis to provide thorough scholarly support for the thesis through systematic examination of diverse academic perspectives and evidence.",
                "source_focus": f"Comprehensive utilization of all {', '.join(request.source_categories)} to ensure complete scholarly coverage, with systematic analysis across all literature types to build comprehensive thesis support through diverse academic evidence.",
                "structure_alignment": f"Comprehensive literature review structure within {request.paper_type} format: systematic search methodology, multi-perspective analysis, integrated scholarly synthesis, thorough thesis validation.",
                "methodology_type": "Comprehensive"
            },
            {
                "title": f"Innovative Literature Review: Creative Synthesis of {thesis_key_concept}",
                "description": f"Creative literature review methodology offering unique scholarly perspective on {request.final_thesis} through innovative synthesis techniques",
                "approach": f"Novel application of literature review techniques combining traditional systematic review with creative synthesis methods such as meta-narrative analysis, interpretive synthesis, or cross-disciplinary integration to provide fresh scholarly insights supporting the thesis.",
                "source_focus": f"Creative integration of {', '.join(request.source_categories)} using innovative literature review techniques to reveal new scholarly patterns and connections that strengthen thesis support through novel synthesis approaches.",
                "structure_alignment": f"Innovative literature review structure within {request.paper_type} framework: creative methodology explanation, novel synthesis process, unique scholarly insights, innovative thesis validation.",
                "methodology_type": "Innovative"
            }
        ]
    
    elif request.methodology_type == "mixed_methods":
        return [
            {
                "title": f"Focused Mixed Methods Analysis: Targeted Integration of {thesis_key_concept}",
                "description": f"Targeted mixed methods methodology that focuses specifically on key quantitative-qualitative integration supporting {request.final_thesis}",
                "approach": f"Strategic integration of quantitative and qualitative approaches focusing on specific aspects of thesis validation. The methodology combines targeted statistical analysis with focused qualitative investigation to build concentrated mixed-methods evidence for the central argument.",
                "source_focus": f"Strategic analysis of {', '.join(request.source_categories[:2]) if len(request.source_categories) >= 2 else ', '.join(request.source_categories)} using both quantitative and qualitative lenses focused on sources most relevant to integrated thesis validation.",
                "structure_alignment": f"Focused mixed methods structure within {request.paper_type} format: targeted integration methodology, concentrated analysis, specific mixed-evidence presentation, precise thesis validation.",
                "methodology_type": "Focused"
            },
            {
                "title": f"Comprehensive Mixed Methods Analysis: Multi-Dimensional Integration of {thesis_key_concept}",
                "description": f"Broad mixed methods methodology that addresses multiple dimensions through systematic quantitative-qualitative integration relevant to {request.final_thesis}",
                "approach": f"Multi-faceted mixed methods implementation using comprehensive quantitative analysis combined with thorough qualitative investigation to provide complete integrated support for the thesis through systematic mixed-methods examination across multiple dimensions.",
                "source_focus": f"Comprehensive utilization of all {', '.join(request.source_categories)} using both quantitative and qualitative approaches to ensure complete mixed-methods coverage and build comprehensive thesis support through diverse integrated evidence.",
                "structure_alignment": f"Comprehensive mixed methods structure within {request.paper_type} format: systematic integration methodology, multi-dimensional analysis, integrated evidence synthesis, thorough thesis validation.",
                "methodology_type": "Comprehensive"
            },
            {
                "title": f"Innovative Mixed Methods Analysis: Creative Integration of {thesis_key_concept}",
                "description": f"Creative mixed methods methodology offering unique integrated perspective on {request.final_thesis} through innovative analytical combination",
                "approach": f"Novel application of mixed methods techniques combining quantitative and qualitative approaches in creative ways such as transformative frameworks, participatory methods, or innovative integration strategies to provide fresh insights supporting the thesis.",
                "source_focus": f"Creative integration of {', '.join(request.source_categories)} using innovative mixed methods techniques to reveal new integrated patterns and insights that strengthen thesis support through novel analytical combinations.",
                "structure_alignment": f"Innovative mixed methods structure within {request.paper_type} framework: creative integration explanation, novel mixed-methods process, unique integrated insights, innovative thesis validation.",
                "methodology_type": "Innovative"
            }
        ]
    
    # Default fallback
    return create_generic_primary_methodologies(methodology_name, request)

def create_generic_primary_methodologies(methodology_name, request):
    """Generic fallback for primary methodologies"""
    thesis_key_concept = " ".join(request.final_thesis.split()[:5]) + "..." if len(request.final_thesis.split()) > 5 else request.final_thesis
    
    return [
        {
            "title": f"Focused {methodology_name}: Targeted Analysis of {thesis_key_concept}",
            "description": f"Targeted {methodology_name.lower()} methodology focusing specifically on key aspects supporting {request.final_thesis}",
            "approach": f"Systematic {methodology_name.lower()} analysis with focused scope, employing targeted techniques to build concentrated evidence supporting the central argument through precise analytical examination.",
            "source_focus": f"Strategic analysis of {', '.join(request.source_categories[:2]) if len(request.source_categories) >= 2 else ', '.join(request.source_categories)} with primary focus on sources most relevant to targeted thesis validation.",
            "structure_alignment": f"Focused {methodology_name.lower()} structure within {request.paper_type} format supporting targeted analysis and precise thesis validation.",
            "methodology_type": "Focused"
        },
        {
            "title": f"Comprehensive {methodology_name}: Multi-Dimensional Analysis of {thesis_key_concept}",
            "description": f"Broad {methodology_name.lower()} methodology addressing multiple dimensions relevant to {request.final_thesis}",
            "approach": f"Multi-faceted {methodology_name.lower()} implementation using diverse techniques to provide comprehensive support for the thesis through systematic examination across multiple dimensions and perspectives.",
            "source_focus": f"Comprehensive utilization of all {', '.join(request.source_categories)} to ensure complete analytical coverage and build comprehensive thesis support through diverse evidence types.",
            "structure_alignment": f"Comprehensive {methodology_name.lower()} structure within {request.paper_type} format supporting thorough analysis and complete thesis validation.",
            "methodology_type": "Comprehensive"
        },
        {
            "title": f"Innovative {methodology_name}: Creative Analysis of {thesis_key_concept}",
            "description": f"Creative {methodology_name.lower()} methodology offering unique perspective on {request.final_thesis} through innovative analytical approaches",
            "approach": f"Novel application of {methodology_name.lower()} techniques combining traditional methods with creative approaches to provide fresh insights supporting the thesis through innovative analytical investigation.",
            "source_focus": f"Creative integration of {', '.join(request.source_categories)} using innovative {methodology_name.lower()} techniques to reveal new patterns and insights strengthening thesis support.",
            "structure_alignment": f"Innovative {methodology_name.lower()} structure within {request.paper_type} framework supporting creative analysis and innovative thesis validation.",
            "methodology_type": "Innovative"
        }
    ]

# Keep existing functions but mark them as unused
def create_enhanced_default_methodologies(selected_methodology_obj, selected_sub_methodology_obj, request):
    """UNUSED - Keep for backwards compatibility but redirect to primary-only methodologies"""
    return create_primary_methodology_defaults(selected_methodology_obj, request)
