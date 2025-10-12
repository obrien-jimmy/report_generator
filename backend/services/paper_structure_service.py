from typing import List, Dict, Optional

class PaperStructureService:
    
    PAPER_TYPE_SKELETONS = {
        "argumentative": [
            "Title Page",
            "Abstract",
            "Introduction (with Thesis)",
            "Body: Claim 1 & Evidence",
            "Body: Claim 2 & Evidence",
            "Counterarguments & Rebuttals",
            "Conclusion",
            "References (APA 7th)"
        ],
        "analytical": [
            "Title Page",
            "Abstract",
            "Introduction (Problem Statement)",
            "Analytical Framework / Model",
            "Component Analysis 1",
            "Component Analysis 2",
            "Synthesis & Discussion",
            "Conclusion",
            "References (APA 7th)"
        ],
        "expository": [
            "Title Page",
            "Abstract",
            "Introduction (Topic Overview)",
            "Background / Context",
            "Key Facts & Explanations",
            "Implications / Significance",
            "Conclusion",
            "References (APA 7th)"
        ],
        "narrative": [
            "Title Page",
            "Abstract",
            "Introduction (Scope & Chronology)",
            "Event Timeline / Sequence",
            "Key Turning Points",
            "Lessons Learned / Reflections",
            "Conclusion",
            "References (APA 7th)"
        ],
        "descriptive": [
            "Title Page",
            "Abstract",
            "Introduction (Purpose & Scope)",
            "Current Conditions / Elements",
            "Detailed Description (Theme/Region 1)",
            "Detailed Description (Theme/Region 2)",
            "Overall Assessment",
            "Conclusion",
            "References (APA 7th)"
        ],
        "compare_contrast": [
            "Title Page",
            "Abstract",
            "Introduction (Subjects & Criteria)",
            "Method of Comparison (Block or Point‑by‑Point)",
            "Comparison Section 1",
            "Comparison Section 2",
            "Synthesis / Evaluation",
            "Conclusion",
            "References (APA 7th)"
        ],
        "cause_effect": [
            "Title Page",
            "Abstract",
            "Introduction (Phenomenon & Significance)",
            "Cause Analysis",
            "Effect Analysis",
            "Inter‑relationships / Moderators",
            "Conclusion",
            "References (APA 7th)"
        ],
        "definition": [
            "Title Page",
            "Abstract",
            "Introduction (Term & Importance)",
            "Existing Definitions",
            "Proposed Definition / Clarification",
            "Examples & Contexts",
            "Implications",
            "Conclusion",
            "References (APA 7th)"
        ],
        "exploratory": [
            "Title Page",
            "Abstract",
            "Introduction (Open‑ended Question)",
            "Background & Current Knowledge",
            "Exploration of Perspectives",
            "Synthesis of Insights",
            "Tentative Conclusions / Future Questions",
            "References (APA 7th)"
        ],
        "reflective": [
            "Title Page",
            "Abstract",
            "Introduction (Experience/Event)",
            "Narrative of Experience",
            "Critical Reflection / Analysis",
            "Lessons Learned",
            "Implications for Practice/Policy",
            "Conclusion",
            "References (APA 7th)"
        ],
        "synthesis": [
            "Title Page",
            "Abstract",
            "Introduction (Threat/Topic)",
            "Method of Source Integration",
            "Evidence Cluster 1",
            "Evidence Cluster 2",
            "Integrated Assessment",
            "Conclusion & Recommendations",
            "References (APA 7th)"
        ],
        "research": [
            "Title Page",
            "Abstract",
            "Introduction (Research Question & Significance)",
            "Literature Review",
            "Methodology",
            "Results / Findings",
            "Discussion",
            "Conclusion",
            "References (APA 7th)"
        ],
        "literature_review": [
            "Title Page",
            "Abstract",
            "Introduction (Scope & Objectives)",
            "Search Strategy / Inclusion Criteria",
            "Thematic Findings 1",
            "Thematic Findings 2",
            "Research Gaps & Future Directions",
            "Conclusion",
            "References (APA 7th)"
        ],
        "critical_review": [
            "Title Page",
            "Abstract",
            "Introduction (Document/Policy Overview)",
            "Summary of Key Points",
            "Critical Analysis (Strengths/Weaknesses)",
            "Evaluation & Implications",
            "Conclusion",
            "References (APA 7th)"
        ],
        "position": [
            "Title Page",
            "Abstract",
            "Introduction (Position Statement)",
            "Argument 1 & Evidence",
            "Argument 2 & Evidence",
            "Counterarguments & Rebuttals",
            "Conclusion",
            "References (APA 7th)"
        ],
        "proposal": [
            "Title Page",
            "Abstract",
            "Introduction (Problem Statement)",
            "Proposed Solution",
            "Justification / Evidence",
            "Implementation Plan",
            "Anticipated Outcomes / Evaluation Plan",
            "Conclusion",
            "References (APA 7th)"
        ],
        "concept": [
            "Title Page",
            "Abstract",
            "Introduction (Concept & Relevance)",
            "Literature Context / Theoretical Background",
            "Concept Development / Components",
            "Applications / Case Examples",
            "Future Research Paths",
            "Conclusion",
            "References (APA 7th)"
        ],
        "response": [
            "Title Page",
            "Abstract",
            "Introduction (Document/Report Referenced)",
            "Summary of Original Document",
            "Analytical Reaction / Critique",
            "Supporting Evidence",
            "Conclusion",
            "References (APA 7th)"
        ]
    }

    METHODOLOGY_TEMPLATES = {
        "quantitative": {
            "insert_after": "Introduction",
            "sections": [
                "Data Sources & Collection",
                "Statistical Methods",
                "Results",
                "Validity & Reliability",
                "Limitations"
            ]
        },
        "statistical_techniques": {
            "insert_after": "Introduction",
            "sections": [
                "Data Description",
                "Descriptive Statistics",
                "Inferential Tests (t‑test/ANOVA)",
                "Findings Interpretation",
                "Limitations"
            ]
        },
        "regression_models": {
            "insert_after": "Introduction",
            "sections": [
                "Dataset & Variables",
                "Model Specification",
                "Model Diagnostics",
                "Results (Coefficients & Fit)",
                "Implications"
            ]
        },
        "descriptive_correlational": {
            "insert_after": "Introduction",
            "sections": [
                "Variable Overview",
                "Correlation Analysis",
                "Patterns & Trends",
                "Discussion of Associations",
                "Limitations"
            ]
        },
        "meta_analysis_quant": {
            "insert_after": "Introduction",
            "sections": [
                "Search & Inclusion Criteria",
                "Effect‑Size Extraction",
                "Meta‑analytic Model",
                "Forest Plot & Heterogeneity",
                "Interpretation"
            ]
        },
        "bibliometric": {
            "insert_after": "Introduction",
            "sections": [
                "Data Retrieval (Databases & Time Span)",
                "Citation Network Construction",
                "Network Metrics / Visualisation",
                "Key Authors & Themes",
                "Discussion"
            ]
        },
        "qualitative": {
            "insert_after": "Introduction",
            "sections": [
                "Document Selection / Corpus",
                "Analytical Framework",
                "Findings (Themes/Categories)",
                "Interpretation",
                "Trustworthiness & Limitations"
            ]
        },
        "thematic_analysis": {
            "insert_after": "Introduction",
            "sections": [
                "Corpus Description",
                "Coding Process",
                "Theme Development",
                "Thematic Narrative",
                "Implications"
            ]
        },
        "content_analysis": {
            "insert_after": "Introduction",
            "sections": [
                "Sampling & Unit of Analysis",
                "Coding Scheme",
                "Frequency / Pattern Results",
                "Contextual Interpretation",
                "Limitations"
            ]
        },
        "case_study": {
            "insert_after": "Introduction",
            "sections": [
                "Case Selection & Boundaries",
                "Data Sources",
                "Case Description",
                "Cross‑Case / Intra‑Case Analysis",
                "Lessons Learned"
            ]
        },
        "discourse_analysis": {
            "insert_after": "Introduction",
            "sections": [
                "Corpus & Context",
                "Analytical Framework",
                "Discursive Patterns",
                "Interpretation",
                "Implications"
            ]
        },
        "narrative_analysis": {
            "insert_after": "Introduction",
            "sections": [
                "Narrative Corpus",
                "Structural Components",
                "Narrative Functions",
                "Interpretation",
                "Limitations"
            ]
        },
        "archival_analysis": {
            "insert_after": "Introduction",
            "sections": [
                "Archive Description",
                "Document Selection",
                "Contextual Analysis",
                "Findings",
                "Historical Significance"
            ]
        },
        "literature_review": {
            "insert_after": "Introduction",
            "sections": [
                "Search Strategy",
                "Inclusion / Exclusion Criteria",
                "Quality Appraisal",
                "Synthesis of Findings",
                "Research Gaps"
            ]
        },
        "systematic_review": {
            "insert_after": "Introduction",
            "sections": [
                "Protocol & Registration",
                "Database Search",
                "Screening & Appraisal",
                "Synthesis & Meta‑analysis",
                "Limitations"
            ]
        },
        "narrative_review": {
            "insert_after": "Introduction",
            "sections": [
                "Search Scope",
                "Chronological / Thematic Presentation",
                "Critical Discussion",
                "Synthesis",
                "Future Research"
            ]
        },
        "scoping_review": {
            "insert_after": "Introduction",
            "sections": [
                "Mapping Strategy",
                "Charting the Data",
                "Descriptive Numerical Summary",
                "Thematic Summary",
                "Research Gaps"
            ]
        },
        "integrative_review": {
            "insert_after": "Introduction",
            "sections": [
                "Diverse Data Sources",
                "Evaluation Criteria",
                "Integrated Findings",
                "Conceptual Model",
                "Implications"
            ]
        },
        "critical_review": {
            "insert_after": "Introduction",
            "sections": [
                "Source Selection",
                "Critical Appraisal",
                "Synthesis of Critiques",
                "Overall Evaluation",
                "Recommendations"
            ]
        },
        "conceptual_review": {
            "insert_after": "Introduction",
            "sections": [
                "Concept Identification",
                "Framework Comparison",
                "Conceptual Evolution",
                "Synthesis",
                "Future Directions"
            ]
        },
        "meta_synthesis": {
            "insert_after": "Introduction",
            "sections": [
                "Qualitative Study Selection",
                "Translation of Studies",
                "Higher‑Order Themes",
                "Interpretive Synthesis",
                "Implications"
            ]
        },
        "mixed_methods": {
            "insert_after": "Introduction",
            "sections": [
                "Design Rationale (Mixed)",
                "Data Sources & Collection",
                "Quantitative Component",
                "Qualitative Component",
                "Integration & Interpretation",
                "Limitations"
            ]
        },
        "sequential_concurrent": {
            "insert_after": "Introduction",
            "sections": [
                "Phase 1: Qualitative / Quantitative",
                "Phase 2: Complementary Method",
                "Integration Procedures",
                "Findings",
                "Implications"
            ]
        },
        "case_study_mixed": {
            "insert_after": "Introduction",
            "sections": [
                "Case Selection",
                "Qualitative Data",
                "Quantitative Measures",
                "Integrated Analysis",
                "Lessons Learned"
            ]
        },
        "mixed_methods_systematic_review": {
            "insert_after": "Introduction",
            "sections": [
                "Search & Selection",
                "Quantitative Synthesis",
                "Qualitative Synthesis",
                "Meta‑integration",
                "Recommendations"
            ]
        }
    }

    @staticmethod
    def get_paper_structure(paper_type: str, methodology_id: Optional[str] = None) -> List[str]:
        """
        Generate a structured paper outline based on paper type and methodology.
        
        Args:
            paper_type: The type of paper (e.g., 'argumentative', 'analytical')
            methodology_id: Main methodology type (e.g., 'quantitative', 'qualitative')
            # sub_methodology_id: Sub-methodology type (e.g., 'thematic_analysis') - Removed from production, kept for future consideration
            
        Returns:
            List of section titles in order
        """
        # Get base paper structure
        base_structure = PaperStructureService.PAPER_TYPE_SKELETONS.get(paper_type, [])
        
        if not base_structure:
            # Fallback structure
            base_structure = [
                "Title Page",
                "Abstract", 
                "Introduction",
                "Body",
                "Conclusion",
                "References (APA 7th)"
            ]
        
        # If no methodology specified, return base structure
        if not methodology_id:
            return base_structure.copy()
        
        # Determine which methodology template to use
        methodology_template = None
        
        # First try sub-methodology if specified (Removed from production, kept for future consideration)
        # if sub_methodology_id:
        #     methodology_template = PaperStructureService.METHODOLOGY_TEMPLATES.get(sub_methodology_id)
        
        # Try main methodology
        methodology_template = PaperStructureService.METHODOLOGY_TEMPLATES.get(methodology_id)
        
        # If no methodology template found, return base structure
        if not methodology_template:
            return base_structure.copy()
        
        # Apply methodology template
        return PaperStructureService._merge_structure(base_structure, methodology_template)
    
    @staticmethod
    def _merge_structure(base_structure: List[str], methodology_template: Dict) -> List[str]:
        """
        Merge base paper structure with methodology template.
        
        Args:
            base_structure: Base paper structure
            methodology_template: Methodology template with insert_after and sections
            
        Returns:
            Merged structure list
        """
        insert_after = methodology_template.get("insert_after", "Introduction")
        methodology_sections = methodology_template.get("sections", [])
        
        if not methodology_sections:
            return base_structure.copy()
        
        # Find insertion point
        insert_index = None
        for i, section in enumerate(base_structure):
            if insert_after.lower() in section.lower():
                insert_index = i + 1
                break
        
        # If insertion point not found, insert after Introduction by default
        if insert_index is None:
            for i, section in enumerate(base_structure):
                if "introduction" in section.lower():
                    insert_index = i + 1
                    break
        
        # If still not found, insert after Abstract
        if insert_index is None:
            for i, section in enumerate(base_structure):
                if "abstract" in section.lower():
                    insert_index = i + 1
                    break
        
        # Last resort: insert at position 2
        if insert_index is None:
            insert_index = 2
        
        # Create merged structure
        merged = base_structure[:insert_index].copy()
        
        # Add methodology sections, avoiding duplicates
        existing_sections_lower = [s.lower() for s in merged]
        for method_section in methodology_sections:
            if method_section.lower() not in existing_sections_lower:
                merged.append(method_section)
                existing_sections_lower.append(method_section.lower())
        
        # Add remaining base structure sections, avoiding duplicates
        for section in base_structure[insert_index:]:
            if section.lower() not in existing_sections_lower:
                merged.append(section)
                existing_sections_lower.append(section.lower())
        
        return merged
    
    @staticmethod
    def get_structure_preview(paper_type: str, methodology_id: Optional[str] = None) -> Dict:
        """
        Get a preview of the paper structure with metadata.
        
        Returns:
            Dictionary with structure and metadata
        """
        # sub_methodology_id: Optional[str] = None - Removed from production, kept for future consideration
        structure = PaperStructureService.get_paper_structure(paper_type, methodology_id)
        
        return {
            "structure": structure,
            "total_sections": len(structure),
            "paper_type": paper_type,
            "methodology": methodology_id,
            # "sub_methodology": sub_methodology_id,  # Removed from production, kept for future consideration
            "has_methodology_sections": bool(methodology_id and 
                PaperStructureService.METHODOLOGY_TEMPLATES.get(methodology_id))
        }