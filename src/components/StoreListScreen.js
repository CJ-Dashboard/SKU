import React, { useState } from 'react';  
  
const SHEET_ICONS = { '상온': '🌡️', '저온': '❄️' };  
const rateColor = (r) => (r >= 80 ? '#388E3C' : r >= 60 ? '#F57C00' : '#D32F2F');  
const gradeColor = (g) => {  
  const m = { 'S+': '#7B1FA2', S: '#1565C0', A: '#2E7D32', B: '#F57F17', C: '#BF360C' };  
  return m[g] || '#555';  
};  
  
const StoreListScreen = ({ stores, sheets, dealer, asa, onSelectStore }) => {  
  const [sheetFilter, setSheetFilter] = useState('전체');  
  const [gradeFilter, setGradeFilter] = useState('전체');  
  const [search, setSearch] = useState('');  
  const [sortBy, setSortBy] = useState('rate_asc');  
  
  // 해당 ASA 점포만  
  const myStores = stores.filter((s) => s.dealer === dealer && s.asa === asa);  
  
  // ✅ 시트가 1개면 탭 필터 필요 없음  
  const multiSheet = sheets.length > 1;  
  
  // 필터 적용  
  const filtered = myStores.filter((s) => {  
    if (multiSheet && sheetFilter !== '전체' && s.sheet !== sheetFilter) return false;  
    if (gradeFilter !== '전체' && s.grade !== gradeFilter)               return false;  
    if (search && !s.name.includes(search))                              return false;  
    return true;  
  });  
  
  // 정렬  
  const sorted = [...filtered].sort((a, b) => {  
    if (sortBy === 'rate_asc')  return a.rate - b.rate;  
    if (sortBy === 'rate_desc') return b.rate - a.rate;  
    if (sortBy === 'name')      return a.name.localeCompare(b.name);  
    return 0;  
  });  
  
  // KPI  
  const avg = myStores.length  
    ? Math.round(myStores.reduce((s, d) => s + d.rate, 0) / myStores.length * 10) / 10  
    : 0;  
  const under60  = myStores.filter((s) => s.rate < 60).length;  
  const above80  = myStores.filter((s) => s.rate >= 80).length;  
  const gradeDist = myStores.reduce((acc, s) => {  
    acc[s.grade] = (acc[s.grade] || 0) + 1;  
    return acc;  
  }, {});  
  
  return (  
    <div className="storelist-screen">  
  
      {/* KPI 카드 */}  
      <div className="summary-cards">  
        <div className="summary-card">  
          <span className="card-icon">🏪</span>  
          <span className="card-label">담당 2차점</span>  
          <span className="card-value" style={{ color: '#1565C0' }}>  
            {myStores.length}<span className="card-unit">개</span>  
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
  
      {/* 필터 */}  
      <div className="card filter-bar">  
  
        {/* ✅ 시트 탭 - 시트가 2개 이상일 때만 표시 */}  
        {multiSheet && (  
          <div className="sheet-tabs" style={{ marginBottom: 10 }}>  
            {['전체', ...sheets].map((s) => (  
              <button  
                key={s}  
                className={`sheet-tab ${sheetFilter === s ? 'sheet-tab-active' : ''}`}  
                onClick={() => setSheetFilter(s)}  
              >  
                {s === '전체' ? '📦 전체' : `${SHEET_ICONS[s] || '📄'} ${s}`}  
              </button>  
            ))}  
          </div>  
        )}  
  
        <div className="filter-row">  
          {/* 등급 */}  
          <div className="filter-item">  
            <label>🏅 등급</label>  
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>  
              {['전체', 'S+', 'S', 'A', 'B', 'C'].map((g) => (  
                <option key={g} value={g}>{g}</option>  
              ))}  
            </select>  
          </div>  
          {/* 정렬 */}  
          <div className="filter-item">  
            <label>↕️ 정렬</label>  
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>  
              <option value="rate_asc">취급률 낮은순</option>  
              <option value="rate_desc">취급률 높은순</option>  
              <option value="name">점포명순</option>  
            </select>  
          </div>  
        </div>  
  
        {/* 검색 */}  
        <div className="filter-item full-width">  
          <label>🔍 2차점 검색</label>  
          <input  
            type="text"  
            placeholder="점포명 검색..."  
            value={search}  
            onChange={(e) => setSearch(e.target.value)}  
          />  
        </div>  
      </div>  
  
      {/* 2차점 목록 */}  
      <div className="card">  
        <h2 className="section-title">  
          2차점 목록  
          <span style={{ fontSize: 13, fontWeight: 400, color: '#888', marginLeft: 6 }}>  
            {filtered.length}/{myStores.length}개  
          </span>  
        </h2>  
        <p className="hint-text">탭하면 SKU 취급 현황 확인 →</p>  
  
        <div className="store-list">  
          {sorted.length === 0 && (  
            <p className="empty-msg">조건에 맞는 2차점 없음</p>  
          )}  
          {sorted.map((store, i) => (  
            <div key={i} className="store-row" onClick={() => onSelectStore(store)}>  
              <div className="store-row-left">  
                <span className="grade-badge" style={{ background: gradeColor(store.grade) }}>  
                  {store.grade}  
                </span>  
                <div>  
                  <div className="store-name">{store.name}</div>  
                  <div className="store-sub">  
                    {store.storeCode && <span>{store.storeCode}</span>}  
                    {/* ✅ 시트가 2개 이상일 때만 상온/저온 뱃지 표시 */}  
                    {multiSheet && (  
                      <span style={{  
                        fontSize: 10, fontWeight: 600,  
                        background: store.sheet === '상온' ? '#FFF3E0' : '#E3F2FD',  
                        color:      store.sheet === '상온' ? '#E65100' : '#1565C0',  
                        padding: '1px 5px', borderRadius: 6, marginLeft: 4,  
                      }}>  
                        {SHEET_ICONS[store.sheet] || '📄'} {store.sheet}  
                      </span>  
                    )}  
                  </div>  
                </div>  
              </div>  
              <div className="store-row-right">  
                <div>  
                  <div className="store-rate" style={{ color: rateColor(store.rate) }}>  
                    {store.rate}%  
                  </div>  
                  <div className="store-rate-sub">  
                    {store.handledTotal}/{store.requiredTotal}  
                  </div>  
                </div>  
                <div className="mini-bar">  
                  <div className="mini-fill"  
                    style={{ width: `${store.rate}%`, background: rateColor(store.rate) }} />  
                </div>  
                <span className="arrow">›</span>  
              </div>  
            </div>  
          ))}  
        </div>  
      </div>  
    </div>  
  );  
};  
  
export default StoreListScreen;  
