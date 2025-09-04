document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/dashboard-data');
        const data = await response.json();
        
        // 요약 카드 업데이트
        document.getElementById('total-users').textContent = `${data.total_users} 명`;
        document.getElementById('avg-risk-score').textContent = `${data.avg_metabolic_score.toFixed(1)} 점`;
        document.getElementById('avg-age').textContent = `${data.avg_age.toFixed(1)} 세`;

        // 1. 연령대 분포 (막대 차트)
        const ageCtx = document.getElementById('ageDistributionChart').getContext('2d');
        new Chart(ageCtx, {
            type: 'bar',
            data: {
                labels: data.age_dist.labels,
                datasets: [{
                    label: '이용자 수',
                    data: data.age_dist.data,
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false } }
            }
        });

        // 2. 흡연자 비율 (도넛 차트)
        const smokerCtx = document.getElementById('smokerDistributionChart').getContext('2d');
        new Chart(smokerCtx, {
            type: 'doughnut',
            data: {
                labels: ['비흡연자', '흡연자'],
                datasets: [{
                    data: [data.smoker_dist.non_smokers, data.smoker_dist.smokers],
                    backgroundColor: ['rgba(46, 204, 113, 0.7)', 'rgba(231, 76, 60, 0.7)'],
                }]
            }
        });

        // 3. BMI와 위험도 관계 (산점도)
        const correlationCtx = document.getElementById('correlationChart').getContext('2d');
        const scatterData = data.risk_correlation.bmi.map((bmi, index) => ({
            x: bmi,
            y: data.risk_correlation.metabolic_score[index]
        }));
        new Chart(correlationCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: '이용자',
                    data: scatterData,
                    backgroundColor: 'rgba(243, 156, 18, 0.6)'
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'BMI 지수' } },
                    y: { title: { display: true, text: '종합 위험도 점수' } }
                }
            }
        });

    } catch (error) {
        console.error('대시보드 데이터를 불러오는 데 실패했습니다:', error);
    }
});