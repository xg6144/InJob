from typing import List, Optional
from pydantic import BaseModel

class AnswerRequest(BaseModel):
    answer: str
    session_id: Optional[str] = None

class EnglishQuestionRequest(BaseModel):
    question_type: str  # "LC" 또는 "RC"
    difficulty: str     # "beginner", "intermediate", "advanced"
    topic: str          # 특정 주제 또는 "random"

class EnglishAnswerRequest(BaseModel):
    session_id: str
    user_answer: str