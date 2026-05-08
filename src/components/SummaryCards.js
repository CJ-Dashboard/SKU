import React from 'react';  
  
export const rateColor = (r) => (r >= 80 ? '#388E3C' : r >= 60 ? '#F57C00' : '#D32F2F');  
export const gradeColor = (g) => {  
  const m = { 'S+': '#7B1FA2', S: '#1565C0', A: '#2E7D32', B: '#F57F17', C: '#BF360C' };  
  return m[g] || '#555';  
};  
  
const SummaryCards = ({ stores }) => {  
  const rates = stores.map((s) => s.rate);  
  const avg = rates.length  
    ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 10) / 10  
    : 0;  
  const under60 = rates.filter((r) => r < 60).length;  
  const above80 = rates.filter((r) => r >= 80).length;  
  
  const gradeDist = stores.reduce((acc, s) => {  
    acc[s.grade] = (acc[s.grade] || 0) + 1;  
    return acc;  
  }, {});  
  
  return (  
    <>  
      <div className="summary-cards">  
        <div className="summary-card">  
          <span className="card-icon">🏪</span>  
          <span className="card-label">총 점포</span>  
          <span className="card-value" style={{ color: '#1565C0' }}>  
            {stores.length}<span className="card-unit">개</span>  
          </span>  
        </div>  
        <div className="summary-card">  
          <span className="card-icon">📊</span>  
          <span className="card-label">평균 취급률</span>  
          <span className="card-value" style={{ color: rateColor(avg) }}>  
            {avg}<span className="card-unit">%</span>  
          </span>  
        </div>  
        <div className="summary-card">  
          <span className="card-icon">⚠️</span>  
          <span className="card-label">미달성 60%↓</span>  
          <span className="card-value" style={{ color: '#D32F2F' }}>  
            {under60}<span className="card-unit">개</span>  
          </span>  
        </div>  
        <div className="summary-card">  
          <span className="card-icon">🎯</span>  
          <span className="card-label">달성 80%↑</span>  
          <span className="card-value" style={{ color: '#388E3C' }}>  
            {above80}<span className="card-unit">개</span>  
          </span>  
        </div>  
      </div>  
  
      {/* 등급 분포 */}  
      {Object.keys(gradeDist).length > 0 && (  
        <div className="card grade-dist">  
          <span className="section-title-sm">등급 분포</span>  
          <div className="grade-chips">  
            {Object.entries(gradeDist)  
              .sort((a, b) =>  
                ['S+', 'S', 'A', 'B', 'C'].indexOf(a[0]) -  
                ['S+', 'S', 'A', 'B', 'C'].indexOf(b[0])  
              )  
              .map(([g, cnt]) => (  
                <span key={g} className="grade-chip" style={{ background: gradeColor(g) }}>  
                  {g} <strong>{cnt}</strong>  
                </span>  
              ))}  
          </div>  
        </div>  
      )}  
    </>  
  );  
};  
  
export default SummaryCards;  
