from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os
import time

# --- 데이터베이스 설정 ---
app = Flask(__name__)
# 현재 파일이 있는 경로를 기반으로 데이터베이스 경로 설정
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- 데이터베이스 모델 정의 ---
class AnalysisResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    age = db.Column(db.Integer, nullable=False)
    bmi = db.Column(db.Float, nullable=False)
    systolic_bp = db.Column(db.Integer, nullable=False)
    blood_sugar = db.Column(db.Integer, nullable=False)
    is_smoker = db.Column(db.Integer, nullable=False)
    metabolic_score = db.Column(db.Float, nullable=False)
    hypertension_score = db.Column(db.Float, nullable=False)
    diabetes_score = db.Column(db.Float, nullable=False)

# 앱 컨텍스트 내에서 데이터베이스 생성
with app.app_context():
    db.create_all()

# --- 분석 로직 ---
def analyze_risk(user_data):
    risk_scores = {}
    risk_factors = []
    hypertension_score = 0
    if user_data['systolic_bp'] >= 140:
        hypertension_score += 50
        risk_factors.append("높은 수축기 혈압")
    elif user_data['systolic_bp'] >= 130:
        hypertension_score += 30
        risk_factors.append("높은 수축기 혈압")
    if user_data['age'] > 40:
        hypertension_score += (user_data['age'] - 40) * 0.8
    if user_data['bmi'] >= 25:
        hypertension_score += (user_data['bmi'] - 25) * 2
        if "높은 BMI 지수" not in risk_factors: risk_factors.append("높은 BMI 지수")
    risk_scores['hypertension'] = min(hypertension_score, 100)
    diabetes_score = 0
    if user_data['blood_sugar'] >= 126:
        diabetes_score += 60
        risk_factors.append("높은 공복 혈당")
    elif user_data['blood_sugar'] >= 100:
        diabetes_score += 40
        risk_factors.append("높은 공복 혈당")
    if user_data['bmi'] >= 25:
        diabetes_score += (user_data['bmi'] - 25) * 2.5
        if "높은 BMI 지수" not in risk_factors: risk_factors.append("높은 BMI 지수")
    risk_scores['diabetes'] = min(diabetes_score, 100)
    metabolic_score = (hypertension_score + diabetes_score) / 2
    if user_data['is_smoker'] == 1:
        metabolic_score += 15
        risk_factors.append("흡연 습관")
    risk_scores['metabolic'] = min(metabolic_score, 100)
    unique_risk_factors = list(set(risk_factors))
    return risk_scores, unique_risk_factors

def get_recommendations(factors):
    recs = []
    if not factors:
        recs.append("현재 건강 상태를 잘 유지하세요! 규칙적인 운동과 균형잡힌 식단은 필수입니다.")
        return recs
    if "높은 수축기 혈압" in factors:
        recs.append("**혈압 관리:** 나트륨(소금) 섭취를 줄이고, 칼륨이 풍부한 채소(시금치, 바나나)를 드세요.")
    if "높은 공복 혈당" in factors:
        recs.append("**혈당 관리:** 정제 탄수화물(흰빵, 설탕) 대신 통곡물과 섬유질 위주의 식단을 구성하세요.")
    if "높은 BMI 지수" in factors:
        recs.append("**체중 관리:** 주 3회, 30분 이상의 유산소 운동(빠르게 걷기, 조깅)을 시작해 보세요.")
    if "흡연 습관" in factors:
        recs.append("**생활 습관:** 금연은 모든 만성질환 예방의 첫걸음입니다. 지금 바로 금연 계획을 세워보세요.")
    return recs

# --- 라우트(경로) 설정 ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    user_data = request.json
    user_data_numeric = {k: float(v) for k, v in user_data.items()}
    
    time.sleep(2)
    
    scores, factors = analyze_risk(user_data_numeric)
    recommendations = get_recommendations(factors)
    
    new_result = AnalysisResult(
        age=int(user_data_numeric['age']),
        bmi=user_data_numeric['bmi'],
        systolic_bp=int(user_data_numeric['systolic_bp']),
        blood_sugar=int(user_data_numeric['blood_sugar']),
        is_smoker=int(user_data_numeric['is_smoker']),
        metabolic_score=scores['metabolic'],
        hypertension_score=scores['hypertension'],
        diabetes_score=scores['diabetes']
    )
    db.session.add(new_result)
    db.session.commit()
    
    return jsonify({
        'scores': scores,
        'factors': factors,
        'recommendations': recommendations
    })

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/dashboard-data')
def dashboard_data():
    results = AnalysisResult.query.all()
    data = {
        "total_users": len(results),
        "avg_metabolic_score": db.session.query(db.func.avg(AnalysisResult.metabolic_score)).scalar() or 0,
        "avg_age": db.session.query(db.func.avg(AnalysisResult.age)).scalar() or 0,
        "smoker_dist": {
            "smokers": AnalysisResult.query.filter_by(is_smoker=1).count(),
            "non_smokers": AnalysisResult.query.filter_by(is_smoker=0).count()
        },
        "age_dist": {
            "labels": ["20대 이하", "30대", "40대", "50대", "60대 이상"],
            "data": [
                AnalysisResult.query.filter(AnalysisResult.age < 30).count(),
                AnalysisResult.query.filter(AnalysisResult.age.between(30, 39)).count(),
                AnalysisResult.query.filter(AnalysisResult.age.between(40, 49)).count(),
                AnalysisResult.query.filter(AnalysisResult.age.between(50, 59)).count(),
                AnalysisResult.query.filter(AnalysisResult.age >= 60).count(),
            ]
        },
        "risk_correlation": {
            "bmi": [r.bmi for r in results],
            "metabolic_score": [r.metabolic_score for r in results]
        }
    }
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)