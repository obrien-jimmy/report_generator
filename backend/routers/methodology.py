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
                    MethodologyOption(id="mixed_methods_systematic_review", name="Mixed-Methods Systematic Review", description="Systematic review incorporating both quantitative and qualitative syntheses. Excellent RAG compatibility.", rank=3)
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
        
        # Enhanced methodology generation prompt
        methodology_prompt = f"""
        Generate 3 highly specific {methodology_name} methodology approaches for this research paper. Each methodology must be a distinct variation of {methodology_name}{f' using {sub_methodology_name} methods' if selected_sub_methodology_obj else ''}.

        RESEARCH CONTEXT:
        - Thesis Statement: "{request.final_thesis}"
        - Paper Type: {request.paper_type}
        - Paper Purpose: {request.paper_purpose}
        - Paper Tone: {request.paper_tone}
        - Paper Structure: {request.paper_structure}
        - Page Count: {request.page_count} pages
        - Available Source Categories: {', '.join(request.source_categories)}

        METHODOLOGY REQUIREMENTS:
        - Must be {methodology_name}{f' specifically using {sub_methodology_name} approach' if selected_sub_methodology_obj else ''}
        - Must clearly articulate HOW the thesis will be proven/supported
        - Must align with {request.paper_type} paper requirements
        - Must strategically utilize the available source categories
        - Must be appropriate for {request.page_count} page length

        CRITICAL FOCUS: Each methodology must explain the specific analytical process that will demonstrate or support the thesis statement within the constraints of a {request.paper_type} paper.

        Generate 3 methodologies with these characteristics:
        1. FOCUSED APPROACH: Targeted {methodology_name} method with clear thesis connection
        2. COMPREHENSIVE APPROACH: Broad {methodology_name} method covering multiple aspects
        3. INNOVATIVE APPROACH: Creative {methodology_name} method with unique perspective

        Return exactly 3 methodologies in this JSON format:
        [
          {{
            "title": "Focused [Specific Method Name] for [Thesis Key Concept]",
            "description": "Concise explanation of how this {methodology_name} approach will specifically prove/support the thesis",
            "approach": "Detailed step-by-step {methodology_name} process explaining HOW the thesis will be demonstrated, including specific analytical techniques and procedures",
            "source_focus": "Precise explanation of which source categories will be used for what purpose in proving the thesis, with clear rationale for each category's role",
            "structure_alignment": "Specific explanation of how this {methodology_name} approach fits within {request.paper_type} structure and contributes to {request.paper_purpose}"
          }},
          {{
            "title": "Comprehensive [Method Variation] Addressing [Thesis Scope]",
            "description": "Broad {methodology_name} approach explaining comprehensive thesis support strategy",
            "approach": "Multi-faceted {methodology_name} implementation detailing how different aspects of the thesis will be addressed systematically",
            "source_focus": "Strategic utilization of all available source categories with clear methodology for how each contributes to thesis validation",
            "structure_alignment": "Integration with {request.paper_type} format showing how comprehensive analysis supports {request.paper_purpose}"
          }},
          {{
            "title": "Innovative [Creative Method Name] for [Thesis Innovation]",
            "description": "Creative {methodology_name} approach offering unique perspective on thesis validation",
            "approach": "Novel application of {methodology_name} techniques specifically designed to address unique aspects of the thesis",
            "source_focus": "Creative combination of source categories using {methodology_name} methods to reveal new insights supporting the thesis",
            "structure_alignment": "Innovative structure within {request.paper_type} framework that enhances {request.paper_purpose} through creative methodology"
          }}
        ]

        Return only the JSON array, no additional text.
        """
        
        response = invoke_bedrock(methodology_prompt)
        
        if not response or not response.strip():
            # Create default methodologies based on selected methodology
            methodologies_data = create_enhanced_default_methodologies(
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
                methodologies_data = create_enhanced_default_methodologies(
                    selected_methodology_obj, 
                    selected_sub_methodology_obj, 
                    request
                )
            else:
                methodologies_json = response_cleaned[json_start:json_end]
                
                try:
                    methodologies_data = json.loads(methodologies_json)
                except json.JSONDecodeError:
                    methodologies_data = create_enhanced_default_methodologies(
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


def create_enhanced_default_methodologies(selected_methodology_obj, selected_sub_methodology_obj, request):
    """Create enhanced default methodologies based on the selected methodology type with thesis focus"""
    methodology_name = selected_methodology_obj.name
    sub_methodology_name = selected_sub_methodology_obj.name if selected_sub_methodology_obj else None
    
    # Extract key concepts from thesis for more targeted approaches
    thesis_words = request.final_thesis.split()
    thesis_key_concept = " ".join(thesis_words[:5]) + "..." if len(thesis_words) > 5 else request.final_thesis
    
    if request.methodology_type == "qualitative":
        if sub_methodology_name == "Case Study":
            return [
                {
                    "title": f"Single-Case Study Analysis of {thesis_key_concept}",
                    "description": f"In-depth case study methodology designed to validate {request.final_thesis} through comprehensive single-case examination appropriate for {request.paper_type}",
                    "approach": f"Systematic single-case analysis using triangulation of {', '.join(request.source_categories[:3])} to build evidence supporting the thesis. The methodology will examine the case through multiple lenses, comparing theoretical expectations with empirical evidence to demonstrate thesis validity. Analysis will progress from case description to pattern identification to theoretical implications.",
                    "source_focus": f"Primary documents ({request.source_categories[0] if request.source_categories else 'Academic Sources'}) will establish case context, while {request.source_categories[1] if len(request.source_categories) > 1 else 'secondary sources'} provide comparative framework. {request.source_categories[2] if len(request.source_categories) > 2 else 'Additional sources'} will support triangulation and validation of findings that prove the thesis.",
                    "structure_alignment": f"Case study structure within {request.paper_type} format: case selection justification, comprehensive case description, systematic analysis demonstrating thesis, and implications. This supports {request.paper_purpose} by providing concrete evidence for theoretical claims."
                },
                {
                    "title": f"Comparative Case Study Examination of {thesis_key_concept}",
                    "description": f"Multi-case comparative methodology strategically designed to support {request.final_thesis} through systematic cross-case analysis within {request.paper_type} framework",
                    "approach": f"Comparative analysis of 2-3 carefully selected cases using {methodology_name} techniques to identify patterns that validate the thesis. Each case will be analyzed individually using consistent frameworks, then compared systematically to identify common themes and variations that support the central argument. Cross-case synthesis will demonstrate thesis generalizability.",
                    "source_focus": f"Balanced utilization of {', '.join(request.source_categories)} across all cases to ensure comparative validity. {request.source_categories[0] if request.source_categories else 'Primary sources'} will provide case-specific evidence, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'theoretical sources'} enable cross-case comparison frameworks that strengthen thesis support.",
                    "structure_alignment": f"Comparative structure for {request.paper_type}: individual case analyses followed by systematic comparison demonstrating thesis across contexts. This methodology aligns with {request.paper_purpose} by showing thesis applicability beyond single instances."
                },
                {
                    "title": f"Longitudinal Case Study Tracking {thesis_key_concept}",
                    "description": f"Time-based case study methodology specifically designed to demonstrate {request.final_thesis} through temporal analysis appropriate for {request.paper_type} requirements",
                    "approach": f"Chronological case analysis tracking developments over time to show how the thesis manifests across different periods. The methodology will identify key temporal markers, analyze changes and continuities, and demonstrate how the thesis remains valid across time periods. Longitudinal comparison will reveal patterns supporting the central argument.",
                    "source_focus": f"Temporal organization of {', '.join(request.source_categories)} to show progression and validate thesis across time periods. {request.source_categories[0] if request.source_categories else 'Historical sources'} will establish timeline, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'contemporary sources'} will show current relevance of thesis claims.",
                    "structure_alignment": f"Chronological structure within {request.paper_type} format showing case evolution and continuous thesis validation. This temporal approach supports {request.paper_purpose} by demonstrating thesis durability and ongoing relevance."
                }
            ]
        elif sub_methodology_name == "Thematic Analysis":
            return [
                {
                    "title": f"Inductive Thematic Analysis of {thesis_key_concept}",
                    "description": f"Data-driven thematic analysis methodology designed to discover patterns that support {request.final_thesis} through systematic examination of source materials within {request.paper_type} framework",
                    "approach": f"Bottom-up coding process beginning with open coding of all source materials, progressing through axial coding to identify relationships, and culminating in selective coding around themes that support the thesis. The inductive process will allow evidence to emerge naturally while maintaining focus on thesis validation through discovered patterns.",
                    "source_focus": f"Systematic coding of {', '.join(request.source_categories)} to identify emergent themes supporting the thesis. {request.source_categories[0] if request.source_categories else 'Primary sources'} will provide rich thematic material, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'theoretical sources'} will help interpret emergent themes in relation to thesis claims.",
                    "structure_alignment": f"Theme-based structure for {request.paper_type}: methodology explanation, theme identification process, theme analysis demonstrating thesis, and implications. This inductive approach supports {request.paper_purpose} by grounding thesis arguments in discovered evidence patterns."
                },
                {
                    "title": f"Deductive Thematic Analysis Validating {thesis_key_concept}",
                    "description": f"Theory-driven thematic analysis methodology specifically designed to test and validate {request.final_thesis} through predetermined theoretical framework appropriate for {request.paper_type}",
                    "approach": f"Top-down coding using theoretical framework derived from the thesis to analyze source materials. Predetermined codes based on thesis components will be applied systematically, with analysis focused on confirming or challenging theoretical expectations. The deductive approach will provide structured validation of thesis claims through targeted evidence analysis.",
                    "source_focus": f"Targeted analysis of {', '.join(request.source_categories)} using theoretical framework to validate thesis claims. {request.source_categories[0] if request.source_categories else 'Theoretical sources'} will establish coding framework, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'empirical sources'} will provide evidence for systematic thesis testing.",
                    "structure_alignment": f"Theory-guided structure for {request.paper_type}: theoretical framework establishment, systematic analysis process, thesis validation through evidence, and theoretical implications. This deductive methodology supports {request.paper_purpose} by providing rigorous thesis testing."
                },
                {
                    "title": f"Hybrid Thematic Analysis Exploring {thesis_key_concept}",
                    "description": f"Combined inductive-deductive thematic analysis methodology designed to comprehensively support {request.final_thesis} through both discovery and validation within {request.paper_type} structure",
                    "approach": f"Integrated approach combining data-driven discovery with theory-driven validation to support the thesis. Initial inductive coding will identify emergent themes, followed by deductive analysis using thesis-derived framework to test and refine findings. This hybrid methodology ensures both empirical grounding and theoretical rigor in thesis support.",
                    "source_focus": f"Comprehensive analysis of {', '.join(request.source_categories)} using both inductive and deductive approaches to maximize thesis support. All source categories will be analyzed inductively for theme discovery, then deductively for thesis validation, ensuring robust evidence base for central argument.",
                    "structure_alignment": f"Integrated structure for {request.paper_type}: combined methodology explanation, theme discovery and validation process, comprehensive thesis support through multiple analytical approaches. This hybrid methodology supports {request.paper_purpose} by providing both empirical discovery and theoretical validation."
                }
            ]
        # Add more specific qualitative sub-methodologies
        else:
            return create_generic_qualitative_methodologies(methodology_name, request)
    
    elif request.methodology_type == "literature_review":
        if sub_methodology_name == "Systematic Review":
            return [
                {
                    "title": f"PRISMA-Guided Systematic Review of {thesis_key_concept}",
                    "description": f"Systematic literature review following PRISMA guidelines specifically designed to validate {request.final_thesis} through comprehensive evidence synthesis appropriate for {request.paper_type}",
                    "approach": f"Structured systematic review process including comprehensive search strategy, rigorous inclusion/exclusion criteria, quality assessment, and systematic synthesis focused on thesis validation. PRISMA methodology will ensure transparency and reproducibility while maintaining focus on evidence supporting the central argument.",
                    "source_focus": f"Systematic inclusion of {', '.join(request.source_categories)} based on predetermined criteria directly related to thesis validation. {request.source_categories[0] if request.source_categories else 'Peer-reviewed sources'} will form the primary evidence base, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'grey literature'} will provide complementary evidence for comprehensive thesis support.",
                    "structure_alignment": f"PRISMA-compliant structure for {request.paper_type}: systematic search methodology, study selection process, quality assessment, evidence synthesis demonstrating thesis, and implications. This systematic approach supports {request.paper_purpose} by providing rigorous evidence-based thesis validation."
                },
                {
                    "title": f"Narrative Systematic Review Supporting {thesis_key_concept}",
                    "description": f"Narrative synthesis within systematic review framework specifically designed to support {request.final_thesis} through comprehensive literature analysis within {request.paper_type} structure",
                    "approach": f"Systematic search combined with narrative synthesis focused on thesis validation. The methodology will identify all relevant literature systematically, then synthesize findings narratively to build comprehensive support for the thesis. Narrative approach allows for nuanced interpretation while maintaining systematic rigor.",
                    "source_focus": f"Comprehensive narrative synthesis of {', '.join(request.source_categories)} systematically identified and analyzed for thesis support. Each source category will contribute specific evidence types, with {request.source_categories[0] if request.source_categories else 'primary literature'} providing core evidence and others offering contextual support for thesis validation.",
                    "structure_alignment": f"Systematic review structure with narrative synthesis for {request.paper_type}: search methodology, systematic selection, narrative analysis demonstrating thesis, synthesis conclusions. This approach supports {request.paper_purpose} by combining systematic rigor with interpretive depth."
                },
                {
                    "title": f"Thematic Systematic Review Examining {thesis_key_concept}",
                    "description": f"Thematically organized systematic review methodology designed to validate {request.final_thesis} through systematic thematic analysis within {request.paper_type} framework",
                    "approach": f"Systematic literature identification followed by thematic organization and analysis focused on thesis validation. Literature will be systematically searched and selected, then organized thematically around key thesis components. Thematic synthesis will demonstrate comprehensive support for the central argument across multiple evidence themes.",
                    "source_focus": f"Thematic organization of {', '.join(request.source_categories)} around key thesis components to systematically demonstrate argument support. Each theme will integrate multiple source categories strategically, with {request.source_categories[0] if request.source_categories else 'theoretical sources'} providing framework and others offering empirical support.",
                    "structure_alignment": f"Theme-based systematic review structure for {request.paper_type}: systematic methodology, thematic organization, theme-by-theme thesis validation, integrated conclusions. This thematic approach supports {request.paper_purpose} by organizing evidence systematically around thesis components."
                }
            ]
        # Add more literature review sub-methodologies
        else:
            return create_generic_literature_methodologies(methodology_name, request)
    
    elif request.methodology_type == "quantitative":
        return create_quantitative_methodologies(methodology_name, sub_methodology_name, request)
    
    elif request.methodology_type == "mixed_methods":
        return create_mixed_methods_methodologies(methodology_name, sub_methodology_name, request)
    
    # Default fallback with thesis focus
    return create_generic_methodologies(methodology_name, request)


def create_generic_qualitative_methodologies(methodology_name, request):
    """Create generic qualitative methodologies with thesis focus"""
    thesis_key_concept = " ".join(request.final_thesis.split()[:5]) + "..." if len(request.final_thesis.split()) > 5 else request.final_thesis
    
    return [
        {
            "title": f"Focused {methodology_name} Analysis of {thesis_key_concept}",
            "description": f"Targeted {methodology_name.lower()} methodology designed to validate {request.final_thesis} through systematic qualitative analysis appropriate for {request.paper_type}",
            "approach": f"Systematic {methodology_name.lower()} analysis focusing specifically on evidence that supports or challenges the thesis. The methodology will employ qualitative techniques including coding, pattern identification, and interpretive analysis to build comprehensive support for the central argument through rigorous examination of source materials.",
            "source_focus": f"Strategic analysis of {', '.join(request.source_categories)} using {methodology_name.lower()} techniques to extract evidence supporting thesis validation. Each source category will be analyzed for specific contributions to thesis support, with systematic comparison and synthesis across categories.",
            "structure_alignment": f"Qualitative analysis structure for {request.paper_type}: methodology explanation, systematic analysis process, evidence synthesis supporting thesis, theoretical implications. This focused approach supports {request.paper_purpose} by providing targeted qualitative validation of central argument."
        },
        {
            "title": f"Comprehensive {methodology_name} Examination of {thesis_key_concept}",
            "description": f"Broad {methodology_name.lower()} methodology designed to support {request.final_thesis} through comprehensive qualitative analysis within {request.paper_type} framework",
            "approach": f"Multi-faceted {methodology_name.lower()} implementation examining all aspects of the thesis through systematic qualitative analysis. The comprehensive approach will address thesis components individually and holistically, building cumulative evidence through diverse analytical techniques and perspectives.",
            "source_focus": f"Comprehensive utilization of all {', '.join(request.source_categories)} through {methodology_name.lower()} analysis to build complete thesis support. Each source category will contribute unique evidence types, with systematic integration across categories to provide comprehensive validation of central argument.",
            "structure_alignment": f"Comprehensive qualitative structure for {request.paper_type}: multi-faceted analysis process, systematic thesis examination, integrated evidence synthesis, broad implications. This comprehensive methodology supports {request.paper_purpose} by providing thorough qualitative validation across all thesis aspects."
        },
        {
            "title": f"Innovative {methodology_name} Approach to {thesis_key_concept}",
            "description": f"Creative {methodology_name.lower()} methodology offering unique perspective on {request.final_thesis} validation through innovative qualitative analysis for {request.paper_type}",
            "approach": f"Novel application of {methodology_name.lower()} techniques specifically designed to address unique aspects of thesis validation. The innovative methodology will combine traditional qualitative approaches with creative analytical techniques to provide fresh insights supporting the central argument.",
            "source_focus": f"Creative integration of {', '.join(request.source_categories)} through innovative {methodology_name.lower()} techniques to reveal new insights supporting thesis validation. Novel analytical approaches will extract previously unexplored evidence patterns that strengthen central argument support.",
            "structure_alignment": f"Innovative qualitative structure for {request.paper_type}: creative methodology explanation, novel analysis process, unique insights supporting thesis, innovative implications. This creative approach supports {request.paper_purpose} by providing original perspectives on thesis validation."
        }
    ]

def create_generic_literature_methodologies(methodology_name, request):
    """Create generic literature review methodologies with thesis focus"""
    thesis_key_concept = " ".join(request.final_thesis.split()[:5]) + "..." if len(request.final_thesis.split()) > 5 else request.final_thesis
    
    return [
        {
            "title": f"Systematic {methodology_name} Analysis of {thesis_key_concept}",
            "description": f"Comprehensive {methodology_name.lower()} methodology designed to validate {request.final_thesis} through systematic literature synthesis appropriate for {request.paper_type}",
            "approach": f"Systematic literature collection and analysis focusing specifically on evidence that supports or challenges the thesis. The methodology will employ structured search strategies, critical appraisal, and systematic synthesis to build comprehensive support for the central argument through rigorous examination of existing scholarship.",
            "source_focus": f"Systematic analysis of {', '.join(request.source_categories)} using {methodology_name.lower()} techniques to extract evidence supporting thesis validation. {request.source_categories[0] if request.source_categories else 'Academic literature'} will provide primary evidence base, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'supplementary sources'} will offer contextual support and validation.",
            "structure_alignment": f"Literature review structure for {request.paper_type}: systematic methodology, literature analysis, evidence synthesis supporting thesis, theoretical implications. This systematic approach supports {request.paper_purpose} by providing comprehensive literature-based validation of central argument."
        },
        {
            "title": f"Thematic {methodology_name} Examination of {thesis_key_concept}",
            "description": f"Thematically organized {methodology_name.lower()} methodology designed to support {request.final_thesis} through structured thematic analysis within {request.paper_type} framework",
            "approach": f"Thematic organization of literature around key thesis components, with systematic analysis of each theme to build cumulative evidence supporting the central argument. The methodology will identify major themes in existing literature, analyze each theme's contribution to thesis validation, and synthesize findings across themes.",
            "source_focus": f"Thematic organization of {', '.join(request.source_categories)} around key thesis components to systematically demonstrate argument support. Each source category will contribute to multiple themes, with {request.source_categories[0] if request.source_categories else 'theoretical sources'} providing thematic framework and others offering empirical support within each theme.",
            "structure_alignment": f"Theme-based literature review structure for {request.paper_type}: thematic organization, theme-by-theme analysis, integrated synthesis demonstrating thesis, comprehensive conclusions. This thematic approach supports {request.paper_purpose} by organizing evidence systematically around thesis components."
        },
        {
            "title": f"Critical {methodology_name} Evaluation of {thesis_key_concept}",
            "description": f"Critical evaluation {methodology_name.lower()} methodology offering analytical perspective on {request.final_thesis} validation through rigorous literature critique for {request.paper_type}",
            "approach": f"Critical analysis of existing literature to evaluate evidence quality, identify gaps, and build strong support for the thesis through rigorous scholarly critique. The methodology will assess methodological strengths and limitations, evaluate theoretical contributions, and synthesize high-quality evidence supporting the central argument.",
            "source_focus": f"Critical evaluation of {', '.join(request.source_categories)} through rigorous {methodology_name.lower()} analysis to ensure high-quality thesis support. {request.source_categories[0] if request.source_categories else 'Peer-reviewed sources'} will undergo methodological critique, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'additional sources'} will provide supplementary evidence after quality assessment.",
            "structure_alignment": f"Critical evaluation structure for {request.paper_type}: critical methodology, systematic evaluation process, quality-assured evidence synthesis, rigorous conclusions. This critical approach supports {request.paper_purpose} by providing methodologically sound thesis validation through literature critique."
        }
    ]

def create_quantitative_methodologies(methodology_name, sub_methodology_name, request):
    """Create quantitative methodologies with thesis focus"""
    thesis_key_concept = " ".join(request.final_thesis.split()[:5]) + "..." if len(request.final_thesis.split()) > 5 else request.final_thesis
    
    if sub_methodology_name == "Core Statistical Techniques":
        return [
            {
                "title": f"Descriptive Statistical Analysis of {thesis_key_concept}",
                "description": f"Descriptive statistical methodology designed to validate {request.final_thesis} through systematic quantitative analysis appropriate for {request.paper_type}",
                "approach": f"Comprehensive descriptive statistical analysis including measures of central tendency, variability, and distribution to characterize key variables related to the thesis. The methodology will employ statistical techniques to identify patterns, trends, and relationships in quantitative data that support the central argument through empirical evidence.",
                "source_focus": f"Quantitative analysis of {', '.join(request.source_categories)} using descriptive statistical techniques to extract numerical evidence supporting thesis validation. {request.source_categories[0] if request.source_categories else 'Quantitative datasets'} will provide primary statistical data, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'supplementary sources'} will offer contextual interpretation of statistical findings.",
                "structure_alignment": f"Statistical analysis structure for {request.paper_type}: methodology explanation, descriptive analysis process, statistical findings supporting thesis, empirical implications. This quantitative approach supports {request.paper_purpose} by providing numerical validation of central argument through statistical evidence."
            },
            {
                "title": f"Inferential Statistical Testing of {thesis_key_concept}",
                "description": f"Inferential statistical methodology designed to test {request.final_thesis} through hypothesis testing and statistical inference within {request.paper_type} framework",
                "approach": f"Systematic hypothesis testing using inferential statistics to evaluate thesis claims through statistical significance testing. The methodology will formulate testable hypotheses derived from the thesis, apply appropriate statistical tests, and interpret results to provide empirical support or challenge for the central argument.",
                "source_focus": f"Statistical testing of {', '.join(request.source_categories)} using inferential techniques to validate thesis claims through hypothesis testing. {request.source_categories[0] if request.source_categories else 'Statistical data'} will provide primary testing data, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'theoretical sources'} will inform hypothesis formulation and result interpretation.",
                "structure_alignment": f"Hypothesis testing structure for {request.paper_type}: hypothesis formulation, statistical testing methodology, results analysis, thesis validation conclusions. This inferential approach supports {request.paper_purpose} by providing statistical evidence for thesis claims through rigorous hypothesis testing."
            },
            {
                "title": f"Comparative Statistical Analysis of {thesis_key_concept}",
                "description": f"Comparative statistical methodology designed to support {request.final_thesis} through systematic quantitative comparison within {request.paper_type} structure",
                "approach": f"Comparative statistical analysis examining differences and similarities across groups, conditions, or time periods to support thesis claims. The methodology will employ appropriate comparative statistics (t-tests, ANOVA, chi-square) to identify significant differences that validate the central argument through empirical comparison.",
                "source_focus": f"Comparative analysis of {', '.join(request.source_categories)} using statistical techniques to identify significant differences supporting thesis validation. {request.source_categories[0] if request.source_categories else 'Comparative datasets'} will provide primary comparison data, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'contextual sources'} will help interpret comparative findings in relation to thesis claims.",
                "structure_alignment": f"Comparative statistical structure for {request.paper_type}: comparative methodology, statistical comparison process, significance testing results, thesis implications. This comparative approach supports {request.paper_purpose} by providing empirical evidence for thesis claims through statistical comparison."
            }
        ]
    elif sub_methodology_name == "Regression & Generalized Models":
        return [
            {
                "title": f"Linear Regression Analysis of {thesis_key_concept}",
                "description": f"Linear regression methodology designed to validate {request.final_thesis} through systematic relationship analysis appropriate for {request.paper_type}",
                "approach": f"Comprehensive linear regression analysis examining relationships between variables to support thesis claims. The methodology will identify predictor variables, assess model assumptions, and interpret regression coefficients to demonstrate how independent variables influence dependent variables in ways that support the central argument.",
                "source_focus": f"Regression analysis of {', '.join(request.source_categories)} using linear modeling techniques to identify relationships supporting thesis validation. {request.source_categories[0] if request.source_categories else 'Quantitative datasets'} will provide regression variables, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'theoretical sources'} will inform model specification and result interpretation.",
                "structure_alignment": f"Regression analysis structure for {request.paper_type}: model specification, regression methodology, relationship analysis, thesis validation through predictive modeling. This regression approach supports {request.paper_purpose} by demonstrating variable relationships that support central argument claims."
            },
            {
                "title": f"Multivariate Regression Modeling of {thesis_key_concept}",
                "description": f"Multivariate regression methodology designed to test {request.final_thesis} through complex relationship analysis within {request.paper_type} framework",
                "approach": f"Advanced multivariate regression analysis examining multiple predictors and their interactions to support thesis claims. The methodology will build complex models incorporating multiple variables, assess model fit, and interpret results to demonstrate how various factors combine to support the central argument through sophisticated statistical modeling.",
                "source_focus": f"Multivariate analysis of {', '.join(request.source_categories)} using advanced regression techniques to model complex relationships supporting thesis validation. {request.source_categories[0] if request.source_categories else 'Complex datasets'} will provide multivariate data, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'methodological sources'} will inform advanced modeling techniques.",
                "structure_alignment": f"Multivariate modeling structure for {request.paper_type}: complex model development, advanced regression analysis, interaction effects examination, comprehensive thesis validation. This sophisticated approach supports {request.paper_purpose} by providing complex statistical evidence for thesis claims."
            },
            {
                "title": f"Predictive Modeling Analysis of {thesis_key_concept}",
                "description": f"Predictive modeling methodology designed to support {request.final_thesis} through forecasting and prediction within {request.paper_type} structure",
                "approach": f"Predictive modeling approach using regression techniques to forecast outcomes and validate thesis claims through predictive accuracy. The methodology will develop predictive models, assess forecasting performance, and use prediction results to demonstrate the validity of thesis claims through empirical forecasting.",
                "source_focus": f"Predictive analysis of {', '.join(request.source_categories)} using modeling techniques to forecast outcomes supporting thesis validation. {request.source_categories[0] if request.source_categories else 'Time-series data'} will provide predictive variables, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'validation sources'} will help assess predictive accuracy and model performance.",
                "structure_alignment": f"Predictive modeling structure for {request.paper_type}: model development, prediction methodology, forecasting accuracy assessment, thesis validation through predictive success. This predictive approach supports {request.paper_purpose} by demonstrating thesis validity through successful forecasting."
            }
        ]
    else:
        return [
            {
                "title": f"Quantitative {methodology_name} Analysis of {thesis_key_concept}",
                "description": f"Systematic quantitative methodology designed to validate {request.final_thesis} through numerical analysis appropriate for {request.paper_type}",
                "approach": f"Comprehensive quantitative analysis employing statistical techniques to examine numerical data supporting thesis claims. The methodology will use appropriate statistical methods to identify patterns, test relationships, and provide empirical evidence for the central argument through rigorous quantitative analysis.",
                "source_focus": f"Quantitative analysis of {', '.join(request.source_categories)} using statistical techniques to extract numerical evidence supporting thesis validation. {request.source_categories[0] if request.source_categories else 'Quantitative sources'} will provide primary numerical data, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'interpretive sources'} will help contextualize statistical findings.",
                "structure_alignment": f"Quantitative analysis structure for {request.paper_type}: statistical methodology, numerical analysis process, empirical findings, thesis validation through quantitative evidence. This quantitative approach supports {request.paper_purpose} by providing numerical validation of central argument."
            },
            {
                "title": f"Empirical {methodology_name} Testing of {thesis_key_concept}",
                "description": f"Empirical testing methodology designed to validate {request.final_thesis} through systematic quantitative evaluation within {request.paper_type} framework",
                "approach": f"Systematic empirical testing using quantitative methods to evaluate thesis claims through statistical evidence. The methodology will formulate testable predictions, collect relevant data, and use statistical analysis to provide empirical support for the central argument through rigorous quantitative testing.",
                "source_focus": f"Empirical testing of {', '.join(request.source_categories)} using quantitative methods to validate thesis claims through statistical evidence. {request.source_categories[0] if request.source_categories else 'Empirical data'} will provide testing data, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'theoretical sources'} will inform prediction formulation and result interpretation.",
                "structure_alignment": f"Empirical testing structure for {request.paper_type}: prediction formulation, quantitative testing methodology, statistical results, thesis validation conclusions. This empirical approach supports {request.paper_purpose} by providing statistical evidence for thesis claims through rigorous testing."
            },
            {
                "title": f"Statistical {methodology_name} Validation of {thesis_key_concept}",
                "description": f"Statistical validation methodology designed to support {request.final_thesis} through comprehensive quantitative analysis within {request.paper_type} structure",
                "approach": f"Comprehensive statistical validation using multiple quantitative techniques to build robust support for thesis claims. The methodology will employ various statistical methods, cross-validate findings, and provide multiple forms of empirical evidence to strengthen support for the central argument through diverse quantitative approaches.",
                "source_focus": f"Statistical validation of {', '.join(request.source_categories)} using multiple quantitative techniques to ensure robust thesis support. {request.source_categories[0] if request.source_categories else 'Statistical sources'} will provide primary validation data, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'cross-validation sources'} will enable robustness checking and validation confirmation.",
                "structure_alignment": f"Statistical validation structure for {request.paper_type}: multi-method quantitative approach, statistical validation process, robust evidence synthesis, comprehensive thesis support. This validation approach supports {request.paper_purpose} by providing multiple forms of statistical evidence for central argument claims."
            }
        ]

def create_mixed_methods_methodologies(methodology_name, sub_methodology_name, request):
    """Create mixed methods methodologies with thesis focus"""
    thesis_key_concept = " ".join(request.final_thesis.split()[:5]) + "..." if len(request.final_thesis.split()) > 5 else request.final_thesis
    
    if sub_methodology_name == "Sequential & Concurrent Analysis":
        return [
            {
                "title": f"Sequential Mixed Methods Analysis of {thesis_key_concept}",
                "description": f"Sequential mixed methods methodology designed to validate {request.final_thesis} through phased quantitative-qualitative analysis appropriate for {request.paper_type}",
                "approach": f"Two-phase sequential analysis beginning with quantitative data collection and analysis, followed by qualitative investigation to explain and elaborate quantitative findings. The methodology will use initial quantitative results to inform qualitative phase design, ensuring that both approaches combine to provide comprehensive support for the thesis through complementary evidence types.",
                "source_focus": f"Sequential analysis of {', '.join(request.source_categories)} using mixed methods to build comprehensive thesis support. {request.source_categories[0] if request.source_categories else 'Quantitative sources'} will provide initial numerical evidence, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'qualitative sources'} will offer explanatory context and deeper understanding of quantitative patterns.",
                "structure_alignment": f"Sequential mixed methods structure for {request.paper_type}: quantitative phase methodology and results, qualitative phase design and analysis, integrated interpretation, comprehensive thesis validation. This sequential approach supports {request.paper_purpose} by building evidence systematically through complementary analytical phases."
            },
            {
                "title": f"Concurrent Mixed Methods Examination of {thesis_key_concept}",
                "description": f"Concurrent mixed methods methodology designed to support {request.final_thesis} through simultaneous quantitative-qualitative analysis within {request.paper_type} framework",
                "approach": f"Simultaneous collection and analysis of quantitative and qualitative data to provide comprehensive support for thesis claims. The methodology will conduct parallel analyses using both approaches, then integrate findings to create a complete picture supporting the central argument through convergent evidence from multiple analytical perspectives.",
                "source_focus": f"Concurrent analysis of {', '.join(request.source_categories)} using parallel mixed methods to validate thesis claims through convergent evidence. {request.source_categories[0] if request.source_categories else 'Quantitative sources'} will provide numerical patterns, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'qualitative sources'} will offer contextual understanding, with integration across both source types.",
                "structure_alignment": f"Concurrent mixed methods structure for {request.paper_type}: parallel methodology design, simultaneous analysis process, convergent results integration, comprehensive thesis support. This concurrent approach supports {request.paper_purpose} by providing multiple forms of evidence simultaneously for central argument validation."
            },
            {
                "title": f"Transformative Mixed Methods Analysis of {thesis_key_concept}",
                "description": f"Transformative mixed methods methodology designed to validate {request.final_thesis} through integrated analysis addressing multiple perspectives within {request.paper_type} structure",
                "approach": f"Integrated mixed methods analysis that combines quantitative and qualitative approaches within a transformative framework to address thesis claims from multiple perspectives. The methodology will use both analytical approaches to examine different aspects of the thesis, then synthesize findings to provide comprehensive support for the central argument through diverse evidence types.",
                "source_focus": f"Transformative analysis of {', '.join(request.source_categories)} using integrated mixed methods to address thesis from multiple perspectives. All source categories will be analyzed using both quantitative and qualitative lenses, with {request.source_categories[0] if request.source_categories else 'primary sources'} providing core evidence and others offering complementary perspectives for comprehensive thesis support.",
                "structure_alignment": f"Transformative mixed methods structure for {request.paper_type}: integrated methodology framework, multi-perspective analysis process, synthesized evidence presentation, comprehensive thesis validation. This transformative approach supports {request.paper_purpose} by addressing thesis claims through multiple analytical lenses simultaneously."
            }
        ]
    elif sub_methodology_name == "Case-Study Mixed Methods":
        return [
            {
                "title": f"Mixed Methods Case Study of {thesis_key_concept}",
                "description": f"Mixed methods case study methodology designed to validate {request.final_thesis} through integrated quantitative-qualitative case analysis appropriate for {request.paper_type}",
                "approach": f"Comprehensive case study combining quantitative metrics with qualitative analysis to provide in-depth support for thesis claims. The methodology will collect both numerical data and qualitative evidence within selected cases, then integrate findings to demonstrate how the thesis applies within specific contexts through multiple forms of evidence.",
                "source_focus": f"Mixed methods case analysis of {', '.join(request.source_categories)} using integrated approaches to build comprehensive thesis support within case contexts. {request.source_categories[0] if request.source_categories else 'Case documentation'} will provide both quantitative and qualitative evidence, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'contextual sources'} will offer broader perspective on case significance.",
                "structure_alignment": f"Mixed methods case study structure for {request.paper_type}: case selection rationale, integrated data collection, combined analysis process, comprehensive thesis validation through case evidence. This case-based approach supports {request.paper_purpose} by demonstrating thesis validity through detailed mixed-methods case examination."
            },
            {
                "title": f"Comparative Mixed Methods Case Analysis of {thesis_key_concept}",
                "description": f"Comparative mixed methods case study methodology designed to support {request.final_thesis} through cross-case integrated analysis within {request.paper_type} framework",
                "approach": f"Multi-case comparative analysis using mixed methods to examine thesis claims across different contexts. The methodology will apply both quantitative and qualitative approaches within each case, then conduct cross-case comparison to identify patterns and variations that support the central argument through comparative mixed-methods evidence.",
                "source_focus": f"Comparative mixed methods analysis of {', '.join(request.source_categories)} across multiple cases to validate thesis claims through cross-case evidence. {request.source_categories[0] if request.source_categories else 'Multi-case data'} will provide comparative evidence using both analytical approaches, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'comparative sources'} will enable cross-case pattern identification.",
                "structure_alignment": f"Comparative mixed methods structure for {request.paper_type}: multi-case design, integrated analysis within cases, cross-case comparison, comprehensive thesis validation through comparative evidence. This comparative approach supports {request.paper_purpose} by demonstrating thesis generalizability through mixed-methods case comparison."
            },
            {
                "title": f"Longitudinal Mixed Methods Case Study of {thesis_key_concept}",
                "description": f"Longitudinal mixed methods case study methodology designed to validate {request.final_thesis} through temporal integrated analysis within {request.paper_type} structure",
                "approach": f"Time-based mixed methods case study examining thesis claims across temporal periods using both quantitative and qualitative approaches. The methodology will track changes over time using multiple analytical lenses, demonstrating how the thesis manifests across different periods through integrated longitudinal evidence.",
                "source_focus": f"Longitudinal mixed methods analysis of {', '.join(request.source_categories)} across time periods to validate thesis claims through temporal evidence. {request.source_categories[0] if request.source_categories else 'Temporal data'} will provide time-based evidence using both analytical approaches, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'historical sources'} will offer temporal context for longitudinal pattern interpretation.",
                "structure_alignment": f"Longitudinal mixed methods structure for {request.paper_type}: temporal design framework, time-based integrated analysis, longitudinal pattern identification, comprehensive thesis validation through temporal evidence. This longitudinal approach supports {request.paper_purpose} by demonstrating thesis validity across time through mixed-methods temporal analysis."
            }
        ]
    else:
        return [
            {
                "title": f"Integrated {methodology_name} Analysis of {thesis_key_concept}",
                "description": f"Integrated mixed methods methodology designed to validate {request.final_thesis} through comprehensive quantitative-qualitative analysis appropriate for {request.paper_type}",
                "approach": f"Comprehensive integration of quantitative and qualitative approaches to provide robust support for thesis claims. The methodology will combine numerical analysis with interpretive investigation, synthesizing findings from both approaches to create comprehensive evidence supporting the central argument through multiple analytical perspectives.",
                "source_focus": f"Integrated analysis of {', '.join(request.source_categories)} using mixed methods to build comprehensive thesis support through multiple analytical lenses. All source categories will be examined using both quantitative and qualitative approaches, with systematic integration across methodologies to maximize evidence strength for thesis validation.",
                "structure_alignment": f"Integrated mixed methods structure for {request.paper_type}: comprehensive methodology design, parallel analysis process, systematic integration, robust thesis validation. This integrated approach supports {request.paper_purpose} by providing multiple forms of evidence through systematic mixed-methods integration."
            },
            {
                "title": f"Convergent {methodology_name} Validation of {thesis_key_concept}",
                "description": f"Convergent mixed methods methodology designed to support {request.final_thesis} through triangulated analysis within {request.paper_type} framework",
                "approach": f"Triangulated mixed methods analysis using convergent approaches to validate thesis claims through multiple evidence types. The methodology will employ quantitative and qualitative techniques to examine the same phenomena from different angles, then converge findings to provide robust support for the central argument through methodological triangulation.",
                "source_focus": f"Convergent analysis of {', '.join(request.source_categories)} using triangulated mixed methods to validate thesis claims through multiple analytical perspectives. {request.source_categories[0] if request.source_categories else 'Primary sources'} will be analyzed using both approaches, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'triangulation sources'} will provide convergent validation evidence.",
                "structure_alignment": f"Convergent mixed methods structure for {request.paper_type}: triangulated methodology design, convergent analysis process, integrated validation results, robust thesis support. This convergent approach supports {request.paper_purpose} by providing triangulated evidence for thesis claims through multiple analytical convergence."
            },
            {
                "title": f"Comprehensive {methodology_name} Synthesis of {thesis_key_concept}",
                "description": f"Comprehensive mixed methods synthesis methodology designed to validate {request.final_thesis} through complete integrated analysis within {request.paper_type} structure",
                "approach": f"Complete mixed methods synthesis combining all available quantitative and qualitative approaches to provide comprehensive support for thesis claims. The methodology will systematically integrate multiple analytical techniques, synthesize findings across all approaches, and provide complete evidence supporting the central argument through methodological comprehensiveness.",
                "source_focus": f"Comprehensive synthesis of {', '.join(request.source_categories)} using all available mixed methods approaches to maximize thesis support through complete analytical coverage. All source categories will be examined using every applicable technique, with systematic synthesis across methodologies to provide comprehensive evidence for thesis validation.",
                "structure_alignment": f"Comprehensive mixed methods structure for {request.paper_type}: complete methodology integration, systematic synthesis process, comprehensive evidence presentation, complete thesis validation. This comprehensive approach supports {request.paper_purpose} by providing complete analytical coverage for thesis claims through methodological comprehensiveness."
            }
        ]

def create_generic_methodologies(methodology_name, request):
    """Generic fallback methodologies with thesis focus"""
    thesis_key_concept = " ".join(request.final_thesis.split()[:5]) + "..." if len(request.final_thesis.split()) > 5 else request.final_thesis
    
    return [
        {
            "title": f"Systematic {methodology_name} Analysis of {thesis_key_concept}",
            "description": f"Systematic {methodology_name.lower()} methodology designed to validate {request.final_thesis} through comprehensive analysis appropriate for {request.paper_type}",
            "approach": f"Comprehensive {methodology_name.lower()} analysis employing systematic techniques to examine evidence supporting thesis claims. The methodology will use appropriate analytical methods to identify patterns, evaluate evidence quality, and provide robust support for the central argument through rigorous systematic analysis.",
            "source_focus": f"Systematic analysis of {', '.join(request.source_categories)} using {methodology_name.lower()} techniques to extract evidence supporting thesis validation. {request.source_categories[0] if request.source_categories else 'Primary sources'} will provide core evidence, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'supplementary sources'} will offer additional support for comprehensive thesis validation.",
            "structure_alignment": f"Systematic {methodology_name.lower()} structure for {request.paper_type}: methodology explanation, systematic analysis process, evidence synthesis, thesis validation conclusions. This systematic approach supports {request.paper_purpose} by providing comprehensive analytical validation of central argument."
        },
        {
            "title": f"Comprehensive {methodology_name} Examination of {thesis_key_concept}",
            "description": f"Comprehensive {methodology_name.lower()} methodology designed to support {request.final_thesis} through thorough analysis within {request.paper_type} framework",
            "approach": f"Thorough {methodology_name.lower()} examination addressing all aspects of thesis validation through comprehensive analytical techniques. The methodology will systematically examine all relevant evidence, apply appropriate analytical methods, and provide complete support for the central argument through comprehensive methodological coverage.",
            "source_focus": f"Comprehensive examination of {', '.join(request.source_categories)} using {methodology_name.lower()} approaches to ensure complete thesis support. All source categories will be analyzed systematically, with {request.source_categories[0] if request.source_categories else 'primary sources'} providing core evidence and others offering comprehensive contextual support for thesis validation.",
            "structure_alignment": f"Comprehensive {methodology_name.lower()} structure for {request.paper_type}: thorough methodology design, comprehensive analysis process, complete evidence synthesis, thorough thesis validation. This comprehensive approach supports {request.paper_purpose} by providing complete analytical examination of central argument."
        },
        {
            "title": f"Targeted {methodology_name} Validation of {thesis_key_concept}",
            "description": f"Targeted {methodology_name.lower()} methodology designed to validate {request.final_thesis} through focused analysis within {request.paper_type} structure",
            "approach": f"Focused {methodology_name.lower()} analysis targeting specific aspects of thesis validation through strategic analytical techniques. The methodology will identify key validation points, apply targeted analytical methods, and provide focused support for the central argument through strategic methodological application.",
            "source_focus": f"Targeted analysis of {', '.join(request.source_categories)} using {methodology_name.lower()} techniques to provide focused thesis support. {request.source_categories[0] if request.source_categories else 'Strategic sources'} will provide targeted evidence, while {request.source_categories[-1] if len(request.source_categories) > 1 else 'supporting sources'} will offer additional validation for focused thesis support.",
            "structure_alignment": f"Targeted {methodology_name.lower()} structure for {request.paper_type}: focused methodology design, strategic analysis process, targeted evidence presentation, focused thesis validation. This targeted approach supports {request.paper_purpose} by providing strategic analytical validation of central argument."
        }
    ]