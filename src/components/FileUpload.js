import React, { useRef, useState } from 'react';  
  
const FileUpload = ({ onFileUpload, isLoading, errorMsg, onRetry }) => {   
  const ref = useRef();  
  const [dragging, setDragging] = useState(false);  
  
  const handleDrop = (e) => {  
    e.preventDefault();  
    setDragging(false);  
    const file = e.dataTransfer.files[0];  
    if (file) onFileUpload(file);  
  };  
  
  return (  
    <div className="upload-screen">  
      <div className="upload-hero">  
        <span className="upload-emoji">📊</span>  
        <h2>필수취급 대시보드</h2>  
        <p>필수취급raw.xlsx 파일을 업로드하세요</p>  
      </div>  
  
      {errorMsg && <div className="error-box">⚠️ {errorMsg}</div>}  
  {errorMsg && (  
  <div className="error-box">  
    ⚠️ {errorMsg}  
    {onRetry && (  
      <button className="retry-btn" onClick={onRetry}>🔄 재시도</button>  
    )}  
  </div>  
)}  
      <div  
        className={`drop-zone ${dragging ? 'dragging' : ''}`}  
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}  
        onDragLeave={() => setDragging(false)}  
        onDrop={handleDrop}  
        onClick={() => ref.current.click()}  
      >  
        {isLoading ? (  
          <div className="loading">  
            <div className="spinner" />  
            <p>데이터 처리 중...</p>  
          </div>  
        ) : (  
          <>  
            <span style={{ fontSize: 48 }}>📁</span>  
            <p><strong>파일을 드래그하거나 탭하여 선택</strong></p>  
            <p style={{ fontSize: 13, color: '#999' }}>  
              XLSX 형식 · 상온/저온 시트 자동 인식  
            </p>  
          </>  
        )}  
        <input  
          ref={ref}  
          type="file"  
          accept=".xlsx,.xls"  
          onChange={(e) => e.target.files[0] && onFileUpload(e.target.files[0])}  
          style={{ display: 'none' }}  
        />  
      </div>  
  
      <div className="card format-guide">  
        <h3>📋 엑셀 파일 구성 방법</h3>  
        <div className="format-example">  
          <p>✅ 시트 탭으로 구분 (권장)</p>  
          <code>📄 상온 시트 → 상온 RAW 데이터</code>  
          <code>📄 저온 시트 → 저온 RAW 데이터</code>  
          <code>📄 추가 시트 → 자동 인식됩니다</code>  
        </div>  
        <div className="format-example">  
          <p>✅ 자동 인식 항목</p>  
          <code>· SKU 수 증감 자동 반영</code>  
          <code>· 대리점/ASA 증감 자동 반영</code>  
          <code>· 시트 추가 시 탭 자동 생성</code>  
        </div>  
      </div>  
    </div>  
  );  
};  
  
export default FileUpload;  
