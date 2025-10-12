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

  static generateSourceCategoriesAnalysis(thesis, categories) {
    if (!thesis || !categories || categories.length === 0) return '';
    
    return `These source categories (${categories.join(', ')}) were specifically selected to provide comprehensive evidence for the thesis: "${thesis}". Each category serves a strategic purpose in building a robust argument foundation that addresses different aspects of the research question while ensuring methodological rigor and evidence diversity.`;
  }

  static generateMethodologyAnalysis(thesis, methodology) {
    if (!thesis || !methodology) return '';
    
    const methodName = methodology.methodologyType || methodology.title || methodology.name || 'Selected methodology';
    const approach = methodology.approach || '';
    const description = methodology.description || '';
    
    return `The ${methodName} approach provides the analytical framework needed to systematically examine evidence and validate the thesis: "${thesis}". This methodology will structure the argument by ${approach ? approach.toLowerCase() : 'establishing clear analytical parameters'}, ensuring that foundational facts are assessed before drawing conclusions. ${description ? 'The specific approach involves: ' + description : ''} This creates an iterative process where data feeds into the outline and paper structure, allowing for systematic assessment of findings throughout the research process.`;
  }

  static generateOutlineContextAnalysis(outline, thesis) {
    if (!outline || !thesis) return '';
    
    let analysis = `The outline structure creates a logical progression that systematically supports the thesis: "${thesis}". Each section builds upon previous findings:\n\n`;
    
    outline.forEach((section, index) => {
      analysis += `**${section.section_title}**: ${section.section_context || 'Core analytical content'} This supports the thesis directly by providing ${index === 0 ? 'foundational context and framework' : index === outline.length - 1 ? 'synthesis and conclusion of findings' : 'critical evidence and analysis'}.\n\n`;
      
      if (section.subsections && section.subsections.length > 0) {
        section.subsections.forEach((subsection) => {
          analysis += `  • ${subsection.subsection_title}: ${subsection.subsection_context || 'Detailed analysis'} This supports the section directly by providing specific evidence and targeted analysis.\n`;
        });
        analysis += '\n';
      }
    });
    
    return analysis;
  }

  static generateProcessFlowSummary(thesis, methodology, sourceCategories, outline) {
    if (!thesis) return '';
    
    const methodName = methodology?.methodologyType || methodology?.title || 'selected methodology';
    const categories = sourceCategories?.join(', ') || 'identified source categories';
    const sectionCount = outline?.length || 0;
    
    return `The research paper flows systematically from thesis to conclusion through a carefully structured process. The thesis "${thesis}" drives the selection of ${categories} as evidence sources, which are then analyzed through the ${methodName} approach. This creates a ${sectionCount}-section outline where each component builds upon the previous elements to create a cohesive argument. The methodology ensures that foundational evidence is established before conclusions are drawn, creating an iterative assessment process that validates findings throughout the paper development. This structure guarantees that every element serves the central purpose of supporting and proving the thesis through rigorous analytical examination.`;
  }
}

export default ContextService;