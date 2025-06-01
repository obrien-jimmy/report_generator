import { useState } from 'react';
import ThesisRefinement from './ThesisRefinement';
import SourceCategories from './SourceCategories';
import MethodologyGenerator from './MethodologyGenerator';
import OutlineGenerator from './OutlineGenerator';

const ResearchGenerator = () => {
  const [finalThesis, setFinalThesis] = useState('');
  const [paperLength, setPaperLength] = useState(5);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [methodology, setMethodology] = useState('');
  const [step, setStep] = useState('thesis'); // thesis, sources, methodology, outline

  return (
    <div className="container my-5">
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
          paperLength={paperLength}
          setPaperLength={setPaperLength}
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
          paperLength={paperLength}
          sourceCategories={selectedCategories}
        />
      )}
    </div>
  );
};

export default ResearchGenerator;
