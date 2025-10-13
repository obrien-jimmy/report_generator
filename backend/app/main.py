from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import methodology, outline, outlinedraft1, outlinedraft2, refinement, structure, sources, general, finaloutline, citations

app = FastAPI(title="Socratic AI Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(methodology.router, tags=["methodology"])
app.include_router(outline.router, tags=["outline"])
app.include_router(outlinedraft1.router, tags=["outlinedraft1"])
app.include_router(outlinedraft2.router, tags=["outlinedraft2"])
app.include_router(refinement.router, tags=["refinement"])
app.include_router(structure.router, tags=["structure"])
app.include_router(sources.router, tags=["sources"])
app.include_router(general.router, tags=["general"])
app.include_router(finaloutline.router, tags=["finaloutline"])
app.include_router(citations.router, tags=["citations"])

@app.get("/")
async def root():
    return {"message": "Socratic AI Backend is running"}

# Add a basic knowledge base endpoint since your frontend might be calling it
from pydantic import BaseModel

class KnowledgeBaseResult(BaseModel):
    content: dict
    score: float

class KnowledgeBaseResponse(BaseModel):
    results: list[KnowledgeBaseResult]

@app.get("/api/query_kb")
async def query_knowledge_base(query: str):
    """Basic placeholder for knowledge base querying"""
    try:
        # This is a placeholder implementation
        results = [
            KnowledgeBaseResult(
                content={"text": f"Sample knowledge base result for: {query}"},
                score=0.95
            )
        ]
        return KnowledgeBaseResponse(results=results)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Error querying knowledge base: {str(e)}")