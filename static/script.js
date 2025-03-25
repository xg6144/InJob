function addExperience() {
    const section = document.getElementById("experience-section");
    const newItem = document.createElement("div");
    newItem.className = "experience-item";
    newItem.innerHTML = `
        <textarea name="experience" placeholder="경력을 입력하세요 (예: 인제대 IT 동아리 부회장 2022.06 - 2023.06)"></textarea>
        <button type="button" class="remove-btn" onclick="removeExperience(this)">- 제거</button>
    `;
    section.appendChild(newItem);
}

function addRow(tableId) {
    const table = document.getElementById(tableId);
    const tbody = table.querySelector('tbody');
    const firstRow = tbody.querySelector('tr');
    const newRow = firstRow.cloneNode(true);
    
    // Clear the input values in the new row
    const inputs = newRow.querySelectorAll('input');
    inputs.forEach(input => {
        input.value = '';
    });
    
    tbody.appendChild(newRow);
}

function submitResume(event) {
    event.preventDefault();
    
    const loadingElement = document.getElementById('loading');
    const resultContent = document.getElementById('result-content');
    
    // Show loading, hide result
    loadingElement.style.display = 'flex';
    resultContent.style.display = 'none';
    
    // 폼 데이터 수집
    const formData = new FormData(document.getElementById('coaching-form'));
    
    // 실제 구현에서는 여기서 서버로 데이터를 전송
    // fetch('/api/coaching', {
    //     method: 'POST',
    //     body: formData
    // })
    // .then(response => response.json())
    // .then(data => {
    //     displayResult(data);
    // })
    // .catch(error => {
    //     console.error('Error:', error);
    //     // 오류 처리
    // });
    
    // 데모를 위한 시뮬레이션: 2초 후 결과 표시
    setTimeout(() => {
        loadingElement.style.display = 'none';
        resultContent.style.display = 'block';
        resultContent.classList.remove('empty');
        
        // 샘플 코칭 결과
        resultContent.innerHTML = `
            <div>
                <h3 style="margin-bottom: 16px; color: var(--primary-dark);">종합 평가</h3>
                <p>전반적으로 기본적인 정보는 잘 작성되어 있지만, 구체적인 성과와 역량을 보여주는 부분이 부족합니다. 아래 세부 피드백을 참고하여 이력서를 보완해 보세요.</p>
                
                <h4 style="margin: 20px 0 12px; color: var(--primary-dark);">학력 분석</h4>
                <p>학력 정보는 명확하게 표현되었으나, 학점이나 주요 수강 과목 등 추가 정보가 있다면 더 좋을 것 같습니다.</p>
                
                <h4 style="margin: 20px 0 12px; color: var(--primary-dark);">경력 분석</h4>
                <p>IT 동아리 경험은 좋은 요소입니다. 다음과 같이 개선해보세요:</p>
                <ul style="margin: 12px 0 12px 24px;">
                    <li>부회장으로서 <span class="feedback-highlight">어떤 프로젝트를 진행했는지</span> 구체적인 내용 추가</li>
                    <li>팀 관리나 리더십 경험에 대한 성과 중심의 서술 필요</li>
                    <li>사용한 기술이나 도구에 대한 언급 추가</li>
                </ul>
                
                <h4 style="margin: 20px 0 12px; color: var(--primary-dark);">자격증 분석</h4>
                <p>정보처리기사는 좋은 자격증입니다. 다음과 같이 보완하면 좋겠습니다:</p>
                <ul style="margin: 12px 0 12px 24px;">
                    <li>해당 자격증이 업무에 어떻게 도움이 되는지 자기소개에서 언급</li>
                    <li>관련 프로그래밍 언어나 기술 스택 자격증 추가 고려</li>
                </ul>
                
                <h4 style="margin: 20px 0 12px; color: var(--primary-dark);">자기소개 분석</h4>
                <p>자기소개가 다소 일반적이고 추상적입니다. 다음 요소를 포함하여 보완해보세요:</p>
                <ul style="margin: 12px 0 12px 24px;">
                    <li><span class="feedback-highlight">구체적인 프로젝트 경험</span>과 성과 중심으로 서술</li>
                    <li>지원하는 직무와 관련된 본인의 역량 강조</li>
                    <li>왜 해당 회사에 지원하는지 명확한 동기 제시</li>
                </ul>
                
                <h4 style="margin: 20px 0 12px; color: var(--primary-dark);">개선된 자기소개 예시</h4>
                <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid var(--primary-color);">
                    <p>"인제대학교 컴퓨터공학과에서 학습한 알고리즘과 데이터 구조에 대한 지식을 바탕으로, IT 동아리 부회장으로서 교내 학생 관리 시스템 개발 프로젝트를 성공적으로 이끌었습니다. 해당 프로젝트에서 React와 Node.js를 활용해 사용자 경험을 30% 개선했으며, 정보처리기사 자격증 취득을 통해 백엔드 개발 역량을 인정받았습니다. 귀사의 혁신적인 서비스 개발 문화에 깊은 인상을 받았으며, 제가 가진 문제 해결 능력과 협업 역량을 바탕으로 귀사의 성장에 기여하고 싶습니다."</p>
                </div>
                
                <h4 style="margin: 20px 0 12px; color: var(--primary-dark);">핵심 개선 포인트</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
                    <span class="feedback-tag negative">구체적 성과 부족</span>
                    <span class="feedback-tag negative">직무 관련성 낮음</span>
                    <span class="feedback-tag positive">기본 구조 우수</span>
                    <span class="feedback-tag positive">자격증 관련성 높음</span>
                </div>
            </div>
        `;
    }, 2000);
}

function removeExperience(button) {
    const section = document.getElementById("experience-section");
    if (section.querySelectorAll(".experience-item").length > 1) {
        button.parentElement.remove();
    }
}

function submitResume(event) {
    event.preventDefault();
    const loadingDiv = document.getElementById("loading");
    const resultDiv = document.getElementById("result");
    loadingDiv.style.display = "block";
    resultDiv.innerHTML = "";
    resultDiv.appendChild(loadingDiv);

    // 학력 데이터 수집
    const educationRows = document.querySelectorAll(".input-table:nth-of-type(1) tbody tr");
    let educationText = "";
    educationRows.forEach(row => {
        const school = row.querySelector("input[name='education_school']").value.trim();
        const major = row.querySelector("input[name='education_major']").value.trim();
        const period = row.querySelector("input[name='education_period']").value.trim();
        if (school || major || period) {
            educationText += `${school} ${major} ${period}\n`;
        }
    });

    // 경력 데이터 수집
    const experienceRows = document.querySelectorAll(".input-table:nth-of-type(2) tbody tr");
    let experienceText = "";
    experienceRows.forEach(row => {
        const company = row.querySelector("input[name='experience_company']").value.trim();
        const role = row.querySelector("input[name='experience_role']").value.trim();
        const period = row.querySelector("input[name='experience_period']").value.trim();
        if (company || role || period) {
            experienceText += `${company} ${role} ${period}\n`;
        }
    });

    // 자격증 데이터 수집
    const certificationRows = document.querySelectorAll(".input-table:nth-of-type(3) tbody tr");
    let certificationText = "";
    certificationRows.forEach(row => {
        const name = row.querySelector("input[name='certification_name']").value.trim();
        const date = row.querySelector("input[name='certification_date']").value.trim();
        if (name || date) {
            certificationText += `${name} ${date}\n`;
        }
    });

    // 자기소개 데이터 수집
    const introduction = document.getElementById("introduction").value.trim();

    // 통합 텍스트 생성
    let resumeText = "";
    if (educationText) resumeText += `학력:\n${educationText.trim()}\n`;
    if (experienceText) resumeText += `경력:\n${experienceText.trim()}\n`;
    if (certificationText) resumeText += `자격증:\n${certificationText.trim()}\n`;
    if (introduction) resumeText += `자기소개: ${introduction}\n`;

    // 폼 데이터 생성
    const formData = new FormData();
    formData.append("resume_text", resumeText);

    fetch("/resume", {
        method: "POST",
        body: formData
    }).then(response => response.text())
      .then(html => {
          document.open();
          document.write(html);
          document.close();
      }).catch(error => {
          console.error("Error:", error);
          resultDiv.innerHTML = "<p>코칭 중 오류가 발생했어요. 다시 시도해 주세요!</p>";
      });
}

document.addEventListener('DOMContentLoaded', function() {
    const chatbotButton = document.getElementById('chatbotButton');
    const chatbotContainer = document.getElementById('chatbotContainer');
    const closeChatbot = document.getElementById('closeChatbot');
    
    chatbotButton.addEventListener('click', function() {
        chatbotContainer.classList.toggle('active');
    });
    
    closeChatbot.addEventListener('click', function() {
        chatbotContainer.classList.remove('active');
    });
});