import React from 'react';  
import {  
  BarChart, Bar, XAxis, YAxis, CartesianGrid,  
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,  
} from 'recharts';  
import SummaryCards, { rateColor, gradeColor } from './SummaryCards';  
import FilterBar from './FilterBar';  
import { applyFilters } from '../utils/dataProcessor';  
  
const SHEET_ICONS = { '상온': '🌡️', '저온': '❄️' };  
  
const CustomTooltip = ({ active, payload }) => {  
  if (!active || !payload?.length) return null;  
  const d = payload[0].payload;  
  return (  
    <div className="chart-tooltip">  
      <p className="tt-name">{d.fullName}</p>  
      <p className="tt-sub">{SHEET_ICONS[d.sheet] || '📄'} {d.sheet}</p>  
      <p className="tt-sub">{d.dealer}</p>  
      <p className="tt-sub">{d.asa} · <strong style={{ color: gradeColor(d.grade) }}>{d.grade}등급</strong></p>  
      <p className="tt-sub">필수SKU {d.handledTotal}/{d.requiredTotal}</p>  
      <p className="tt-rate" style={{ color: rateColor(d.rate) }}>{d.rate}%</p>  
    </div>  
  );  
};  
  
const Dashboard = ({ appData, filters, setFilters, onSelectStore, onFileUpload, parseError }) => {  
  const { stores, sheets } = appData;  
  const filtered = applyFilters(stores, filters);  
  const sorted = [...filtered].sort((a, b) => b.rate - a.rate);  
  
  const avg = filtered.length  
    ? Math.round(filtered.reduce((s, d) => s + d.rate, 0) / filtered.length * 10) / 10  
    : 0;  
  
  const chartData = sorted.slice(0, 30).map((s) => ({  
    name:         s.name.length > 7 ? s.name.slice(0, 7) + '…' : s.name,  
    fullName:     s.name,  
    sheet:        s.sheet,  
    dealer:       s.dealer,  
    asa:          s.asa,  
    grade:        s.grade,  
    rate:         s.rate,  
    handledTotal: s.handledTotal,  
    requiredTotal:s.requiredTotal,  
  }));  
  
  const filterTags = [  
    filters.sheet !== '전체' ? `${SHEET_ICONS[filters.sheet] || '📄'} ${filters.sheet}` : null,  
    filters.dealer !== '전체' ? filters.dealer : null,  
    filters.asa !== '전체' ? filters.asa : null,  
    filters.grade !== '전체' ? `${filters.grade}등급` : null,  
  ].filter(Boolean);  
  
  const hasFilter = filterTags.length > 0 || filters.search;  
  
  return (  
    <div className="dashboard">  
      {parseError && <div className="error-box">{parseError}</div>}  
  
      <SummaryCards stores={filtered} />  
      <FilterBar  
        filters={filters}  
        setFilters={setFilters}  
        stores={stores}  
        sheets={sheets}  
      />  
  
      {/* 필터 요약 바 */}  
      {hasFilter && (  
        <div className="filter-summary-bar">  
          <span>  
            🔎 {filterTags.map((t, i) => (  
              <strong key={i}>{t}{i < filterTags.length - 1 ? ' · ' : ''}</strong>  
            ))}  
            {filters.search && <strong> 검색: "{filters.search}"</strong>}  
          </span>  
          <span style={{ marginLeft: 6 }}>— <strong>{filtered.length}개</strong></span>  
          <button  
            className="clear-filter"  
            onClick={() => setFilters({ sheet: '전체', dealer: '전체', asa: '전체', grade: '전체', search: '' })}  
          >✕ 초기화</button>  
        </div>  
      )}  
  
      {/* 차트 */}  
      <div className="card">  
        <h2 className="section-title">  
          점포별 취급률  
          {sorted.length > 30 && <span className="sub-badge"> (상위 30개)</span>}  
        </h2>  
        {chartData.length > 0 ? (  
          <ResponsiveContainer width="100%" height={280}>  
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 65 }}>  
              <CartesianGrid strokeDasharray="3 3" vertical={false} />  
              <XAxis  
                dataKey="name"  
                angle={-45}  
                textAnchor="end"  
                tick={{ fontSize: 10 }}  
                interval={0}  
              />  
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />  
              <Tooltip content={<CustomTooltip />} />  
              <ReferenceLine  
                y={avg}  
                stroke="#999"  
                strokeDasharray="4 4"  
                label={{ value: `평균 ${avg}%`, position: 'insideTopRight', fontSize: 11, fill: '#888' }}  
              />  
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>  
                {chartData.map((entry, i) => (  
                  <Cell key={i} fill={rateColor(entry.rate)} />  
                ))}  
              </Bar>  
            </BarChart>  
          </ResponsiveContainer>  
        ) : (  
          <p className="empty-msg">검색 결과 없음</p>  
        )}  
        <div className="legend">  
          {[['#388E3C', '80% 이상'], ['#F57C00', '60~80%'], ['#D32F2F', '60% 미만']].map(([c, l]) => (  
            <span key={l} className="legend-item">  
              <span className="dot" style={{ background: c }} />{l}  
            </span>  
          ))}  
        </div>  
      </div>  
  
      {/* 점포 목록 */}  
      <div className="card">  
        <h2 className="section-title">점포 목록 ({filtered.length}개)</h2>  
        <p className="hint-text">탭하면 SKU 상세 확인 →</p>  
        <div className="store-list">  
          {sorted.map((store, i) => (  
            <div key={i} className="store-row" onClick={() => onSelectStore(store)}>  
              <div className="store-row-left">  
                <span className="grade-badge" style={{ background: gradeColor(store.grade) }}>  
                  {store.grade}  
                </span>  
                <div>  
                  <div className="store-name">{store.name}</div>  
                  <div className="store-sub">{store.dealer}</div>  
                  <div className="store-sub">  
                    {store.asa}  
                    {/* 시트 전체 보기일 때 상온/저온 뱃지 표시 */}  
                    {filters.sheet === '전체' && (  
                      <span className="sheet-mini-badge"  
                        style={{ background: store.sheet === '상온' ? '#FFF3E0' : '#E3F2FD',  
                                 color:      store.sheet === '상온' ? '#E65100' : '#1565C0' }}>  
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
  
      {/* 파일 업데이트 */}  
      <div className="card update-card">  
        <p className="update-desc">RAW 파일 교체 시 대시보드가 즉시 업데이트됩니다</p>  
        <label className="upload-btn">  
          📁 데이터 업데이트  
          <input  
            type="file"  
            accept=".xlsx,.xls"  
            onChange={(e) => e.target.files[0] && onFileUpload(e.target.files[0])}  
            style={{ display: 'none' }}  
          />  
        </label>  
      </div>  
    </div>  
  );  
};  
  
export default Dashboard;  
