import React from 'react';  
import { getUnique } from '../utils/dataProcessor';  
  
const SHEET_ICONS = { '상온': '🌡️', '저온': '❄️' };  
  
const FilterBar = ({ filters, setFilters, stores, sheets }) => {  
  // 시트 → 대리점 → ASA 순으로 종속 필터  
  const bySheet = filters.sheet !== '전체'  
    ? stores.filter((s) => s.sheet === filters.sheet)  : stores;  
  const byDealer = filters.dealer !== '전체'  
    ? bySheet.filter((s) => s.dealer === filters.dealer) : bySheet;  
  
  const dealerList = getUnique(bySheet.map((s) => s.dealer));  
  const asaList = getUnique(byDealer.map((s) => s.asa));  
  
  const handleSheetChange = (sheet)  =>  
    setFilters((p) => ({ ...p, sheet,  dealer: '전체', asa: '전체' }));  
  const handleDealerChange = (dealer) =>  
    setFilters((p) => ({ ...p, dealer, asa: '전체' }));  
  
  return (  
    <div className="card filter-bar">  
  
      {/* 시트 탭 (상온/저온 자동 생성) */}  
      {sheets.length >= 1 && (  
        <div className="sheet-tabs">  
          {['전체', ...sheets].map((s) => (  
            <button  
              key={s}  
              className={`sheet-tab ${filters.sheet === s ? 'sheet-tab-active' : ''}`}  
              onClick={() => handleSheetChange(s)}  
            >  
              {s === '전체'  
                ? '📦 전체'  
                : `${SHEET_ICONS[s] || '📄'} ${s}`}  
            </button>  
          ))}  
        </div>  
      )}  
  
      {/* 대리점 */}  
      <div className="filter-item full-width">  
        <label>🏢 대리점명</label>  
        <select  
          value={filters.dealer}  
          onChange={(e) => handleDealerChange(e.target.value)}  
        >  
          <option value="전체">전체 대리점 ({dealerList.length}개)</option>  
          {dealerList.map((v) => <option key={v} value={v}>{v}</option>)}  
        </select>  
      </div>  
  
      <div className="filter-row">  
        {/* ASA */}  
        <div className="filter-item" style={{ flex: 2 }}>  
          <label>👤 ASA명</label>  
          <select  
            value={filters.asa}  
            onChange={(e) => setFilters((p) => ({ ...p, asa: e.target.value }))}  
          >  
            <option value="전체">전체 ASA ({asaList.length}명)</option>  
            {asaList.map((v) => <option key={v} value={v}>{v}</option>)}  
          </select>  
        </div>  
        {/* 등급 */}  
        <div className="filter-item">  
          <label>🏅 등급</label>  
          <select  
            value={filters.grade}  
            onChange={(e) => setFilters((p) => ({ ...p, grade: e.target.value }))}  
          >  
            {['전체', 'S+', 'S', 'A', 'B', 'C'].map((g) => (  
              <option key={g} value={g}>{g}</option>  
            ))}  
          </select>  
        </div>  
      </div>  
  
      {/* 검색 */}  
      <div className="filter-item full-width">  
        <label>🔍 검색</label>  
        <input  
          type="text"  
          placeholder="점포명 · 대리점 · ASA 검색..."  
          value={filters.search}  
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}  
        />  
      </div>  
    </div>  
  );  
};  
  
export default FilterBar;  
