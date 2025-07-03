from pydantic import BaseModel
from typing import List

class Subsection(BaseModel):
    subsection_title: str
    subsection_context: str

class Section(BaseModel):
    section_title: str
    section_context: str
    subsections: List[Subsection]

class SectionOnly(BaseModel):
    section_title: str
    section_context: str

class MethodologyRequest(BaseModel):
    final_thesis: str
    source_categories: List[str]

class MethodologyResponse(BaseModel):
    methodology: str

class OutlineRequest(BaseModel):
    final_thesis: str
    methodology: str
    paper_length_pages: int
    source_categories: List[str]

class OutlineResponse(BaseModel):
    outline: List[Section]

class SectionsRequest(BaseModel):
    final_thesis: str
    methodology: str
    paper_length_pages: int
    source_categories: List[str]

class SectionsResponse(BaseModel):
    sections: List[SectionOnly]

class SubsectionsRequest(BaseModel):
    final_thesis: str
    methodology: str
    section_title: str
    section_context: str
    paper_length_pages: int
    source_categories: List[str]

class SubsectionsResponse(BaseModel):
    subsections: List[Subsection]

class QuestionsRequest(BaseModel):
    final_thesis: str
    methodology: str
    section_title: str
    section_context: str
    subsection_title: str
    subsection_context: str

class QuestionsResponse(BaseModel):
    questions: List[str]