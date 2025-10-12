# Copilot Instructions for Report Generator

## Architecture Overview

This is an AI-powered research paper generator with a **React + Vite frontend** and **FastAPI backend**. The system integrates with **AWS Bedrock (Claude 3 Sonnet)** for AI generation and **AWS OpenSearch** for document retrieval.

### Key Components
- **Backend**: FastAPI app in `/backend` with modular router structure 
- **Frontend**: React SPA in `/frontend` with component-based UI and context state management
- **AI Integration**: AWS Bedrock service for content generation via `bedrock_service.py`
- **Data Flow**: Pydantic schemas define strict API contracts between frontend/backend

## Development Patterns

### Backend Structure
- **Routers**: Each feature has its own router (e.g., `outline.py`, `methodology.py`) with specific endpoints
- **Schemas**: Pydantic models in `/schemas` define request/response structures - always use existing schemas or extend them
- **Services**: Business logic lives in `/services` - especially AWS integrations in `bedrock_service.py`
- **Error Handling**: Use FastAPI's `HTTPException` with descriptive error messages

### Frontend Patterns
- **State Management**: Uses React Context (`ThesisContext.jsx`) and local state - avoid prop drilling
- **Component Structure**: Self-contained components with co-located CSS files (e.g., `FinalOutline.jsx` + `FinalOutline.css`)
- **API Integration**: Uses Axios for backend calls - follow existing error handling patterns in components
- **Project Management**: Local storage-based project persistence via `ProjectManager.jsx`

### Paper Generation Workflow
1. **Framework Phase**: Paper type selection → thesis refinement → source categories → methodology
2. **Outline Phase**: AI generates structured outlines based on paper type templates in `paper_structure_service.py`
3. **Draft Phase**: Section-by-section content generation with citation integration
4. **Final Phase**: Complete paper assembly with proper formatting

## Critical Conventions

### AWS Integration
- **Bedrock Service**: Use `invoke_bedrock(prompt)` function - handles retries and error handling
- **Model**: Always use "anthropic.claude-3-sonnet-20240229-v1:0" model ID
- **Prompts**: Structure prompts for academic writing - see existing routers for examples
- **Environment**: Requires `AWS_REGION` and `OPENSEARCH_ENDPOINT` in backend `.env`

### Data Models
- **Paper Types**: Use predefined types from `PaperStructureService.PAPER_TYPE_SKELETONS` 
- **Schemas**: Import from specific schema modules (e.g., `from schemas.outline import OutlineGenerationRequest`)
- **Response Format**: Always return structured responses matching Pydantic models

### Frontend State Flow
- **Tab Navigation**: `activeTab` state controls workflow progression (framework → outline → draft → final)
- **Finalization Flags**: Use boolean flags like `thesisFinalized`, `categoriesFinalized` to control UI flow
- **Auto-save**: Project state automatically persists to localStorage via `ProjectManager`

## Development Workflow

### Running the Application
```bash
# Backend (Terminal 1)
cd backend
source venv/bin/activate  # or python3 -m venv venv first time
uvicorn app.main:app --reload --port 8000

# Frontend (Terminal 2) 
cd frontend
npm run dev  # Runs on http://localhost:5173
```

### Adding New Features
1. **API Endpoint**: Create router in `/backend/routers/` with Pydantic schemas
2. **Frontend Component**: Add to `/frontend/src/components/` with associated CSS
3. **Integration**: Update `App.jsx` state management and add to appropriate workflow tab
4. **Testing**: Add tests in `/tests/` following the boto3 mocking pattern

### Common Gotchas
- **CORS**: Frontend dev server runs on port 5173, but CORS allows 5174 - check `main.py` if connection issues
- **AWS Credentials**: Must be configured at system level for boto3 - not in code
- **Model Responses**: Claude responses are nested in `content[0].text` - see `bedrock_service.py`
- **Paper Structure**: Each paper type has predefined section templates - don't hardcode structures

## File Patterns to Follow

When working with this codebase:
- **Routers**: Follow the pattern in `general.py` for simple endpoints, `outline.py` for complex multi-step generation
- **Components**: Look at `ProjectManager.jsx` for complex state management, `ThesisRefinement.jsx` for AI integration
- **Schemas**: Extend existing patterns in `structure.py` - use `Optional` for non-required fields
- **Services**: Follow `bedrock_service.py` for external API integration with proper error handling