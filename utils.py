import re

def format_response(text: str) -> str:
    # 불필요한 태그와 생각 과정 제거
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    text = re.sub(r'\{=html\}', '', text)
    text = re.sub(r'```text```', '', text)
    text = re.sub(r'```text(.+?)```', r'\1', text, flags=re.DOTALL)
    text = re.sub(r'---+', '', text)
    
    # 소제목 처리
    text = re.sub(r'###\s*(.+?)(?=\n|$)', r'<div class="analysis-section"><h3 class="analysis-title">\1</h3>', text)
    
    # 일관된 섹션 구분을 위해 추가 작업
    sections = []
    current_section = ""
    
    for line in text.split('\n'):
        if re.match(r'<div class="analysis-section"><h3', line):
            if current_section:
                sections.append(current_section)
            current_section = line
        else:
            current_section += '\n' + line if current_section else line
    
    if current_section:
        sections.append(current_section)
    
    # 각 섹션 종료 태그 추가
    for i in range(len(sections)):
        if not sections[i].endswith('</div>'):
            sections[i] += '</div>'
    
    text = '\n'.join(sections)
    
    # 태그가 하나도 없는 경우의 특별 처리
    if '<div class="analysis-section">' not in text:
        text = f'<div class="analysis-section"><h3 class="analysis-title">자기소개서 분석</h3>{text}</div>'
    
    # 강조 텍스트
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    
    # 특수 태그 처리
    text = re.sub(r'\[강점\](.*?)(?=\[|$)', lambda m: f'<div class="analysis-section"><h3 class="analysis-title">강점 분석</h3><ul class="point-list strengths">{format_list_items(m.group(1))}</ul></div>', text, flags=re.DOTALL)
    text = re.sub(r'\[약점\](.*?)(?=\[|$)', lambda m: f'<div class="analysis-section"><h3 class="analysis-title">개선할 부분</h3><ul class="point-list weaknesses">{format_list_items(m.group(1))}</ul></div>', text, flags=re.DOTALL)
    text = re.sub(r'\[개선된 자기소개서\](.*?)(?=\[|$)', lambda m: f'<div class="analysis-section"><h3 class="analysis-title">개선된 버전</h3><div class="revised-version">{m.group(1).strip()}</div></div>', text, flags=re.DOTALL)
    
    # 피드백 태그
    text = re.sub(r'\[피드백:긍정\](.+?)\[/피드백\]', r'<span class="feedback-tag positive">\1</span>', text)
    text = re.sub(r'\[피드백:부정\](.+?)\[/피드백\]', r'<span class="feedback-tag negative">\1</span>', text)
    text = re.sub(r'\[피드백\](.+?)\[/피드백\]', r'<span class="feedback-tag">\1</span>', text)
    
    # 하이라이트
    text = re.sub(r'\[하이라이트\](.+?)\[/하이라이트\]', r'<span class="feedback-highlight">\1</span>', text)
    
    # 기타 마크다운 정리
    text = re.sub(r'#\s+\[', '[', text)
    text = re.sub(r'\*\s+', '• ', text)
    
    # 단락 처리
    paragraphs = []
    for section in text.split('</div>'):
        if '<div class=' not in section:
            continue
        inner_content = re.sub(r'<div class=.+?><h3.+?</h3>', '', section)
        if not inner_content.strip():
            continue
        if '<ul class=' not in inner_content and '<div class="revised-version">' not in inner_content:
            inner_content = re.sub(r'\n{2,}', '</p><p>', inner_content)
            inner_content = f'<p>{inner_content}</p>' if not inner_content.startswith('<p>') else inner_content
            inner_content = re.sub(r'<p><p>', '<p>', inner_content)
            inner_content = re.sub(r'</p></p>', '</p>', inner_content)
        header = re.search(r'<div class=.+?><h3.+?</h3>', section)
        if header:
            section = header.group(0) + inner_content + '</div>'
            paragraphs.append(section)
    
    text = ''.join(paragraphs)
    text = re.sub(r'\n(?!<)', '<br>', text)
    
    return text

def format_list_items(text: str) -> str:
    items = re.findall(r'[-*]\s*(.*?)(?=[-*]|\Z)', text, re.DOTALL)
    return ''.join([f'<li>{item.strip()}</li>' for item in items if item.strip()])