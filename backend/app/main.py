from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import refinement, structure, sources, general

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(refinement.router, prefix="", tags=["Thesis Refinement"])
app.include_router(structure.router, prefix="", tags=["Document Structure"])
app.include_router(sources.router, prefix="", tags=["Sources & Citations"])
app.include_router(general.router, prefix="", tags=["General AI"])
