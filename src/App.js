import React, { useState, useCallback, useEffect } from 'react';  
import * as XLSX from 'xlsx';  
import { parseSheet } from './utils/dataProcessor';  
import FileUpload from './components/FileUpload';  
import SelectionScreen from './components/SelectionScreen';  
import StoreListScreen from './components/StoreListScreen';  
import StoreDetail from './components/StoreDetail';  
import './App.css';  
  
function App() {  
  const [step, setStep] = useState('loading');  
  const [appData, setAppData] = useState(null);  
  const [selection, setSelection] = useState({ dealer: '', asa: '' });  
  const [selectedStore, setSelectedStore] = useState(null);  
  const [isLoading, setIsLoading] = useState(false);  
  const [parseError, setParseError] = useState('');  
  const [lastUpdate, setLastUpdate] = useState(null);  
  const [isAdmin, setIsAdmin] = useState(false); // 관리자 모드  
  
  // ── 앱 시작 시 자동으로 서버 RAW 파일 로드 ──────────────────────  
 useEffect(() => {  
  loadServerData();  
// eslint-disable-next-line react-hooks/exhaustive-deps  
}, []);  
  
  const loadServerData = async () => {  
    setIsLoading(true);  
    setParseError('');  
    try {  
      // 업데이트 날짜 로드  
      const metaRes = await fetch(`/data/lastUpdate.json?t=${Date.now()}`);  
      if (metaRes.ok) {  
        const meta = await metaRes.json();  
        setLastUpdate(meta);  
      }  
  
      // RAW 파일 로드  
      const fileRes = await fetch(`/data/필수취급raw.xlsx?t=${Date.now()}`);  
      if (!fileRes.ok) throw new Error('데이터 파일을 찾을 수 없습니다.');  
  
      const buffer = await fileRes.arrayBuffer();  
      const parsed = parseWorkbook(buffer);  
      setAppData(parsed);  
      setStep('select');  
    } catch (err) {  
      // 서버 파일 없으면 업로드 화면으로  
      setParseError(err.message);  
      setStep('upload');  
    } finally {  
      setIsLoading(false);  
    }  
  };  
  
  // ── 워크북 파싱 공통 함수 ────────────────────────────────────────  
  const parseWorkbook = (buffer) => {  
    const wb = XLSX.read(buffer, { type: 'array' });  
  
    let idxOffset = 0;  
    const allStores = [];  
    const allSkus = [];  
    const sheets = [];  
    const subCategoriesBySheet = {};  
    const skippedSheets = [];  
  
    wb.SheetNames.forEach((sheetName) => {  
      try {  
        const ws = wb.Sheets[sheetName];  
        const raw2d = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });  
        const { stores, skus, subCategories } = parseSheet(raw2d, sheetName, idxOffset);  
        allStores.push(...stores);  
        allSkus.push(...skus);  
        sheets.push(sheetName);  
        subCategoriesBySheet[sheetName] = subCategories;  
        idxOffset += skus.length;  
      } catch (err) {  
        skippedSheets.push(`[${sheetName}] ${err.message}`);  
      }  
    });  
  
    if (allStores.length === 0)  
      throw new Error(skippedSheets.length > 0  
        ? skippedSheets.join(' / ')  
        : '유효한 데이터를 찾을 수 없습니다.');  
  
    return { stores: allStores, skus: allSkus, sheets, subCategoriesBySheet };  
  };  
  
  // ── 관리자 수동 업로드 (로컬 테스트용) ──────────────────────────  
  const parseFile = useCallback((file) => {  
    setIsLoading(true);  
    setParseError('');  
    const reader = new FileReader();  
    reader.onload = (e) => {  
      try {  
        const parsed = parseWorkbook(e.target.result);  
        setAppData(parsed);  
        setSelection({ dealer: '', asa: '' });  
        setSelectedStore(null);  
        setStep('select');  
      } catch (err) {  
        setParseError(err.message);  
      } finally {  
        setIsLoading(false);  
      }  
    };  
    reader.onerror = () => { setParseError('파일을 읽을 수 없습니다.'); setIsLoading(false); };  
    reader.readAsArrayBuffer(file);  
  }, []);  
  
  const handleSelectionConfirm = (dealer, asa) => {  
    setSelection({ dealer, asa });  
    setStep('storelist');  
  };  
  
  const handleSelectStore = (store) => {  
    setSelectedStore(store);  
    setStep('storedetail');  
  };  
  
  const handleBack = () => {  
    if (step === 'storedetail') setStep('storelist');  
    else if (step === 'storelist') { setStep('select'); setSelection({ dealer: '', asa: '' }); }  
    else if (step === 'select')   setStep('upload');  
  };  
  
  // ── 헤더 타이틀 ─────────────────────────────────────────────────  
  const headerTitle = () => {  
    if (step === 'loading')     return '📊 필수취급 대시보드';  
    if (step === 'upload')      return '📊 필수취급 대시보드';  
    if (step === 'select')      return '📊 필수취급 대시보드';  
    if (step === 'storelist')   return `👤 ${selection.asa}`;  
    if (step === 'storedetail') return selectedStore?.name || '';  
    return '';  
  };  
  
  const headerSub = () => {  
    if (step === 'storedetail')  
      return `${selectedStore?.sheet} · ${selectedStore?.dealer} · ${selectedStore?.grade}등급 · ${selectedStore?.rate}%`;  
    if (step === 'storelist')  
      return `🏢 ${selection.dealer}`;  
    if (lastUpdate && (step === 'select' || step === 'storelist'))  
      return `📅 ${lastUpdate.date} ${lastUpdate.version} 기준`;  
    return '';  
  };  
  
  return (  
    <div className="app">  
      <header className="app-header">  
        <div className="header-left">  
          {(step === 'storelist' || step === 'storedetail' || step === 'select') && (  
            <button className="back-btn" onClick={handleBack}>←</button>  
          )}  
          <div>  
            <h1>{headerTitle()}</h1>  
            {headerSub() && <span className="file-name">{headerSub()}</span>}  
          </div>  
        </div>  
  
        {/* 관리자 모드 토글 + 업데이트 버튼 */}  
        {(step === 'select' || step === 'storelist') && (  
          <div className="header-right">  
            {isAdmin ? (  
              <label className="header-upload-btn" title="RAW 파일 업로드 (미리보기용)">  
                📁  
                <input type="file" accept=".xlsx,.xls"  
                  onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])}  
                  style={{ display: 'none' }} />  
              </label>  
            ) : (  
              <button  
                className="header-upload-btn"  
                onClick={() => setIsAdmin(true)}  
                title="관리자 모드"  
              >⚙️</button>  
            )}  
          </div>  
        )}  
      </header>  
  
      <main className="app-main">  
        {/* 로딩 화면 */}  
        {step === 'loading' && (  
          <div className="loading-screen">  
            <div className="loading-inner">  
              <span style={{ fontSize: 56 }}>📊</span>  
              <h2>필수취급 대시보드</h2>  
              <div className="spinner" style={{ margin: '20px auto 0' }} />  
              <p style={{ marginTop: 12, color: '#888', fontSize: 14 }}>  
                데이터 불러오는 중...  
              </p>  
            </div>  
          </div>  
        )}  
  
        {step === 'upload' && (  
          <FileUpload  
            onFileUpload={parseFile}  
            isLoading={isLoading}  
            errorMsg={parseError}  
            onRetry={loadServerData}  
          />  
        )}  
        {step === 'select' && appData && (  
          <SelectionScreen  
            stores={appData.stores}  
            sheets={appData.sheets}  
            lastUpdate={lastUpdate}  
            onConfirm={handleSelectionConfirm}  
            parseError={parseError}  
          />  
        )}  
        {step === 'storelist' && appData && (  
          <StoreListScreen  
            stores={appData.stores}  
            sheets={appData.sheets}  
            dealer={selection.dealer}  
            asa={selection.asa}  
            onSelectStore={handleSelectStore}  
          />  
        )}  
        {step === 'storedetail' && selectedStore && appData && (  
          <StoreDetail  
            store={selectedStore}  
            skus={appData.skus}  
            subCategories={appData.subCategoriesBySheet[selectedStore.sheet] || []}  
          />  
        )}  
      </main>  
    </div>  
  );  
}  
  
export default App;  
