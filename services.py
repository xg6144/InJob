import requests
import json
from typing import List, Dict, Optional
from utils import format_response

OLLAMA_API_URL = "http://localhost:11434/api/generate"
COVERLETTER_MODEL = "qwq:32b"
INTERVIEW_MODEL = "phi4:latest"
ENGLISH_TUTOR_MODEL = "phi4:latest"

def generate_coverletter_coaching(cover_letter: str, field: str, options: List[str]) -> str:
    analysis_requests = []
    if "strength" in options:
        analysis_requests.append("- 자기소개서의 강점 3-5가지를 분석하고 [강점] 태그로 시작해 각 항목을 -로 시작하는 불릿으로 나열해주세요.")
    if "weakness" in options:
        analysis_requests.append("- 자기소개서의 약점이나 개선할 부분 3-5가지를 분석하고 [약점] 태그로 시작해 각 항목을 -로 시작하는 불릿으로 나열해주세요.")
    if "improvement" in options:
        analysis_requests.append("- 자기소개서의 내용을 유지하되, 표현과 구성을 개선한 새 버전을 [개선된 자기소개서] 태그로 제공해주세요.")
    if "feedback" in options:
        analysis_requests.append("- 구체적인 피드백 포인트를 [피드백:긍정], [피드백:부정], [피드백] 태그를 사용해 표시해주세요.")
        analysis_requests.append("- 특히 강조하고 싶은 부분은 [하이라이트] 태그로 표시해주세요.")

    prompt = f"""다음 자기소개서를 분석하고 '{field}' 직무 지원자를 위한 코칭을 제공해주세요.

{' '.join(analysis_requests)}

코칭 결과에서 다음 형식을 반드시 지켜주세요:
1. 소제목은 '### 제목' 형식으로 작성
2. 강점과 약점은 각각 [강점], [약점] 태그로 시작하고 불릿 포인트(-)로 항목 나열
3. 개선된 자기소개서는 [개선된 자기소개서] 태그로 시작
4. 그 외 태그([피드백:긍정], [피드백:부정], [하이라이트] 등)는 지정된 대로 사용
5. 중첩된 태그나 불필요한 마크다운 요소는 사용하지 않음

먼저 전체 소개 및 총평을 제공한 후, 요청된 분석을 순서대로 제공해주세요.
마지막에는 간단한 격려와 함께 결론을 제시해주세요.

자기소개서:
{cover_letter}
"""

    payload = {
        "model": COVERLETTER_MODEL, 
        "prompt": prompt, 
        "max_tokens": 2048, 
        "temperature": 0.7, 
        "top_p": 0.9
    }
    response = requests.post(OLLAMA_API_URL, json=payload, stream=False)
    if response.status_code == 200:
        result = "".join(json.loads(line).get("response", "") for line in response.text.splitlines() if line)
        return format_response(result.strip())
    return "코칭 생성 중 오류가 발생했어요. 다시 시도해 주세요!"

def generate_interview_question(job_field: str, interview_type: str, previous_qa: List[Dict] = None) -> Dict:
    context = ""
    if previous_qa and len(previous_qa) > 0:
        context = "이전 대화 내용:\n"
        for qa in previous_qa:
            context += f"면접관: {qa['question']}\n"
            context += f"지원자: {qa['answer']}\n"
    
    interview_type_desc = {
        "basic": "직무 관련 기본적인 질문을",
        "behavioral": "과거 경험과 상황 대처 방식에 관한 질문을",
        "technical": "직무 관련 기술적 지식을 평가하는 질문을",
        "stress": "스트레스 상황에서의 대응력을 평가하는 질문을"
    }
    
    type_desc = interview_type_desc.get(interview_type, "기본적인 질문을")
    
    prompt = f"""당신은 '{job_field}' 직무의 전문 면접관입니다. {type_desc} 해야 합니다.

{context}

지금까지의 대화 흐름을 고려하여 다음 질문을 1개만 생성해주세요. 질문만 출력하고, 설명이나 안내 문구는 포함하지 마세요.
"""

    payload = {
        "model": INTERVIEW_MODEL, 
        "prompt": prompt, 
        "max_tokens": 128, 
        "temperature": 0.7
    }
    response = requests.post(OLLAMA_API_URL, json=payload, stream=False)
    
    if response.status_code == 200:
        result = "".join(json.loads(line).get("response", "") for line in response.text.splitlines() if line)
        return {"question": result.strip()}
    
    return {"question": "면접 질문을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요."}

def generate_interview_feedback(job_field: str, interview_type: str, question: str, answer: str) -> str:
    prompt = f"""당신은 '{job_field}' 직무의 전문 면접관입니다. 다음 질문과 답변을 평가해 간략한 피드백을 제공해주세요:

질문: {question}

지원자 답변: {answer}

답변에 대한 간략한 피드백을 제공해주세요. 강점과 개선할 점을 포함하되, 3-4문장 내로 간결하게 작성해주세요.
"""

    payload = {
        "model": INTERVIEW_MODEL, 
        "prompt": prompt, 
        "max_tokens": 256, 
        "temperature": 0.7
    }
    response = requests.post(OLLAMA_API_URL, json=payload, stream=False)
    
    if response.status_code == 200:
        result = "".join(json.loads(line).get("response", "") for line in response.text.splitlines() if line)
        return result.strip()
    
    return None

def generate_toeic_question(question_type: str, difficulty: str, topic: str) -> Dict:
    difficulty_desc = {
        "beginner": "초급 수준의",
        "intermediate": "중급 수준의",
        "advanced": "고급 수준의"
    }

    topic_desc = "다양한 주제의" if topic == "random" else f"{topic} 주제의"

    if question_type == "LC":
        prompt = f"""TOEIC {difficulty_desc.get(difficulty, "")} Listening Comprehension 문제를 다음 형식으로 생성해주세요:

### 지문
(영어 대화문 또는 독백)

### 질문
(영어 질문)
A) (선택지 A)
B) (선택지 B)
C) (선택지 C)
D) (선택지 D)

### 정답
(A, B, C, D 중 하나만 작성)

### 해설
(한국어로 간략한 해설)

정답은 A, B, C, D 중에서 골고루 선택해주세요.
"""
    else:  # RC
        prompt = f"""TOEIC {difficulty_desc.get(difficulty, "")} Reading Comprehension {topic_desc} 문제를 다음 형식으로 생성해주세요:

### 지문
(영어 지문)

### 질문
(영어 질문)
A) (선택지 A)
B) (선택지 B)
C) (선택지 C)
D) (선택지 D)

### 정답
(A, B, C, D 중 하나만 작성)

### 해설
(한국어로 간략한 해설)

정답은 A, B, C, D 중에서 골고루 선택해주세요.
"""

    payload = {
        "model": ENGLISH_TUTOR_MODEL, 
        "prompt": prompt, 
        "max_tokens": 1024, 
        "temperature": 0.7
    }
    response = requests.post(OLLAMA_API_URL, json=payload, stream=False)

    if response.status_code == 200:
        result = "".join(json.loads(line).get("response", "") for line in response.text.splitlines() if line)

        sections = {}
        current_section = None
        current_content = []

        for line in result.split('\n'):
            if line.startswith('### '):
                if current_section:
                    sections[current_section] = '\n'.join(current_content).strip()
                    current_content = []
                current_section = line[4:].strip()
            elif current_section:
                current_content.append(line)

        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()

        problem_text = ""
        correct_answer = ""
        explanation = ""

        if '지문' in sections and '질문' in sections:
            problem_text = f"### 지문\n{sections['지문']}\n\n### 질문\n{sections['질문']}"

        if '정답' in sections:
            correct_answer = sections['정답'].strip().upper()
            if len(correct_answer) > 1 and correct_answer[0] in "ABCD":
                correct_answer = correct_answer[0]

        if '해설' in sections:
            explanation = sections['해설']

        if not problem_text:
            problem_text = result

        if not correct_answer or correct_answer not in "ABCD":
            import random
            correct_answer = random.choice(["A", "B", "C", "D"])

        if not explanation:
            explanation = "해설을 확인할 수 없습니다."

        return {
            "problemText": problem_text,
            "correctAnswer": correct_answer,
            "explanation": explanation
        }

    return {
        "problemText": "문제 생성 중 오류가 발생했습니다.",
        "correctAnswer": "",
        "explanation": "문제를 생성할 수 없습니다. 다시 시도해주세요."
    }

def generate_english_feedback(problem_text: str, correct_answer: str, user_answer: str) -> str:
    prompt = f"""다음 TOEIC 문제와 정답, 그리고 학생의 답변을 분석하여 학습 피드백을 제공해주세요:

문제: {problem_text}

정답: {correct_answer}

학생 답변: {user_answer}

한국어로 상세한 피드백을 제공해주세요. 다음 내용을 포함해 주세요:
1. 학생의 답변이 맞았는지 여부
2. 왜 정답이 맞고 다른 답이 틀렸는지 상세히 설명
3. 학생이 틀렸다면 어떤 점을 오해했을 수 있는지
4. 이런 유형의 문제를 더 잘 풀기 위한 학습 전략과 조언

피드백:
"""

    payload = {
        "model": ENGLISH_TUTOR_MODEL, 
        "prompt": prompt, 
        "max_tokens": 512, 
        "temperature": 0.7
    }
    response = requests.post(OLLAMA_API_URL, json=payload, stream=False)
    
    if response.status_code == 200:
        result = "".join(json.loads(line).get("response", "") for line in response.text.splitlines() if line)
        return result
    
    return "피드백 생성 중 오류가 발생했습니다. 다시 시도해주세요."