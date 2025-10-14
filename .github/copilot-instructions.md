# Copilot Instructions for Report Generator

## Architecture Overview

This is an AI-powered research paper generator with a **React + Vite frontend** and **FastAPI backend**. The system integrates with **AWS Bedrock (Claude 3 Sonnet)** for AI generation and **AWS OpenSearch** for document retrieval.

### Key Components
- **Backend**: FastAPI app in `/backend` with modular router structure 
- **Frontend**: React SPA in `/frontend` with component-based UI and local state management
- **AI Integration**: AWS Bedrock service for content generation via `bedrock_service.py`
- **Data Flow**: Pydantic schemas define strict API contracts between frontend/backend

## Critical Development Patterns

### Multi-Phase Component Pattern
Components like `DataAndObservations.jsx` use **sequential phases** controlled by `currentPhase` state:
- Phase 1: Analysis/Identification → Phase 2: Building/Generation → Phase 3: Review/Integration
- Each phase has distinct UI, API calls, and state management
- **Always declare ALL state variables** used across phases (common bug: missing `setErrorMessage`, `isAnalyzing` etc.)

### Backend Router Structure
Each router follows this pattern (see `data_and_observations.py`):
- Import schemas from matching `/schemas` module 
- Use `@router.post("/endpoint", response_model=Schema)` with Pydantic validation
- Call `invoke_bedrock(prompt)` for AI generation with structured prompts
- Return structured JSON matching response schema - **never plain strings**

### Frontend State Management
App.jsx manages global workflow state:
- `activeTab` controls progression: `'framework' → 'outline' → 'draft' → 'final'`
- Boolean completion flags: `frameworkComplete`, `thesisFinalized`, `categoriesFinalized`
- Data flows: `outlineData` → `draftData` → `draft2Data` → final assembly
- **Project persistence**: All state auto-saves to localStorage via `ProjectManager`

### AWS Bedrock Integration
Critical patterns in `bedrock_service.py`:
- Always use `"anthropic.claude-3-sonnet-20240229-v1:0"` model ID
- Response structure: `response_body['content'][0]['text']` - responses are nested arrays
- Error handling with retries and exponential backoff built-in
- Environment: Requires `AWS_REGION` in `.env`, credentials via AWS CLI/IAM

## Paper Generation Workflow

**Sequential phases** (must complete in order):
1. **Framework**: `PaperTypeSelector` → `ThesisRefinement` → `SourceCategories` → `MethodologyGenerator`
2. **Outline**: `OutlineFrameworkGenerator` creates structured outline from paper type templates
3. **Draft**: `LiteratureReview` → `DataAndObservations` builds sections iteratively into academic prose
4. **Final**: `FinalOutline` assembles complete paper with citations and formatting

### Paper Type System
`PaperStructureService.PAPER_TYPE_SKELETONS` defines templates:
- `"argumentative"`: Claim/evidence structure with counterarguments
- `"analytical"`: Framework-based analysis with components  
- `"expository"`: Topic exploration with systematic coverage
- **Never hardcode structures** - always reference these templates

## Development Workflow

### Running the Application
```bash
# Backend (Terminal 1) - Must run first
cd backend
source venv/bin/activate  
uvicorn app.main:app --reload --port 8000

# Frontend (Terminal 2)
cd frontend  
npm run dev  # http://localhost:5173
```

### Adding New Features
1. **Schema First**: Define Pydantic models in `/backend/schemas/`
2. **Router**: Create endpoint in `/backend/routers/` importing schema
3. **Component**: Add to `/frontend/src/components/` following multi-phase pattern if complex
4. **Integration**: Update `App.jsx` state and routing, add to appropriate workflow tab

### Testing Patterns
Follow `/tests/test_bedrock_kb.py` approach:
- Mock `boto3.client` with `@patch` decorator
- Use `MagicMock()` for AWS service responses  
- Test both success and error paths for Bedrock calls

## Common Issues & Fixes

### CORS Problems
- Frontend dev runs on :5173, CORS allows :5173, :5174, :3000 in `main.py`
- If connection fails, check backend is running and ports match

### Component State Bugs  
- **Missing state declarations**: Components often use variables not declared in useState
- **Function naming**: JSX calls must match function names (e.g. `onClick={handleAnalyzeDataSections}`)
- **Phase management**: Ensure `currentPhase` updates trigger proper UI changes

### AWS Integration Issues
- **Credentials**: Must be configured system-wide (AWS CLI), not in code
- **Model responses**: Always access via `content[0].text`, never directly
- **Timeouts**: Bedrock calls can take 10-30 seconds, ensure UI shows loading states

### Data Flow Errors
- **Schema mismatches**: Frontend/backend must use exact same field names
- **Array wrapping**: Draft data often wrapped in objects, extract with `draftData.outline || draftData`
- **Type conversion**: Methodology may be string or object, handle both cases

## File Reference Patterns

- **Complex State**: `App.jsx` (575 lines) - main state orchestration
- **Multi-phase UI**: `DataAndObservations.jsx` - sequential workflow pattern  
- **AWS Integration**: `bedrock_service.py` - error handling and response parsing
- **Schema Design**: `data_and_observations.py` - nested Pydantic models with citations
- **Paper Templates**: `paper_structure_service.py` - predefined academic structures