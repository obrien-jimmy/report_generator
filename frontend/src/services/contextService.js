class ContextService {
  static getStructureExplanation(section, index, structureData) {
    const isAdmin = ['Title Page', 'Abstract', 'References (APA 7th)'].includes(section);
    const isIntro = section.toLowerCase().includes('introduction');
    const isSummary = section.toLowerCase().includes('conclusion') || section.toLowerCase().includes('summary');
    const isMethodology = !isAdmin && !isIntro && !isSummary;
    
    let explanation = '';
    
    if (isAdmin) {
      explanation = `Administrative section - provides paper formatting and metadata. Not included in outline generation process.`;
    } else if (isIntro) {
      explanation = `Introduction section - sets up the thesis, context, and research framework. Establishes the foundation for all subsequent analysis.`;
    } else if (isSummary) {
      explanation = `Summary/Conclusion section - synthesizes findings and provides final thesis validation. Draws from all methodology sections.`;
    } else if (isMethodology) {
      if (structureData?.has_methodology_sections) {
        explanation = `Enhanced methodology section - specifically added based on "${structureData.methodology}" approach. Provides specialized analytical framework for thesis validation.`;
      } else {
        explanation = `Core content section - part of the base "${structureData.paper_type}" paper structure. Provides primary analytical content.`;
      }
    }
    
    return explanation;
  }
  
  static getStepExplanation(step) {
    const explanations = {
      'paper-type': 'Selecting paper type and length to establish the foundational structure and requirements.',
      'thesis': 'Establishing the central argument and research focus. All subsequent sections will be designed to support this thesis.',
      'sources': 'Selecting source categories that will provide evidence for thesis validation. These categories determine research scope.',
      'methodology': 'Choosing analytical approach that defines how evidence will be examined to prove the thesis. This determines paper structure enhancement.',
      'outline': 'Generating detailed research framework with sections, subsections, questions, and citations based on all previous selections.',
      'draft': 'Developing detailed content for each section based on the framework outline.',
      'final': 'Finalizing and refining the complete research paper.'
    };
    return explanations[step] || 'Processing current step in research generation workflow.';
  }
}

export default ContextService;