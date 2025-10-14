import React, { useState } from 'react';
import FloatingContextButton from './FloatingContextButton';
import ThesisRefinement from './ThesisRefinement';
import SourceCategories from './SourceCategories';
import MethodologyGenerator from './MethodologyGenerator';
import OutlineGenerator from './OutlineGenerator';

const ResearchGenerator = () => {
  const [finalThesis, setFinalThesis] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [methodology, setMethodology] = useState('');
  const [step, setStep] = useState('thesis');
  const [selectedPaperType, setSelectedPaperType] = useState(null);
  const [outline, setOutline] = useState([]);

  return (
    <div className="container-fluid py-4">
      {step === 'thesis' && (
        <ThesisRefinement
          onFinalize={(thesis) => {
            setFinalThesis(thesis);
            setStep('sources');
          }}
        />
      )}

      {step === 'sources' && (
        <SourceCategories
          finalThesis={finalThesis}
          onCategoriesSelected={(categories) => {
            setSelectedCategories(categories);
            setStep('methodology');
          }}
        />
      )}

      {step === 'methodology' && (
        <MethodologyGenerator
          finalThesis={finalThesis}
          sourceCategories={selectedCategories}
          setMethodology={(meth) => {
            setMethodology(meth);
            setStep('outline');
          }}
          proceedToOutline={() => setStep('outline')}
        />
      )}

      {step === 'outline' && methodology && (
        <OutlineGenerator
          finalThesis={finalThesis}
          methodology={methodology}
          sourceCategories={selectedCategories}
        />
      )}

      {/* Floating Context Button */}
      <FloatingContextButton
        currentStep={step}
        finalThesis={finalThesis}
        selectedCategories={selectedCategories}
        methodology={methodology}
        selectedPaperType={selectedPaperType}
        outline={outline}
      />
    </div>
  );
};

export default ResearchGenerator;
