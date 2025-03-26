// 학습 세션 상태
let studySession = {
    currentQuestion: 0,
    targetCount: 5,
    questions: [],
    userAnswers: [],
    isCorrect: [],
    settings: {},
    startTime: null,         // 학습 시작 시간
    endTime: null,           // 학습 종료 시간
    questionStartTimes: [],  // 각 문제별 시작 시간
    questionTimes: []        // 각 문제별 소요 시간 (초)
};

// 마크다운을 HTML로 변환하는 함수
function markdownToHtml(text) {
    let html = text.replace(/### (.*?)(?=\n|$)/g, '<div class="problem-section"><h3>$1</h3>');

    const sections = html.split('<div class="problem-section">');
    if (sections.length > 1) {
        html = sections[0];
        for (let i = 1; i < sections.length; i++) {
            if (i > 1) html += '</div>';
            html += '<div class="problem-section">' + sections[i];
        }
        html += '</div>';
    }

    html = html.replace(/\n\n/g, '</p><p>');

    if (html.includes('<h3>지문</h3>')) {
        const passageStart = html.indexOf('<h3>지문</h3>') + '<h3>지문</h3>'.length;
        let passageEnd = html.includes('<div class="problem-section"><h3>질문</h3>')
            ? html.indexOf('<div class="problem-section"><h3>질문</h3>')
            : html.length;

        const passageContent = html.substring(passageStart, passageEnd);
        const formattedPassage = `<div class="reading-passage">${passageContent}</div>`;
        html = html.substring(0, passageStart) + formattedPassage + html.substring(passageEnd);
    }

    if (html.includes('<h3>질문</h3>')) {
        let questionStart = html.indexOf('<h3>질문</h3>') + '<h3>질문</h3>'.length;
        let questionContent = html.substring(questionStart);

        const optionAIndex = questionContent.indexOf('A)');
        const optionAIndex2 = questionContent.indexOf('A. ');
        let optionStartIndex = optionAIndex !== -1 ? optionAIndex : optionAIndex2;

        if (optionStartIndex !== -1) {
            const questionText = questionContent.substring(0, optionStartIndex).trim();
            const optionsText = questionContent.substring(optionStartIndex);
            const answerOptionsHtml = createAnswerOptions(optionsText);
            const newQuestionHtml = `<div class="question-text">${questionText}</div>${answerOptionsHtml}`;
            html = html.substring(0, questionStart) + newQuestionHtml;
        }
    }

    return html;
}

// 선택지 HTML 생성 함수
function createAnswerOptions(optionsText) {
    const optionsHtml = '<div class="answer-options">';
    const options = [];
    const optionRegexes = [
        /([A-D])\)\s*(.*?)(?=(?:[A-D]\))|$)/gs,
        /([A-D]).\s*(.*?)(?=(?:[A-D].)|$)/gs
    ];

    for (const regex of optionRegexes) {
        let match;
        while ((match = regex.exec(optionsText)) !== null) {
            options.push({ label: match[1], text: match[2].trim() });
        }
        if (options.length > 0) break;
    }

    let optionsHtmlContent = '';
    for (const option of options) {
        optionsHtmlContent += `
            <label class="answer-option" data-value="${option.label}">
                <input type="radio" name="user-answer" value="${option.label}">
                <span class="option-label">${option.label}</span>
                <span class="option-text">${option.text}</span>
            </label>`;
    }

    return optionsHtml + optionsHtmlContent + '</div>';
}

// 진행 상황 업데이트 함수
function updateProgress() {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progress = (studySession.currentQuestion / studySession.targetCount) * 100;

    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${studySession.currentQuestion}/${studySession.targetCount} 문제 완료`;
    document.getElementById('progress-container').style.display = 'block';
}

// 학습 세션 시작 함수
async function startStudySession(event) {
    event.preventDefault();

    const form = document.getElementById('toeic-form');
    const formData = new FormData(form);

    let targetCount = 5;
    try {
        const targetCountValue = formData.get('target_count');
        if (targetCountValue) {
            targetCount = parseInt(targetCountValue) || 5;
        }
    } catch (e) {
        console.error("목표 문제 수 파싱 오류:", e);
    }

    studySession = {
        currentQuestion: 0,
        targetCount: targetCount,
        questions: [],
        userAnswers: [],
        isCorrect: [],
        settings: {
            questionType: formData.get('question_type') || 'RC',
            difficulty: formData.get('difficulty') || 'beginner',
            topic: formData.get('topic') || 'random'
        },
        startTime: new Date(),
        endTime: null,
        questionStartTimes: [],
        questionTimes: []
    };

    updateProgress();
    await generateQuestion();
}

// 문제 생성 함수
async function generateQuestion() {
    const loadingElement = document.getElementById('loading');
    const questionContent = document.getElementById('question-content');
    const questionActive = document.getElementById('question-active');
    const completionScreen = document.getElementById('completion-screen');

    if (studySession.currentQuestion >= studySession.targetCount) {
        // 학습 종료 시간 기록
        studySession.endTime = new Date();

        showCompletionScreen();
        return;
    }

    loadingElement.style.display = 'flex';
    questionContent.style.display = 'none';
    questionActive.style.display = 'none';
    completionScreen.style.display = 'none';

    try {
        const formData = new FormData();
        formData.append('question_type', studySession.settings.questionType);
        formData.append('difficulty', studySession.settings.difficulty);
        formData.append('topic', studySession.settings.topic);

        const response = await fetch('/english-tutor/generate', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            if (result.status === 'success') {
                window.sessionId = result.session_id;
                const htmlContent = markdownToHtml(result.problemText);
                document.getElementById('problem-text').innerHTML = htmlContent;

                loadingElement.style.display = 'none';
                questionActive.style.display = 'block';

                document.getElementById('check-answer').disabled = false;
                document.getElementById('next-question').style.display = 'none';
                document.getElementById('explanation-section').style.display = 'none';

                document.querySelectorAll('.answer-option').forEach(option => {
                    option.addEventListener('click', function () {
                        document.querySelectorAll('.answer-option').forEach(opt => opt.classList.remove('selected'));
                        this.classList.add('selected');
                        this.querySelector('input[type="radio"]').checked = true;
                    });
                    option.style.backgroundColor = '';
                    option.style.borderColor = '';
                });

                // 문제 시작 시간 기록
                studySession.questionStartTimes[studySession.currentQuestion] = new Date();
            } else {
                throw new Error(result.message || '문제 생성 실패');
            }
        } else {
            throw new Error('서버 응답 오류');
        }
    } catch (error) {
        console.error('문제 생성 중 오류:', error);
        loadingElement.style.display = 'none';
        questionContent.style.display = 'block';
        questionContent.classList.remove('empty');
        questionContent.innerHTML = '<p>문제 생성 중 오류가 발생했어요. 다시 시도해 주세요!</p>';
    }
}

// 정답 확인 함수
document.getElementById('check-answer').addEventListener('click', async function () {
    const selectedOption = document.querySelector('.answer-option.selected');
    if (!selectedOption) {
        alert('답변을 선택해주세요.');
        return;
    }

    this.disabled = true;
    const userAnswer = selectedOption.getAttribute('data-value');

    try {
        const response = await fetch('/english-tutor/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: window.sessionId, user_answer: userAnswer })
        });

        if (response.ok) {
            const result = await response.json();
            studySession.userAnswers.push(userAnswer);
            const isCorrect = result.isCorrect;
            studySession.isCorrect.push(isCorrect);

            // 현재 문제 풀이 시간 계산 (초 단위)
            const currentQuestionIndex = studySession.currentQuestion;
            const startTime = studySession.questionStartTimes[currentQuestionIndex];
            const endTime = new Date();
            const timeSpent = Math.round((endTime - startTime) / 1000);
            studySession.questionTimes[currentQuestionIndex] = timeSpent;

            const currentIndex = studySession.currentQuestion;
            if (!studySession.questions[currentIndex]) {
                studySession.questions[currentIndex] = {
                    problemText: document.getElementById('problem-text').innerHTML,
                    correctAnswer: result.correctAnswer,
                    explanation: result.explanation || "해설 정보가 없습니다.",
                    timeSpent: timeSpent
                };
            }

            studySession.currentQuestion++;
            updateProgress();

            const explanationSection = document.getElementById('explanation-section');
            explanationSection.style.display = 'block';

            if (result.isCorrect) {
                selectedOption.style.backgroundColor = '#e6f4ea';
                selectedOption.style.borderColor = '#0f9d58';
                document.getElementById('explanation-content').innerHTML = `
                    <div class="correct-answer">정답입니다! 💯</div>
                    <div class="explanation-content">${result.explanation}</div>
                `;
            } else {
                selectedOption.style.backgroundColor = '#fce8e6';
                selectedOption.style.borderColor = '#d93025';
                const correctOption = document.querySelector(`.answer-option[data-value="${result.correctAnswer}"]`);
                if (correctOption) {
                    correctOption.style.backgroundColor = '#e6f4ea';
                    correctOption.style.borderColor = '#0f9d58';
                }
                document.getElementById('explanation-content').innerHTML = `
                    <div class="wrong-answer">오답입니다. 정답은 ${result.correctAnswer}입니다.</div>
                    <div class="explanation-content">${result.explanation}</div>
                `;
            }

            document.getElementById('next-question').style.display = 'inline-flex';
        } else {
            throw new Error('서버 응답 오류');
        }
    } catch (error) {
        console.error('답변 확인 중 오류:', error);
        alert('답변 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
        this.disabled = false;
    }
});

// 다음 문제 버튼 이벤트
document.getElementById('next-question').addEventListener('click', generateQuestion);

// 학습 완료 화면 표시 함수 개선
function showCompletionScreen() {
    document.getElementById('question-active').style.display = 'none';
    document.getElementById('completion-screen').style.display = 'flex';

    const totalQuestions = studySession.userAnswers.length || 0;
    const correctCount = studySession.isCorrect.filter(Boolean).length || 0;
    const correctPercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 점수 그래프 데이터 계산
    const incorrectCount = totalQuestions - correctCount;

    // 결과 요약 업데이트
    document.getElementById('total-questions').textContent = totalQuestions;
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('correct-percentage').textContent = `${correctPercentage}%`;

    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';

    // 원형 차트 추가
    const chartContainer = document.createElement('div');
    chartContainer.className = 'score-chart-container';
    chartContainer.innerHTML = `
        <div class="score-chart">
            <svg viewBox="0 0 36 36" class="circular-chart">
                <path class="circle-bg" d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path class="circle" stroke-dasharray="${correctPercentage}, 100" d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="19" class="percentage" dominant-baseline="middle" text-anchor="middle">${correctPercentage}%</text>
            </svg>
            <div class="score-details">
                <div class="score-item correct">
                    <span class="score-dot"></span>
                    <span>정답: ${correctCount}문제</span>
                </div>
                <div class="score-item incorrect">
                    <span class="score-dot"></span>
                    <span>오답: ${incorrectCount}문제</span>
                </div>
            </div>
        </div>
    `;

    // 성취 메시지 및 뱃지 생성
    let achievementBadge = '';
    let achievementMessage = '';

    if (correctPercentage >= 90) {
        achievementBadge = 'master';
        achievementMessage = '훌륭합니다! 뛰어난 성적이에요. 🏆';
    } else if (correctPercentage >= 70) {
        achievementBadge = 'expert';
        achievementMessage = '좋은 성적입니다! 꾸준히 학습하세요. 👍';
    } else if (correctPercentage >= 50) {
        achievementBadge = 'intermediate';
        achievementMessage = '좋은 시작입니다. 더 노력하면 좋은 결과가 있을 거예요. 💪';
    } else {
        achievementBadge = 'beginner';
        achievementMessage = '걱정하지 마세요. 학습은 계속되는 과정입니다. 다시 도전해보세요! 🌱';
    }

    const achievementSection = document.createElement('div');
    achievementSection.className = 'achievement-section';
    achievementSection.innerHTML = `
        <div class="achievement-badge ${achievementBadge}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${achievementBadge === 'master'
            ? '<path d="M12 15c3 0 6-2 6-6s-3-6-6-6-6 2-6 6 3 6 6 6z"></path><path d="M3 16.5h18"></path><path d="M12 15v7"></path><path d="M8 22h8"></path>'
            : achievementBadge === 'expert'
                ? '<circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>'
                : achievementBadge === 'intermediate'
                    ? '<path d="m7 11 2-2-2-2"></path><path d="M11 13h4"></path><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>'
                    : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
            </svg>
        </div>
        <div class="achievement-message">${achievementMessage}</div>
    `;

    // 시간 통계 계산
    let totalSolveTime = 0;
    let avgQuestionTime = 0;

    if (studySession.questionTimes && studySession.questionTimes.length > 0) {
        totalSolveTime = studySession.questionTimes.reduce((sum, time) => sum + time, 0);
        avgQuestionTime = Math.round(totalSolveTime / studySession.questionTimes.length);
    }

    let totalStudyTime = 0;
    if (studySession.startTime && studySession.endTime) {
        totalStudyTime = Math.round((studySession.endTime - studySession.startTime) / 60000);
    }

    const statsSection = document.createElement('div');
    statsSection.className = 'stats-section';
    statsSection.innerHTML = `
    <div class="stats-item">
        <div class="stats-value">${totalStudyTime}분</div>
        <div class="stats-label">학습 시간</div>
    </div>
    <div class="stats-item">
        <div class="stats-value">${avgQuestionTime}초</div>
        <div class="stats-label">문제당 평균</div>
    </div>
    <div class="stats-item">
        <div class="stats-value">${correctPercentage}%</div>
        <div class="stats-label">정답률</div>
    </div>
`;

    // 결과 컨테이너에 통계 요소들 추가
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'results-summary';
    summaryContainer.appendChild(chartContainer);
    summaryContainer.appendChild(achievementSection);
    summaryContainer.appendChild(statsSection);

    resultsList.appendChild(summaryContainer);

    // 문제 결과 리스트 생성
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'results-cards-container';
    resultsContainer.innerHTML = '<h3 class="results-section-title">문제별 결과</h3>';

    // 카드들의 래퍼
    const cardsWrapper = document.createElement('div');
    cardsWrapper.className = 'result-cards-wrapper';

    // 문제별 카드 생성
    for (let i = 0; i < totalQuestions; i++) {
        const isCorrect = studySession.isCorrect[i];
        const userAnswer = studySession.userAnswers[i];
        const correctAnswer = studySession.questions[i]?.correctAnswer || '?';
        const timeSpent = studySession.questionTimes[i] || '-';

        const resultItem = document.createElement('div');
        resultItem.className = 'result-card';
        resultItem.classList.add(isCorrect ? 'correct-card' : 'incorrect-card');

        resultItem.innerHTML = `
            <div class="result-card-header">
                <div class="result-number">#${i + 1}</div>
                <div class="result-status">
                    ${isCorrect
                ? '<span class="correct-badge"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> 정답</span>'
                : '<span class="incorrect-badge"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> 오답</span>'}
                </div>
            </div>
            <div class="result-card-body">
                ${!isCorrect
                ? `<div class="answer-comparison">
                    <div class="user-answer">내 답: <strong>${userAnswer}</strong></div>
                    <div class="correct-answer-text">정답: <strong>${correctAnswer}</strong></div>
                  </div>`
                : `<div class="correct-answer-only">정답: <strong>${userAnswer}</strong></div>`}
                <div class="time-spent">소요 시간: ${timeSpent}초</div>
                <button class="btn btn-sm btn-review" data-question="${i}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    다시 보기
                </button>
            </div>
        `;

        cardsWrapper.appendChild(resultItem);
    }

    resultsContainer.appendChild(cardsWrapper);
    resultsList.appendChild(resultsContainer);

    // 버튼들 개선
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'completion-actions';

    actionsContainer.innerHTML = `
        <button id="restart-study" class="btn btn-primary action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 2v6h6"></path>
                <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
            </svg>
            다시 시작하기
        </button>
        <button id="download-results" class="btn btn-secondary action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            결과 다운로드
        </button>
    `;

    document.querySelector('.completion-buttons').innerHTML = '';
    document.querySelector('.completion-buttons').appendChild(actionsContainer);

    // 이벤트 리스너 추가
    document.querySelectorAll('.btn-review').forEach(button => {
        button.addEventListener('click', function () {
            const questionIndex = parseInt(this.getAttribute('data-question'));
            reviewQuestion(questionIndex);
        });
    });

    document.getElementById('restart-study').addEventListener('click', function () {
        document.getElementById('question-content').style.display = 'block';
        document.getElementById('completion-screen').style.display = 'none';
        document.getElementById('progress-container').style.display = 'none';
        document.getElementById('toeic-form').reset();
    });

    document.getElementById('download-results').addEventListener('click', function () {
        // 결과 다운로드 기능 구현 (향후 개발)
        alert('결과 다운로드 기능은 곧 제공될 예정입니다.');
    });
}

// 학습 완료 화면용 CSS 스타일
const completionStyles = `
    /* 결과 스타일 개선 */
    .completion-screen {
        max-width: 800px;
        margin: 0 auto;
        padding: 0;
    }
    
    .completion-title {
        font-size: 1.8rem;
        color: #1a73e8;
        margin-bottom: 5px;
        animation: fadeInUp 0.5s ease forwards;
    }
    
    .completion-icon {
        width: 70px;
        height: 70px;
        background-color: #e8f0fe;
        border-radius: 50%;
        margin-bottom: 15px;
        animation: scaleIn 0.5s ease forwards;
        box-shadow: 0 4px 10px rgba(26, 115, 232, 0.2);
    }
    
    .completion-icon svg {
        width: 35px;
        height: 35px;
        color: #1a73e8;
    }
    
    .completion-summary {
        color: #5f6368;
        font-size: 1.1rem;
        max-width: 500px;
        margin: 0 auto 30px;
        animation: fadeInUp 0.6s ease forwards;
    }
    
    /* 결과 요약 섹션 */
    .results-summary {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 40px;
        gap: 25px;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        animation: fadeInUp 0.7s ease forwards;
    }
    
    /* 점수 차트 */
    .score-chart-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
    }
    
    .score-chart {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
    }
    
    .circular-chart {
        width: 150px;
        height: 150px;
    }
    
    .circle-bg {
        fill: none;
        stroke: #eee;
        stroke-width: 3.8;
    }
    
    .circle {
        fill: none;
        stroke-width: 3.8;
        stroke-linecap: round;
        stroke: #1a73e8;
        animation: progress 1s ease-out forwards;
    }
    
    .percentage {
        fill: #1a73e8;
        font-size: 0.5em;
        text-anchor: middle;
        font-weight: bold;
        animation: fadeIn 1s ease forwards;
        dominant-baseline: middle;
        text-anchor: middle;
    }
    
    .score-details {
        display: flex;
        gap: 20px;
    }
    
    .score-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
    }
    
    .score-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }
    
    .score-item.correct .score-dot {
        background-color: #1a73e8;
    }
    
    .score-item.incorrect .score-dot {
        background-color: #f1f3f4;
        border: 1px solid #dadce0;
    }
    
    /* 성취 뱃지 섹션 */
    .achievement-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }
    
    .achievement-badge {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .achievement-badge svg {
        width: 32px;
        height: 32px;
    }
    
    .achievement-badge.master {
        background-color: #fef7e0;
        color: #f9ab00;
    }
    
    .achievement-badge.expert {
        background-color: #e8f0fe;
        color: #1a73e8;
    }
    
    .achievement-badge.intermediate {
        background-color: #e6f4ea;
        color: #137333;
    }
    
    .achievement-badge.beginner {
        background-color: #f1f3f4;
        color: #5f6368;
    }
    
    .achievement-message {
        font-size: 1.1rem;
        font-weight: 500;
        text-align: center;
        color: #202124;
        max-width: 300px;
    }
    
    /* 통계 섹션 */
    .stats-section {
        display: flex;
        gap: 30px;
        margin-top: 10px;
    }
    
    .stats-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
    }
    
    .stats-value {
        font-size: 1.3rem;
        font-weight: 700;
        color: #202124;
    }
    
    .stats-label {
        font-size: 0.85rem;
        color: #5f6368;
    }
    
    /* 문제 결과 카드 섹션 */
    .results-cards-container {
        margin-top: 20px;
        width: 100%;
        animation: fadeInUp 0.8s ease forwards;
    }
    
    .results-section-title {
        font-size: 1.2rem;
        color: #202124;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e8eaed;
    }
    
    .result-cards-wrapper {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 30px;
    }
    
    .result-card {
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        overflow: hidden;
        transition: all 0.2s ease;
        animation: fadeIn 0.5s ease forwards;
    }
    
    .result-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    }
    
    .result-card-header {
        padding: 12px 15px;
        background-color: #f8f9fa;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .correct-card .result-card-header {
        border-bottom: 2px solid rgba(15, 157, 88, 0.2);
    }
    
    .incorrect-card .result-card-header {
        border-bottom: 2px solid rgba(217, 48, 37, 0.2);
    }
    
    .result-number {
        font-weight: 600;
        color: #5f6368;
    }
    
    .correct-badge, .incorrect-badge {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .correct-badge {
        background-color: rgba(15, 157, 88, 0.1);
        color: #0f9d58;
    }
    
    .incorrect-badge {
        background-color: rgba(217, 48, 37, 0.1);
        color: #d93025;
    }
    
    .result-card-body {
        padding: 15px;
    }
    
    .answer-comparison {
        margin-bottom: 15px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .user-answer {
        color: #d93025;
        font-size: 0.9rem;
    }
    
    .correct-answer-text, .correct-answer-only {
        color: #0f9d58;
        font-size: 0.9rem;
    }
    
    .correct-answer-only {
        margin-bottom: 15px;
    }
    
    .btn-review {
        width: 100%;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 0.85rem;
    }
    
    /* 완료 화면 액션 버튼 */
    .completion-actions {
        display: flex;
        gap: 15px;
        margin-top: 20px;
        margin-bottom: 20px;
    }
    
    .action-btn {
        min-width: 150px;
    }
    
    /* 애니메이션 */
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes scaleIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
    
    @keyframes progress {
        0% { stroke-dasharray: 0 100; }
    }
    
    /* 미디어 쿼리 */
    @media (max-width: 768px) {
        .result-cards-wrapper {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        }
        
        .stats-section {
            gap: 15px;
        }
    }
    
    @media (max-width: 576px) {
        .result-cards-wrapper {
            grid-template-columns: 1fr;
        }
        
        .stats-section {
            flex-direction: column;
            gap: 15px;
        }
        
        .completion-actions {
            flex-direction: column;
        }
    }
`;

// 결과 화면 스타일 추가 함수
function addCompletionStyles() {
    if (!document.getElementById('completion-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'completion-styles';
        styleElement.innerHTML = completionStyles;
        document.head.appendChild(styleElement);
    }
}

// 페이지 로드 시 스타일 추가
window.addEventListener('load', addCompletionStyles);

// 다시 시작하기 버튼
document.getElementById('restart-study').addEventListener('click', function () {
    document.getElementById('question-content').style.display = 'block';
    document.getElementById('completion-screen').style.display = 'none';
    document.getElementById('progress-container').style.display = 'none';
    document.getElementById('toeic-form').reset();
});

// 문제 다시 보기 함수
function reviewQuestion(index) {
    const modal = document.createElement('div');
    modal.className = 'review-modal';

    const question = studySession.questions[index];
    const userAnswer = studySession.userAnswers[index];
    const isCorrect = studySession.isCorrect[index];

    if (!question) {
        alert('문제 정보를 찾을 수 없습니다.');
        return;
    }

    modal.innerHTML = `
        <div class="review-modal-content">
            <div class="review-modal-header">
                <h3>문제 #${index + 1} 상세 보기</h3>
                <button class="modal-close-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="review-modal-body">
                ${question.problemText}
                <div class="review-answer-section">
                    <div class="review-answer ${isCorrect ? 'correct-answer' : 'wrong-answer'}">
                        ${isCorrect
            ? `<div>✓ 정답입니다! 선택한 답: ${userAnswer}</div>`
            : `<div>✗ 오답입니다. 내 답변: ${userAnswer} (정답: ${question.correctAnswer})</div>`}
                    </div>
                    <div class="review-explanation">
                        <h4>해설</h4>
                        <div>${question.explanation || '해설 정보가 없습니다.'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.modal-close-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// 결과 스타일 추가 (필요 시 CSS 파일로 이동 가능)
const resultStyles = `
    <style>
        .results-list { display: flex; flex-direction: column; gap: 12px; margin: 25px 0; max-height: 400px; overflow-y: auto; padding: 0 5px; }
        .result-card { background-color: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden; transition: all 0.2s ease; }
        .result-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); }
        .correct-card { border-left: 4px solid #4CAF50; }
        .incorrect-card { border-left: 4px solid #f44336; }
        .result-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background-color: #f9f9f9; border-bottom: 1px solid #eee; }
        .result-number { font-weight: 700; color: #1a73e8; }
        .result-status { display: flex; align-items: center; }
        .correct-badge, .incorrect-badge { display: flex; align-items: center; gap: 5px; font-weight: 500; }
        .correct-badge { color: #4CAF50; }
        .incorrect-badge { color: #f44336; }
        .result-card-body { padding: 15px; }
        .answer-comparison { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
        .user-answer { color: #f44336; }
        .correct-answer, .correct-answer-only { color: #4CAF50; margin-bottom: 12px; }
        .btn-sm { padding: 6px 12px; font-size: 0.8rem; }
        .btn-review { display: inline-flex; align-items: center; gap: 6px; background-color: #f1f3f4; color: #5f6368; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; }
        .btn-review:hover { background-color: #e0e0e0; }
        .review-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .review-modal-content { background-color: #fff; border-radius: 12px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); }
        .review-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #eee; }
        .review-modal-header h3 { margin: 0; color: #1a73e8; }
        .modal-close-btn { background: none; border: none; cursor: pointer; color: #5f6368; }
        .review-modal-body { padding: 20px; }
        .review-answer-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        .review-answer { padding: 12px; border-radius: 8px; margin-bottom: 15px; font-weight: 500; }
        .review-answer.correct-answer { background-color: #e6f4ea; color: #0f9d58; }
        .review-answer.wrong-answer { background-color: #fce8e6; color: #d93025; }
        .review-explanation h4 { margin-top: 0; margin-bottom: 10px; color: #202124; }
        .achievement-message { margin-top: 15px; font-weight: 500; color: #1a73e8; font-size: 1.1rem; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .result-card { animation: fadeIn 0.3s ease forwards; }
        .result-card:nth-child(2) { animation-delay: 0.05s; }
        .result-card:nth-child(3) { animation-delay: 0.1s; }
        .result-card:nth-child(4) { animation-delay: 0.15s; }
        .result-card:nth-child(5) { animation-delay: 0.2s; }
    </style>
`;

function addResultStyles() {
    if (!document.getElementById('result-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'result-styles';
        styleElement.innerHTML = resultStyles;
        document.head.appendChild(styleElement);
    }
}

window.addEventListener('load', addResultStyles);