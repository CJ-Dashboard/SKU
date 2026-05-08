import React, { useState } from 'react';  
import { getUnique } from '../utils/dataProcessor';  
  
const SHEET_ICONS = { '상온': '🌡️', '저온': '❄️' };  
  
const SelectionScreen = ({ stores, sheets, lastUpdate, onConfirm, parseError }) => {  
  const [dealer, setDealer] = useState('');  
  const [asa, setAsa] = useState('');  
  const [dealerSearch, setDealerSearch] = useState('');  
  
  // 대리점 목록 (검색 포함)  
  const dealerList = getUnique(stores.map((s) => s.dealer));  
  const filteredDealerList = dealerSearch  
    ? dealerList.filter((d) => d.includes(dealerSearch))  
    : dealerList;  
  
  // 선택된 대리점에 해당하는 ASA 목록  
  const asaList = dealer  
    ? getUnique(stores.filter((s) => s.dealer === dealer).map((s) => s.asa))  
    : [];  
  
  // 선택된 ASA의 점포 수 미리보기  
  const previewStores = dealer && asa  
    ? stores.filter((s) => s.dealer === dealer && s.asa === asa)  
    : [];  
  
  const avgRate = previewStores.length  
    ? Math.round(previewStores.reduce((s, d) => s + d.rate, 0) / previewStores.length * 10) / 10  
    : 0;  
  
  const rateColor = (r) => (r >= 80 ? '#388E3C' : r >= 60 ? '#F57C00' : '#D32F2F');  
  
  // 시트별 점포 수  
  const sheetCounts = {};  
  previewStores.forEach((s) => {  
    sheetCounts[s.sheet] = (sheetCounts[s.sheet] || 0) + 1;  
  });  
  
  const canConfirm = dealer && asa;  
  
  const handleDealerSelect = (d) => {  
    setDealer(d);  
    setAsa('');  
    setDealerSearch('');  
  };  
  
  return (  
    <div className="selection-screen">  
      {parseError && <div className="error-box">{parseError}</div>}  
{lastUpdate && (  
  <div className="update-banner">  
    <span className="update-banner-icon">📅</span>  
    <div>  
      <div className="update-banner-date">{lastUpdate.date} 업데이트</div>  
      <div className="update-banner-version">{lastUpdate.version} · {lastUpdate.updatedBy}</div>  
    </div>  
  </div>  
)}  
      <div className="selection-hero">  
        <span className="selection-emoji">👋</span>  
        <h2>안녕하세요!</h2>  
        <p>대리점과 ASA를 선택해 주세요</p>  
      </div>  
  
      {/* STEP 1: 대리점 선택 */}  
      <div className="selection-card">  
        <div className="step-label">  
          <span className="step-num">1</span>  
          <span>대리점 선택</span>  
        </div>  
  
        {/* 대리점 검색 */}  
        <div className="dealer-search-wrap">  
          <input  
            className="dealer-search-input"  
            type="text"  
            placeholder={`🔍 대리점명 검색... (총 ${dealerList.length}개)`}  
            value={dealerSearch}  
            onChange={(e) => { setDealerSearch(e.target.value); setDealer(''); setAsa(''); }}  
          />  
        </div>  
  
        {/* 대리점 목록 */}  
        <div className="dealer-list">  
          {filteredDealerList.length === 0 && (  
            <p className="empty-msg" style={{ padding: '16px 0' }}>검색 결과 없음</p>  
          )}  
          {filteredDealerList.map((d) => (  
            <button  
              key={d}  
              className={`dealer-item ${dealer === d ? 'dealer-item-active' : ''}`}  
              onClick={() => handleDealerSelect(d)}  
            >  
              <span className="dealer-item-name">🏢 {d}</span>  
              <span className="dealer-item-count">  
                {getUnique(stores.filter((s) => s.dealer === d).map((s) => s.asa)).length}명  
              </span>  
            </button>  
          ))}  
        </div>  
      </div>  
  
      {/* STEP 2: ASA 선택 (대리점 선택 후 활성화) */}  
      <div className={`selection-card ${!dealer ? 'card-disabled' : ''}`}>  
        <div className="step-label">  
          <span className={`step-num ${!dealer ? 'step-num-disabled' : ''}`}>2</span>  
          <span>ASA 선택 {dealer && <span className="step-sub">— {dealer}</span>}</span>  
        </div>  
  
        {!dealer ? (  
          <p className="disabled-hint">① 먼저 대리점을 선택해 주세요</p>  
        ) : (  
          <div className="asa-list">  
            {asaList.map((a) => {  
              const asaStores = stores.filter((s) => s.dealer === dealer && s.asa === a);  
              const asaAvg = asaStores.length  
                ? Math.round(asaStores.reduce((s, d) => s + d.rate, 0) / asaStores.length * 10) / 10  
                : 0;  
              return (  
                <button  
                  key={a}  
                  className={`asa-item ${asa === a ? 'asa-item-active' : ''}`}  
                  onClick={() => setAsa(a)}  
                >  
                  <div className="asa-item-left">  
                    <span className="asa-icon">👤</span>  
                    <div>  
                      <div className="asa-name">{a}</div>  
                      <div className="asa-store-count">{asaStores.length}개 2차점</div>  
                    </div>  
                  </div>  
                  <div className="asa-rate" style={{ color: rateColor(asaAvg) }}>  
                    {asaAvg}%  
                  </div>  
                </button>  
              );  
            })}  
          </div>  
        )}  
      </div>  
  
      {/* 선택 미리보기 */}  
      {canConfirm && (  
        <div className="preview-card">  
          <div className="preview-title">📋 선택 확인</div>  
          <div className="preview-info">  
            <div className="preview-row">  
              <span className="preview-label">대리점</span>  
              <span className="preview-val">{dealer}</span>  
            </div>  
            <div className="preview-row">  
              <span className="preview-label">ASA</span>  
              <span className="preview-val">{asa}</span>  
            </div>  
            <div className="preview-row">  
              <span className="preview-label">2차점 수</span>  
              <span className="preview-val">  
                <strong style={{ color: '#1565C0' }}>{previewStores.length}개</strong>  
                {Object.entries(sheetCounts).map(([sh, cnt]) => (  
                  <span key={sh} className="sheet-preview-badge">  
                    {SHEET_ICONS[sh] || '📄'}{sh} {cnt}  
                  </span>  
                ))}  
              </span>  
            </div>  
            <div className="preview-row">  
              <span className="preview-label">평균 취급률</span>  
              <span className="preview-val" style={{ color: rateColor(avgRate), fontWeight: 700 }}>  
                {avgRate}%  
              </span>  
            </div>  
          </div>  
        </div>  
      )}  
  
      {/* 확인 버튼 */}  
      <button  
        className={`confirm-btn ${canConfirm ? 'confirm-btn-active' : ''}`}  
        disabled={!canConfirm}  
        onClick={() => onConfirm(dealer, asa)}  
      >  
        {canConfirm ? `✅ ${asa} ASA로 시작하기` : '대리점과 ASA를 선택해 주세요'}  
      </button>  
    </div>  
  );  
};  
  
export default SelectionScreen;  
