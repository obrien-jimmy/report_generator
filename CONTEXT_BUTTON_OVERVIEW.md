# Context Button Feature Documentation

## Overview
The Context Button is a floating action button that provides users with real-time visibility into the research paper generation workflow. It displays current selections, progress status, paper structure preview, and contextual explanations for each step in the process.

## Architecture & Data Flow

### 1. Component Hierarchy
```
App.jsx (Root State Management)
├── FloatingContextButton.jsx (Entry Point)
└── ContextPanel.jsx (Main UI)
    └── ContextService.js (Business Logic)
```

### 2. State Management Flow
```
App.jsx State → FloatingContextButton → ContextPanel → Backend API
     ↓              ↓                    ↓           ↓
- finalThesis   - currentStep      - structurePreview  - /paper_structure_preview
- methodology   - all props passed - loading states    - PaperStructureService
- outline       - panel visibility - error handling    - AWS Bedrock integration
- progress flags
```

## Implementation Details

### Core Files Structure

#### 1. **App.jsx** - Root State Provider
- **Purpose**: Manages global application state and determines current workflow step
- **Key Functions**:
  - `getCurrentStep()`: Determines current position in workflow based on completion flags
  - State management for all major workflow components
  - Integration point for FloatingContextButton

#### 2. **FloatingContextButton.jsx** - Entry Point Component  
- **Purpose**: Provides the floating button UI and manages panel visibility
- **Features**:
  - Fixed positioning (bottom-right corner)
  - High z-index (9998) for visibility above other content
  - State management for panel open/close
  - Props passthrough to ContextPanel

#### 3. **ContextPanel.jsx** - Main Interface Component
- **Purpose**: Renders the slide-out panel with comprehensive context information
- **Key Sections**:
  - Current step indicator with explanations
  - Progress overview with completion checkmarks  
  - Finalized selections display
  - Real-time paper structure preview
  - Process flow explanations
  - Outline generation statistics

#### 4. **ContextService.js** - Business Logic Layer
- **Purpose**: Provides contextual explanations and structure analysis
- **Key Functions**:
  - `getStepExplanation(step)`: Returns contextual explanation for current workflow step
  - `getStructureExplanation(section, index, structureData)`: Analyzes paper sections and provides reasoning

#### 5. **Backend Integration** - API Layer
- **Endpoint**: `POST /paper_structure_preview` 
- **Schema**: `PaperStructureRequest/Response` (structure.py)
- **Service**: `PaperStructureService.get_structure_preview()`
- **Purpose**: Provides real-time paper structure based on current methodology selections

## Data Flow Visualization

### Step Detection Logic
```javascript
// App.jsx - Determines current workflow position
const getCurrentStep = () => {
  if (!selectedPaperType) return 'paper-type';
  if (!thesisFinalized) return 'thesis'; 
  if (!categoriesFinalized) return 'sources';
  if (!methodology) return 'methodology';
  if (!frameworkComplete) return 'outline';
  if (activeTab === 'outline') return 'draft';
  if (activeTab === 'initial') return 'final';
  return 'framework';
};
```

### Structure Preview Loading
```javascript
// ContextPanel.jsx - Real-time structure updates
useEffect(() => {
  if (methodology && selectedPaperType) {
    loadStructurePreview();
  }
}, [methodology, selectedPaperType]);

const loadStructurePreview = async () => {
  const response = await axios.post('http://localhost:8000/paper_structure_preview', {
    paper_type: selectedPaperType.id,
    methodology_id: methodology.methodology_type || methodology.id,
    page_count: pageCount || 10
  });
  setStructurePreview(response.data);
};
```

## User Experience Flow

### 1. **Always Available**: 
- Floating button visible on every page
- Consistent bottom-right positioning
- Clear "Context" label with info icon

### 2. **Progressive Disclosure**:
- Button click reveals slide-out panel from right
- Panel covers 500px width with backdrop
- Smooth animation and proper z-indexing

### 3. **Real-time Updates**:
- Content updates based on current workflow step
- Progress indicators show completion status
- Structure preview reflects methodology changes

### 4. **Contextual Information**:
- Step-specific explanations via ContextService
- Section-by-section structure analysis
- Process flow documentation

## Integration Points

### Frontend Integration
```javascript
// App.jsx - Root integration
import FloatingContextButton from './components/FloatingContextButton';

// Render at app level with all necessary props
<FloatingContextButton
  currentStep={getCurrentStep()}
  finalThesis={finalThesis}
  selectedCategories={sourceCategories}
  methodology={methodology}
  selectedPaperType={selectedPaperType}
  pageCount={paperLength}
  outline={outlineData}
/>
```

### Backend Integration
```python
# routers/structure.py - API endpoint
@router.post("/paper_structure_preview", response_model=PaperStructureResponse)
async def get_paper_structure_preview(request: PaperStructureRequest):
    preview = PaperStructureService.get_structure_preview(
        paper_type=request.paper_type,
        methodology_id=request.methodology_id,
        sub_methodology_id=request.sub_methodology_id
    )
    return PaperStructureResponse(**preview)
```

### Schema Integration
```python
# schemas/structure.py - Data contracts
class PaperStructureRequest(BaseModel):
    paper_type: str
    methodology_id: Optional[str] = None
    sub_methodology_id: Optional[str] = None
    page_count: Optional[int] = 10

class PaperStructureResponse(BaseModel):
    structure: List[str]
    total_sections: int
    has_methodology_sections: bool
    # ... additional metadata
```

## Technical Features

### 1. **Responsive Design**
- Fixed 500px panel width
- Full height with overflow scrolling
- Bootstrap integration for consistent styling
- Icon integration with Bootstrap Icons

### 2. **State Synchronization** 
- Real-time updates from App.jsx state
- Automatic structure preview loading
- Progress tracking with visual indicators

### 3. **Error Handling**
- Graceful degradation for API failures
- Loading states for async operations
- Fallback content when data unavailable

### 4. **Performance Optimization**
- Debounced API calls via useEffect dependencies
- Lazy loading of structure preview
- Minimal re-renders through proper state management

## Extension Points

### Adding New Workflow Steps
1. **Update getCurrentStep()** in App.jsx with new step logic
2. **Add step explanation** in ContextService.getStepExplanation()
3. **Update progress indicators** in ContextPanel.jsx

### Adding New Context Information
1. **Extend ContextPanel** with new sections
2. **Add business logic** to ContextService if needed  
3. **Update backend API** if additional data required

### Customizing Structure Analysis
1. **Extend getStructureExplanation()** in ContextService
2. **Add new section type detection** logic
3. **Update PaperStructureService** for enhanced metadata

## Dependencies

### Frontend Dependencies
- React hooks (useState, useEffect)
- Axios for HTTP requests
- Bootstrap for styling
- Bootstrap Icons for UI elements

### Backend Dependencies  
- FastAPI for API endpoints
- Pydantic for schema validation
- PaperStructureService for structure logic
- AWS Bedrock integration (inherited)

## Future Enhancements

### Planned Features
- **Export Context**: Allow users to export current context as PDF/text
- **Context History**: Track context changes over time
- **Smart Suggestions**: AI-powered recommendations based on context
- **Collaboration**: Share context with team members

### Technical Improvements
- **Caching**: Implement structure preview caching
- **WebSocket**: Real-time updates without polling
- **Accessibility**: Enhanced screen reader support
- **Mobile**: Responsive design for mobile devices

This Context Button feature provides comprehensive visibility into the research paper generation workflow while maintaining clean separation of concerns and following established React/FastAPI patterns.