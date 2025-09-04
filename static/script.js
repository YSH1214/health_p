document.addEventListener('DOMContentLoaded', () => {
    // 화면 요소들
    const mainScreen = document.getElementById('main-screen');
    const formScreen = document.getElementById('form-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const resultScreen = document.getElementById('result-screen');

    // 버튼 요소들
    const startBtn = document.getElementById('start-btn');
    const healthForm = document.getElementById('health-form');
    const restartBtn = document.getElementById('restart-btn');

    // 화면 전환 함수
    function showScreen(screen) {
        mainScreen.classList.add('hidden');
        formScreen.classList.add('hidden');
        loadingScreen.classList.add('hidden');
        resultScreen.classList.add('hidden');
        screen.classList.remove('hidden');
    }

    // [시작] 버튼 클릭
    startBtn.addEventListener('click', () => {
        showScreen(formScreen);
    });

    // [분석하기] 버튼 클릭 (폼 제출)
    healthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showScreen(loadingScreen);

        // 폼 데이터 가져오기 (name 추가)
        const userData = {
            name: document.getElementById('name').value, // 👈 이름 데이터 추가
            age: document.getElementById('age').value,
            bmi: document.getElementById('bmi').value,
            systolic_bp: document.getElementById('systolic_bp').value,
            blood_sugar: document.getElementById('blood_sugar').value,
            is_smoker: document.querySelector('input[name="is_smoker"]:checked').value,
        };

        // 백엔드로 데이터 전송 및 결과 요청
        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            const results = await response.json();
            // displayResults 함수에 사용자 이름 전달
            displayResults(results, userData.name);
        } catch (error) {
            console.error('Error:', error);
            alert("분석 중 오류가 발생했습니다.");
            showScreen(formScreen);
        }
    });

    // [다시 분석하기] 버튼 클릭
    restartBtn.addEventListener('click', () => {
        healthForm.reset();
        showScreen(mainScreen);
    });

    // 결과 표시 함수 (name 파라미터 추가)
    function displayResults(results, name) {
        // 👈 결과 리포트 제목을 동적으로 변경
        document.getElementById('result-title').textContent = `📊 ${name}님의 분석 결과 리포트`;
        
        // 종합 위험도
        const overallStatus = document.getElementById('overall-status');
        const overallScore = results.scores.metabolic;
        if (overallScore >= 70) {
            overallStatus.textContent = "🚨 위험";
            overallStatus.className = 'danger';
        } else if (overallScore >= 40) {
            overallStatus.textContent = "⚠️ 주의";
            overallStatus.className = 'warning';
        } else {
            overallStatus.textContent = "✅ 양호";
            overallStatus.className = 'safe';
        }

        // 게이지 업데이트
        updateGauge('metabolic', results.scores.metabolic);
        updateGauge('hypertension', results.scores.hypertension);
        updateGauge('diabetes', results.scores.diabetes);

        // 위험 요인
        const factorsList = document.getElementById('risk-factors');
        factorsList.innerHTML = '';
        if (results.factors.length > 0) {
            results.factors.forEach(factor => {
                const li = document.createElement('li');
                li.textContent = `• ${factor}`;
                factorsList.appendChild(li);
            });
        } else {
            factorsList.innerHTML = '<li>• 특별한 위험 요인이 발견되지 않았습니다.</li>';
        }

        // 맞춤 가이드
        const recsList = document.getElementById('recommendations');
        recsList.innerHTML = '';
        results.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.innerHTML = rec.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            recsList.appendChild(li);
        });

        showScreen(resultScreen);
    }
    
    // 게이지 바 애니메이션 함수
    function updateGauge(id, score) {
        const gaugeFill = document.getElementById(`${id}-gauge`);
        const scoreSpan = document.getElementById(`${id}-score`);
        
        scoreSpan.textContent = `${score.toFixed(1)} %`;
        
        // 점수에 따라 색상 변경
        let color;
        if (score >= 70) color = 'var(--danger-color)';
        else if (score >= 40) color = 'var(--warning-color)';
        else color = 'var(--safe-color)';
        
        gaugeFill.style.backgroundColor = color;
        
        // 너비 애니메이션
        setTimeout(() => {
            gaugeFill.style.width = `${score}%`;
        }, 100);
    }
});