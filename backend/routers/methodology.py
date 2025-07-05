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
            id="literature_review",
            name="Literature-Based Review",
            description="An approach that systematically collects, reads, appraises, and synthesizes existing scholarship (e.g., peer-reviewed articles, books, reports) to summarize the state of knowledge on a specific question or topic.",
            sub_methodologies=[
                MethodologyOption(id="narrative_review", name="Narrative (Traditional) Review", description="Broad, unsystematic overview of a topic, often organized thematically or chronologically."),
                MethodologyOption(id="systematized_review", name="Systematized Review", description="Incorporates some systematic-review steps (e.g., structured search) but without full appraisal and synthesis."),
                MethodologyOption(id="systematic_review", name="Systematic Review", description="Fully protocolled process of search, appraisal, and synthesis."),
                MethodologyOption(id="scoping_review", name="Scoping Review", description="Maps key concepts and gaps without formal quality assessment."),
                MethodologyOption(id="rapid_review", name="Rapid Review", description="Streamlined methods for quicker turnaround."),
                MethodologyOption(id="umbrella_review", name="Umbrella Review", description="Synthesizes findings from multiple systematic reviews."),
                MethodologyOption(id="integrative_review", name="Integrative Review", description="Combines experimental and non-experimental studies for holistic insight."),
                MethodologyOption(id="critical_review", name="Critical Review", description="Evaluates methodological rigor and theoretical contributions."),
                MethodologyOption(id="evidence_mapping", name="Evidence Mapping (Mapping Review)", description="Visual/tabular mapping of study characteristics and research clusters."),
                MethodologyOption(id="meta_analysis", name="Meta-Analysis", description="Statistical pooling of quantitative effect sizes across studies."),
                MethodologyOption(id="meta_synthesis", name="Meta-Synthesis", description="Aggregates qualitative findings into higher-order interpretations."),
                MethodologyOption(id="state_of_art", name="State-of-the-Art Review", description="Focuses on the very latest developments and frontiers in a field."),
                MethodologyOption(id="state_of_science", name="State-of-the-Science Review", description="Assesses the current level of empirical evidence on a topic."),
                MethodologyOption(id="conceptual_review", name="Conceptual Review", description="Clarifies and refines key concepts, definitions, and theoretical frameworks."),
                MethodologyOption(id="theoretical_review", name="Theoretical Review", description="Critically examines and compares existing theories and models.")
            ]
        ),
        MethodologyOption(
            id="quantitative",
            name="Quantitative Analysis",
            description="An approach focused on measuring and analyzing variables numerically to test hypotheses and estimate relationships or effects. It relies on structured instruments and statistical procedures to produce generalizable findings.",
            sub_methodologies=[
                MethodologyOption(id="experimental", name="Experimental & Quasi-Experimental Designs", description="Randomized controlled trials, true experiments, and quasi-experiments with control groups."),
                MethodologyOption(id="survey_observational", name="Survey & Observational Designs", description="Cross-sectional surveys, longitudinal studies, cohort studies, and case-control studies."),
                MethodologyOption(id="descriptive_correlational", name="Descriptive & Correlational Designs", description="Descriptive research, correlational studies, and exploratory data analysis."),
                MethodologyOption(id="statistical_techniques", name="Core Statistical Techniques", description="Descriptive statistics, inferential statistics, hypothesis testing, and ANOVA."),
                MethodologyOption(id="regression_models", name="Regression & Generalized Models", description="Linear regression, logistic regression, and generalized linear models."),
                MethodologyOption(id="multivariate", name="Multivariate & Latent-Variable Techniques", description="Factor analysis, cluster analysis, structural equation modeling, and multilevel modeling."),
                MethodologyOption(id="time_series", name="Time-Series & Longitudinal Analysis", description="ARIMA models, growth curve modeling, and longitudinal data analysis."),
                MethodologyOption(id="survival_analysis", name="Survival & Event-History Analysis", description="Kaplan-Meier estimation, Cox proportional hazards, and parametric survival models."),
                MethodologyOption(id="meta_analysis_quant", name="Meta-Analysis & Meta-Regression", description="Effect-size computation, forest plots, and meta-regression analysis."),
                MethodologyOption(id="bayesian", name="Bayesian & Simulation Methods", description="Bayesian inference, Monte Carlo simulation, and bootstrapping methods."),
                MethodologyOption(id="econometric", name="Econometric Techniques", description="Instrumental variables, difference-in-differences, and panel data models."),
                MethodologyOption(id="bibliometric", name="Bibliometric & Network Analysis", description="Citation analysis, co-authorship networks, and keyword co-occurrence mapping.")
            ]
        ),
        MethodologyOption(
            id="qualitative",
            name="Qualitative Analysis",
            description="An approach centered on understanding meanings, experiences, and social contexts by collecting and interpreting non-numeric data through methods such as thematic analysis, grounded theory, and ethnography.",
            sub_methodologies=[
                MethodologyOption(id="qual_synthesis", name="Qualitative Evidence Synthesis Methods", description="Meta-synthesis, meta-ethnography, and critical interpretive synthesis."),
                MethodologyOption(id="qual_review", name="Review Designs & Typologies", description="Qualitative systematic reviews, scoping reviews, and integrative reviews."),
                MethodologyOption(id="conceptual_theoretical", name="Conceptual & Theoretical Reviews", description="Conceptual reviews, theoretical reviews, and state-of-the-art assessments.")
            ]
        ),
        MethodologyOption(
            id="mixed_methods",
            name="Mixed Methods",
            description="An integrative approach that deliberately combines both qualitative and quantitative strategies within a single study to capitalize on their complementary strengths.",
            sub_methodologies=[
                MethodologyOption(id="sequential_concurrent", name="Core Sequential & Concurrent Designs", description="Convergent parallel, explanatory sequential, and exploratory sequential designs."),
                MethodologyOption(id="embedded_multiphase", name="Embedded & Multiphase Designs", description="Complex, programmatic approaches for multi-stage or nested integration."),
                MethodologyOption(id="transformative", name="Transformative & Pragmatic Designs", description="Social-justice frameworks and pragmatic 'what works' approaches."),
                MethodologyOption(id="participatory", name="Participatory, Action & Evaluation Hybrids", description="Community engagement and immediate practice change focus."),
                MethodologyOption(id="specialized", name="Specialized & Emerging Mixed Designs", description="Instrument development, case-study mixed methods, and multilevel approaches.")
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