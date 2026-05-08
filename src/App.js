import React, { useState, useEffect } from 'react';  
import SelectionScreen from './components/SelectionScreen';  
import StoreListScreen from './components/StoreListScreen';  
import StoreDetail from './components/StoreDetail';  
import './App.css';  
  
function App() {  
  const [step, setStep] = useState('loading');  
  const [meta, setMeta] = useState(null);       // 대리점/ASA 목록  
  const [asaData, setAsaData] = useState(null);       // 선택된 ASA 데이터  
  const [selection, setSelection] = useState({ dealer: '', asa: '', sheet: '' });  
  const [selectedStore, setSelectedStore] = useState(null);  
  const [isLoadingAsa, setIsLoadingAsa] = useState(false);  
  const [error, setError] = useState('');  
  
  // ── 1단계: meta.json만 로드 (초소형, 빠름!) ─────────────────────  
  useEffect(() => {  
    const loadMeta = async () => {  
      try {  
        const res = await fetch(`/data/meta.json?t=${Date.now()}`);  
        if (!res.ok) throw new Error('meta.json을 찾을 수 없습니다.');  
        const data = await res.json();  
        setMeta(data);  
        setStep('select');  
      } catch (err) {  
        setError(err.message);  
        setStep('error');  
      }  
    };  
    loadMeta();  
  }, []);  
  
  // ── 2단계: ASA 선택 후 해당 ASA JSON만 로드 ─────────────────────  
  const handleSelectionConfirm = async (dealer, asa, sheetFiles) => {  
    setIsLoadingAsa(true);  
    setError('');  
    setSelection({ dealer, asa });  
  
    try {  
      // 해당 ASA의 모든 시트 JSON 로드 (상온 + 저온 동시 로드)  
      const results = await Promise.all(  
        sheetFiles.map(async ({ sheet, fileName }) => {  
          const res = await fetch(  
            `/data/asa/${encodeURIComponent(fileName)}?t=${Date.now()}`  
          );  
          if (!res.ok) throw new Error(`${fileName} 로드 실패`);  
          return res.json();  
        })  
      );  
  
      // 시트 데이터 통합  
      let idxOffset = 0;  
      const allStores = [];  
      const allSkus = [];  
      const sheets = [];  
      const subCategoriesBySheet = {};  
  
      results.forEach((data) => {  
        // SKU idx 재정렬 (시트마다 offset 적용)  
        const skusWithOffset = data.skus.map((sku) => ({  
          ...sku,  
          idx: idxOffset + sku.idx,  
        }));  
        const storesWithOffset = data.stores.map((store) => ({  
          ...store,  
          handling: Object.fromEntries(  
            Object.entries(store.handling).map(([k, v]) => [  
              parseInt(k) + idxOffset, v  
            ])  
          ),  
        }));  
  
        allStores.push(...storesWithOffset);  
        allSkus.push(...skusWithOffset);  
        sheets.push(data.sheet);  
        subCategoriesBySheet[data.sheet] = data.subCategories;  
        idxOffset += data.skus.length;  
      });  
  
      setAsaData({ stores: allStores, skus: allSkus, sheets, subCategoriesBySheet });  
      setStep('storelist');  
    } catch (err) {  
      setError(err.message);  
    } finally {  
      setIsLoadingAsa(false);  
    }  
  };  
  
  const handleSelectStore = (store) => {  
    setSelectedStore(store);  
    setStep('storedetail');  
  };  
  
  const handleBack = () => {  
    if (step === 'storedetail') { setStep('storelist'); }  
    else if (step === 'storelist') {  
      setStep('select');  
      setAsaData(null);  
      setSelection({ dealer: '', asa: '', sheet: '' });  
    }  
  };  
  
  // ── 헤더 ──────────────────────────────────────────────────────  
  const headerTitle = () => {  
    if (step === 'loading')     return '📊 필수취급 대시보드';  
    if (step === 'select')      return '📊 필수취급 대시보드';  
    if (step === 'storelist')   return `👤 ${selection.asa}`;  
    if (step === 'storedetail') return selectedStore?.name || '';  
    return '📊 필수취급 대시보드';  
  };  
  
  const headerSub = () => {  
    if (step === 'storelist')  
      return `🏢 ${selection.dealer}`;  
    if (step === 'storedetail')  
      return `${selectedStore?.sheet} · ${selectedStore?.dealer} · ${selectedStore?.grade}등급 · ${selectedStore?.rate}%`;  
    if (meta?.lastUpdate && step === 'select')  
      return `📅 ${meta.lastUpdate.date} ${meta.lastUpdate.version} 기준`;  
    return '';  
  };  
  
  return (  
    <div className="app">  
      <header className="app-header">  
        <div className="header-left">  
          {(step === 'storelist' || step === 'storedetail') && (  
            <button className="back-btn" onClick={handleBack}>←</button>  
          )}  
          <div>  
            <h1>{headerTitle()}</h1>  
            {headerSub() && <span className="file-name">{headerSub()}</span>}  
          </div>  
        </div>  
      </header>  
  
      <main className="app-main">  
        {/* 초기 로딩 */}  
        {step === 'loading' && (  
          <div className="loading-screen">  
            <div className="loading-inner">  
              <span style={{ fontSize: 56 }}>📊</span>  
              <h2>필수취급 대시보드</h2>  
              <div className="spinner" style={{ margin: '20px auto 0' }} />  
              <p style={{ marginTop: 12, color: '#888', fontSize: 14 }}>  
                불러오는 중...  
              </p>  
            </div>  
          </div>  
        )}  
  
        {/* 에러 */}  
        {step === 'error' && (  
          <div className="loading-screen">  
            <div className="loading-inner">  
              <span style={{ fontSize: 48 }}>⚠️</span>  
              <h2 style={{ color: '#C62828', marginTop: 8 }}>데이터 오류</h2>  
              <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>{error}</p>  
              <p style={{ color: '#aaa', fontSize: 12, marginTop: 8 }}>  
                npm run convert 후 다시 배포해주세요  
              </p>  
            </div>  
          </div>  
        )}  
  
        {/* 대리점/ASA 선택 */}  
        {step === 'select' && meta && (  
          <SelectionScreen  
            meta={meta}  
            onConfirm={handleSelectionConfirm}  
            isLoading={isLoadingAsa}  
            error={error}  
          />  
        )}  
  
        {/* 2차점 목록 */}  
        {step === 'storelist' && asaData && (  
          <StoreListScreen  
            stores={asaData.stores}  
            sheets={asaData.sheets}  
            dealer={selection.dealer}  
            asa={selection.asa}  
            onSelectStore={handleSelectStore}  
          />  
        )}  
  
        {/* 점포 SKU 상세 */}  
        {step === 'storedetail' && selectedStore && asaData && (  
          <StoreDetail  
            store={selectedStore}  
            skus={asaData.skus}  
            subCategories={asaData.subCategoriesBySheet[selectedStore.sheet] || []}  
          />  
        )}  
      </main>  
    </div>  
  );  
}  
  
export default App;  
