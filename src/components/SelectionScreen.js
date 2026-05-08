import React, { useState } from 'react';  
  
const SHEET_ICONS = { '상온': '🌡️', '저온': '❄️' };  
const rateColor = (r) => (r >= 80 ? '#388E3C' : r >= 60 ? '#F57C00' : '#D32F2F');  
  
const SelectionScreen = ({ meta, onConfirm, isLoading, error }) => {  
  const [dealer,       setDealer] = useState('');  
  const [asa,          setAsa] = useState('');  
  const [dealerSearch, setDealerSearch] = useState('');  
  
  const dealerList = meta.dealers.map((d) => d.dealer);  
  const filteredDealerList = dealerSearch  
    ? dealerList.filter((d) => d.includes(dealerSearch))  
    : dealerList;  
  
  const selectedDealerData = meta.dealers.find((d) => d.dealer === dealer);  
  const asaList = selectedDealerData?.asas || [];  
  const selectedAsaData = asaList.find((a) => a.asa === asa);  
  
  const handleDealerSelect = (d) => {  
    setDealer(d);  
    setAsa('');  
    setDealerSearch('');  
  };  
  
  const handleConfirm = () => {  
    if (!dealer || !asa || !selectedAsaData) return;  
    // ✅ 해당 ASA의 시트별 fileName 전달  
    const sheetFiles = selectedAsaData.sheets.map((s) => ({  
      sheet:    s.sheet,  
      fileName: s.fileName,  
    }));  
    onConfirm(dealer, asa, sheetFiles);  
  };  
  
  const canConfirm = dealer && asa && !isLoading;  
  
  return (  
    <div className="selection-screen">  
  
      {/* 업데이트 배너 */}  
      {meta.lastUpdate && (  
        <div className="update-banner">  
          <span className="update-banner-icon">📅</span>  
          <div>  
            <div className="update-banner-date">  
              {meta.lastUpdate.date} 업데이트  
            </div>  
            <div className="update-banner-version">  
              {meta.lastUpdate.version} · {meta.lastUpdate.updatedBy}  
            </div>  
          </div>  
        </div>  
      )}  
  
      {error && <div className="error-box">⚠️ {error}</div>}  
  
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
        <div className="dealer-search-wrap">  
          <input  
            className="dealer-search-input"  
            type="text"  
            placeholder={`🔍 대리점명 검색... (총 ${dealerList.length}개)`}  
            value={dealerSearch}  
            onChange={(e) => { setDealerSearch(e.target.value); setDealer(''); setAsa(''); }}  
          />  
        </div>  
        <div className="dealer-list">  
          {filteredDealerList.length === 0 && (  
            <p className="empty-msg" style={{ padding: '16px 0' }}>검색 결과 없음</p>  
          )}  
          {filteredDealerList.map((d) => {  
            const dData = meta.dealers.find((x) => x.dealer === d);  
            return (  
              <button  
                key={d}  
                className={`dealer-item ${dealer === d ? 'dealer-item-active' : ''}`}  
                onClick={() => handleDealerSelect(d)}  
              >  
                <span className="dealer-item-name">🏢 {d}</span>  
                <span className="dealer-item-count">  
                  {dData?.asas.length || 0}명  
                </span>  
              </button>  
            );  
          })}  
        </div>  
      </div>  
  
      {/* STEP 2: ASA 선택 */}  
      <div className={`selection-card ${!dealer ? 'card-disabled' : ''}`}>  
        <div className="step-label">  
          <span className={`step-num ${!dealer ? 'step-num-disabled' : ''}`}>2</span>  
          <span>  
            ASA 선택  
            {dealer && <span className="step-sub">— {dealer}</span>}  
          </span>  
        </div>  
        {!dealer ? (  
          <p className="disabled-hint">① 먼저 대리점을 선택해 주세요</p>  
        ) : (  
          <div className="asa-list">  
            {asaList.map((a) => (  
              <button  
                key={a.asa}  
                className={`asa-item ${asa === a.asa ? 'asa-item-active' : ''}`}  
                onClick={() => setAsa(a.asa)}  
              >  
                <div className="asa-item-left">  
                  <span className="asa-icon">👤</span>  
                  <div>  
                    <div className="asa-name">{a.asa}</div>  
                    <div className="asa-store-count">  
                      {a.totalStores}개 2차점  
                      {/* 시트별 뱃지 */}  
                      {a.sheets.map((s) => (  
                        <span key={s.sheet} style={{  
                          fontSize: 10, fontWeight: 600,  
                          background: s.sheet === '상온' ? '#FFF3E0' : '#E3F2FD',  
                          color:      s.sheet === '상온' ? '#E65100' : '#1565C0',  
                          padding: '1px 5px', borderRadius: 5, marginLeft: 4,  
                        }}>  
                          {SHEET_ICONS[s.sheet] || '📄'} {s.sheet}  
                        </span>  
                      ))}  
                    </div>  
                  </div>  
                </div>  
                <div className="asa-rate" style={{ color: rateColor(a.avgRate) }}>  
                  {a.avgRate}%  
                </div>  
              </button>  
            ))}  
          </div>  
        )}  
      </div>  
  
      {/* 선택 미리보기 */}  
      {canConfirm && selectedAsaData && (  
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
                <strong style={{ color: '#1565C0' }}>{selectedAsaData.totalStores}개</strong>  
                {selectedAsaData.sheets.map((s) => (  
                  <span key={s.sheet} className="sheet-preview-badge">  
                    {SHEET_ICONS[s.sheet] || '📄'} {s.sheet} {s.storeCount}  
                  </span>  
                ))}  
              </span>  
            </div>  
            <div className="preview-row">  
              <span className="preview-label">평균 취급률</span>  
              <span className="preview-val"  
                style={{ color: rateColor(selectedAsaData.avgRate), fontWeight: 700 }}>  
                {selectedAsaData.avgRate}%  
              </span>  
            </div>  
          </div>  
        </div>  
      )}  
  
      {/* 확인 버튼 */}  
      <button  
        className={`confirm-btn ${canConfirm ? 'confirm-btn-active' : ''}`}  
        disabled={!canConfirm}  
        onClick={handleConfirm}  
      >  
        {isLoading ? (  
          <span>⏳ 데이터 불러오는 중...</span>  
        ) : canConfirm ? (  
          `✅ ${asa} ASA로 시작하기`  
        ) : (  
          '대리점과 ASA를 선택해 주세요'  
        )}  
      </button>  
    </div>  
  );  
};  
  
export default SelectionScreen;  
