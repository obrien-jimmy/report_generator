from pydantic import BaseModel, Field
from typing import List, Optional

class ThesisInteraction(BaseModel):
    current_topic: str
    user_responses: Optional[List[str]] = Field(default_factory=list)
    history: Optional[List[str]] = Field(default_factory=list)

class AutoRefineRequest(BaseModel):
    thesis: str
    paper_type: Optional[str] = Field(default="General Paper")
    paper_purpose: Optional[str] = Field(default="To present information and analysis")
    paper_tone: Optional[str] = Field(default="Academic, objective")
    paper_structure: Optional[str] = Field(default="Introduction → Body → Conclusion")

class AutoRefineResponse(BaseModel):
    refined_thesis: str

class ProbingQuestionsRequest(BaseModel):
    thesis: str
    paper_type: Optional[str] = Field(default="General Paper")
    paper_purpose: Optional[str] = Field(default="To present information and analysis")
    paper_tone: Optional[str] = Field(default="Academic, objective")

class ProbingQuestionsResponse(BaseModel):
    questions: List[str]

class AnswerProbingQuestionsRequest(BaseModel):
    thesis: str
    questions: List[str]
    answers: List[str]
    paper_type: Optional[str] = Field(default="General Paper")
    paper_purpose: Optional[str] = Field(default="To present information and analysis")
    paper_tone: Optional[str] = Field(default="Academic, objective")

class PromptRequest(BaseModel):
    prompt: str

