from fastapi import APIRouter, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from models import AnswerRequest, EnglishAnswerRequest
from services import (
    generate_coverletter_coaching,
    generate_interview_question,
    generate_interview_feedback,
    generate_toeic_question,
    generate_english_feedback
)
import uuid
from typing import List, Optional

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# 세션 저장소
interview_sessions = {}
english_tutor_sessions = {}

@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/coverletter", response_class=HTMLResponse)
async def coverletter_page(request: Request):
    return templates.TemplateResponse("coverletter.html", {"request": request})

@router.post("/coverletter")
async def coverletter_coaching(
    request: Request,
    cover_letter: str = Form(None),
    application_field: str = Form(None),
    analysis_option: Optional[List[str]] = Form(None)
):
    # 디버깅을 위한 로깅 추가
    print("Received form data:")
    print(f"cover_letter: {cover_letter and len(cover_letter)} 자")
    print(f"application_field: {application_field}")
    print(f"analysis_option: {analysis_option}")
    
    # 폼 데이터 유효성 검사
    if not cover_letter:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "자기소개서를 입력해주세요."}
        )
    
    if not application_field:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "지원 분야를 선택해주세요."}
        )
    
    if len(cover_letter.strip()) < 300:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "자기소개서는 최소 300자 이상 작성해주세요."}
        )
    
    if not analysis_option:
        analysis_option = ["strength", "weakness", "improvement"]
    
    try:
        coaching_result = generate_coverletter_coaching(cover_letter, application_field, analysis_option)
        return JSONResponse(content={"coaching_result": coaching_result, "status": "success"})
    except Exception as e:
        print(f"Error in coverletter_coaching: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"코칭 생성 중 오류가 발생했습니다: {str(e)}"}
        )

@router.get("/interview", response_class=HTMLResponse)
async def interview_page(request: Request):
    return templates.TemplateResponse("interview.html", {"request": request})

@router.post("/interview/start")
async def start_interview(
    request: Request,
    job_field: str = Form(...),
    interview_type: str = Form(...),
    feedback: Optional[bool] = Form(False),
    record: Optional[bool] = Form(False),
    tips: Optional[bool] = Form(False)
):
    if not job_field:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "지원 분야를 선택해주세요."}
        )
    
    session_id = str(uuid.uuid4())
    interview_sessions[session_id] = {
        "job_field": job_field,
        "interview_type": interview_type,
        "feedback_enabled": feedback,
        "record_enabled": record,
        "tips_enabled": tips,
        "qa_history": [],
        "current_question": None
    }
    
    first_question_data = generate_interview_question(job_field, interview_type)
    interview_sessions[session_id]["current_question"] = first_question_data["question"]
    
    return JSONResponse(content={
        "status": "success",
        "session_id": session_id,
        "first_question": first_question_data["question"]
    })

@router.post("/interview/answer")
async def process_answer(request: Request, answer_data: AnswerRequest):
    session_id = answer_data.session_id
    if not session_id or session_id not in interview_sessions:
        raise HTTPException(status_code=400, detail="유효하지 않은 세션입니다.")
    
    session = interview_sessions[session_id]
    current_question = session["current_question"]
    
    qa_pair = {"question": current_question, "answer": answer_data.answer}
    session["qa_history"].append(qa_pair)
    
    feedback = None
    if session["feedback_enabled"]:
        feedback = generate_interview_feedback(
            session["job_field"], 
            session["interview_type"], 
            current_question, 
            answer_data.answer
        )
    
    next_question_data = generate_interview_question(
        session["job_field"], 
        session["interview_type"], 
        session["qa_history"]
    )
    session["current_question"] = next_question_data["question"]
    
    return JSONResponse(content={
        "status": "success",
        "feedback": feedback,
        "next_question": next_question_data["question"]
    })

@router.post("/interview/end")
async def end_interview(request: Request, session_id: str = Form(...)):
    if not session_id or session_id not in interview_sessions:
        raise HTTPException(status_code=400, detail="유효하지 않은 세션입니다.")
    
    if session_id in interview_sessions:
        del interview_sessions[session_id]
    
    return JSONResponse(content={"status": "success", "message": "면접이 종료되었습니다."})

@router.get("/english-tutor", response_class=HTMLResponse)
async def english_tutor_page(request: Request):
    return templates.TemplateResponse("english-tutor.html", {"request": request})

@router.post("/english-tutor/generate")
async def generate_english_question(
    request: Request,
    question_type: str = Form(...),
    difficulty: str = Form(...),
    topic: str = Form(...)
):
    if question_type not in ["LC", "RC"]:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "유효하지 않은 문제 유형입니다."}
        )
    
    if difficulty not in ["beginner", "intermediate", "advanced"]:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "유효하지 않은 난이도입니다."}
        )
    
    question_data = generate_toeic_question(question_type, difficulty, topic)
    session_id = str(uuid.uuid4())
    
    english_tutor_sessions[session_id] = {
        "question_type": question_type,
        "difficulty": difficulty,
        "topic": topic,
        "problem_text": question_data["problemText"],
        "correct_answer": question_data["correctAnswer"],
        "explanation": question_data["explanation"]
    }
    
    return JSONResponse(content={
        "status": "success",
        "session_id": session_id,
        "problemText": question_data["problemText"],
        "hasExplanation": bool(question_data["explanation"])
    })

@router.post("/english-tutor/check")
async def check_english_answer(request: Request, answer_data: EnglishAnswerRequest):
    session_id = answer_data.session_id
    if not session_id or session_id not in english_tutor_sessions:
        raise HTTPException(status_code=400, detail="유효하지 않은 세션입니다.")
    
    session = english_tutor_sessions[session_id]
    is_correct = answer_data.user_answer.strip().upper() == session["correct_answer"].strip().upper()
    
    return JSONResponse(content={
        "status": "success",
        "isCorrect": is_correct,
        "correctAnswer": session["correct_answer"],
        "explanation": session["explanation"]
    })

@router.post("/english-tutor/feedback")
async def get_english_feedback(request: Request, session_id: str = Form(...), user_answer: str = Form(...)):
    if not session_id or session_id not in english_tutor_sessions:
        raise HTTPException(status_code=400, detail="유효하지 않은 세션입니다.")
    
    session = english_tutor_sessions[session_id]
    feedback = generate_english_feedback(
        session["problem_text"],
        session["correct_answer"],
        user_answer
    )
    
    return JSONResponse(content={
        "status": "success",
        "feedback": feedback
    })