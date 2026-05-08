import React, { useState } from 'react';  
import { getStoreSkuDetail } from '../utils/dataProcessor';  
import { rateColor } from './SummaryCards';  
  
const CRITERION_ORDER = ['S+/S', 'S+/A', 'S+/B', 'S+/C'];  
const criterionColor = (c) => {  
  const m = { 'S+/S': '#7B1FA2', 'S+/A': '#1565C0', 'S+/B': '#2E7D32', 'S+/C': '#F57F17' };  
  return m[c] || '#888';  
};  
const SHEET_ICONS = { '상온': '🌡️', '저온': '❄️' };  
  
const StoreDetail = ({ store, skus, subCategories }) => {  
  const [subCatFilter,  setSubCatFilter] = useState('전체');  
  const [critFilter,    setCritFilter] = useState('전체');  
  const [statusFilter,  setStatusFilter] = useState('전체');  
  const [skuSearch,     setSkuSearch] = useState('');  
  
  // 전체 필수SKU (시트 + 등급 기준)  
  const allDetail = getStoreSkuDetail(store, skus, '전체');  
  // 카테고리 필터 적용된 목록  
  const catDetail = getStoreSkuDetail(store, skus, subCatFilter);  
  
  // 해당 등급에 실제 존재하는 criterion만 (동적)  
  const activeCriteria = [...new Set(allDetail.map((d) => d.criterion))]  
    .sort((a, b) => CRITERION_ORDER.indexOf(a) - CRITERION_ORDER.indexOf(b));  
  
  // 최종 필터 적용  
  const filtered = catDetail.filter((d) => {  
    if (critFilter !== '전체' && d.criterion !== critFilter)     return false;  
    if (statusFilter === '취급'   && !d.handled)                   return false;  
    if (statusFilter === '미취급' &&  d.handled)                   return false;  
    if (skuSearch && !d.name.includes(skuSearch) &&  
                     !d.brand.includes(skuSearch))                 return false;  
    return true;  
  });  
  
  const handledAll = allDetail.filter((d) => d.handled).length;  
  const totalAll = allDetail.length;  
  
  // 서브카테고리별 취급 현황 (동적 - 시트마다 달라짐)  
  const subCatSummary = subCategories.map((cat) => {  
    const catSkus = getStoreSkuDetail(store, skus, cat);  
    const catHandled = catSkus.filter((d) => d.handled).length;  
    const catTotal = catSkus.length;  
    const catRate = store.catRates?.[cat] ??  
      (catTotal > 0 ? Math.round(catHandled / catTotal * 1000) / 10 : 0);  
    return { cat, handled: catHandled, total: catTotal, rate: catRate };  
  });  
  
  return (  
    <div className="dashboard">  
      {/* 점포 정보 */}  
      <div className="card store-summary">  
        <div className="store-info-row">  
          <div>  
            <span className="info-label">시트</span>  
            <span className="info-val">  
              {SHEET_ICONS[store.sheet] || '📄'} {store.sheet}  
            </span>  
          </div>  
          <div>  
            <span className="info-label">대리점</span>  
            <span className="info-val">{store.dealer}</span>  
          </div>  
          <div>  
            <span className="info-label">ASA</span>  
            <span className="info-val">{store.asa}</span>  
          </div>  
          <div>  
            <span className="info-label">지점</span>  
            <span className="info-val">{store.branch}</span>  
          </div>  
        </div>  
  
        {/* 전체 취급률 요약 */}  
        <div className="store-summary-row">  
          <div className="store-stat">  
            <span className="stat-val" style={{ color: '#1565C0' }}>{totalAll}</span>  
            <span className="stat-label">필수SKU</span>  
          </div>  
          <div className="store-stat">  
            <span className="stat-val" style={{ color: '#388E3C' }}>{handledAll}</span>  
            <span className="stat-label">취급</span>  
          </div>  
          <div className="store-stat">  
            <span className="stat-val" style={{ color: '#D32F2F' }}>{totalAll - handledAll}</span>  
            <span className="stat-label">미취급</span>  
          </div>  
          <div className="store-stat">  
            <span className="stat-val" style={{ color: rateColor(store.rate) }}>  
              {store.rate}%  
            </span>  
            <span className="stat-label">취급률</span>  
          </div>  
        </div>  
  
        {/* 서브카테고리별 취급률 (동적 - 클릭으로 필터) */}  
        {subCatSummary.length > 1 && (  
          <div className="cat-summary-row">  
            {subCatSummary.map(({ cat, handled, total, rate }) => (  
              <div  
                key={cat}  
                className="cat-summary-item"  
                style={{  
                  borderColor: subCatFilter === cat ? '#1565C0' : '#eee',  
                  background:  subCatFilter === cat ? '#E3F2FD' : '#fff',  
                }}  
                onClick={() => setSubCatFilter(subCatFilter === cat ? '전체' : cat)}  
              >  
                <span className="cat-name">{cat}</span>  
                <span className="cat-rate" style={{ color: rateColor(rate) }}>{rate}%</span>  
                <span className="cat-count">{handled}/{total}</span>  
              </div>  
            ))}  
          </div>  
        )}  
      </div>  
  
      {/* 필터 */}  
      <div className="card filter-bar">  
        {/* 서브카테고리 탭 (동적) */}  
        {subCategories.length > 1 && (  
          <div className="chip-row">  
            {['전체', ...subCategories].map((c) => (  
              <button  
                key={c}  
                className={`chip ${subCatFilter === c ? 'chip-active' : ''}`}  
                style={subCatFilter === c ? { background: '#1565C0' } : {}}  
                onClick={() => setSubCatFilter(c)}  
              >{c}</button>  
            ))}  
          </div>  
        )}  
  
        {/* 기준 필터 (동적) */}  
        <div className="chip-row" style={{ marginTop: 8 }}>  
          {['전체', ...activeCriteria].map((c) => (  
            <button  
              key={c}  
              className={`chip ${critFilter === c ? 'chip-active' : ''}`}  
              style={critFilter === c ? { background: criterionColor(c) } : {}}  
              onClick={() => setCritFilter(c)}  
            >{c}</button>  
          ))}  
        </div>  
  
        {/* 취급 상태 필터 */}  
        <div className="chip-row" style={{ marginTop: 8 }}>  
          {['전체', '취급', '미취급'].map((v) => (  
            <button  
              key={v}  
              className={`chip ${statusFilter === v ? 'chip-active' : ''}`}  
              style={statusFilter === v ? {  
                background:  
                  v === '미취급' ? '#D32F2F' :  
                  v === '취급'   ? '#388E3C' : '#1565C0'  
              } : {}}  
              onClick={() => setStatusFilter(v)}  
            >{v}</button>  
          ))}  
        </div>  
  
        {/* SKU 검색 */}  
        <div className="filter-item full-width" style={{ marginTop: 8 }}>  
          <input  
            type="text"  
            placeholder="SKU명 또는 브랜드 검색..."  
            value={skuSearch}  
            onChange={(e) => setSkuSearch(e.target.value)}  
          />  
        </div>  
      </div>  
  
      {/* SKU 목록 */}  
      <div className="card">  
        <h2 className="section-title">  
          SKU 상세 ({filtered.length}개)  
          {subCatFilter !== '전체' && (  
            <span className="cat-badge">{subCatFilter}</span>  
          )}  
        </h2>  
        <div className="sku-list">  
          {filtered.length === 0 && (  
            <p className="empty-msg">조건에 맞는 SKU 없음</p>  
          )}  
          {filtered.map((sku, i) => (  
            <div key={i} className={`sku-row ${sku.handled ? 'handled' : 'not-handled'}`}>  
              <div className="sku-left">  
                <span className="sku-status">{sku.handled ? '✅' : '❌'}</span>  
                <div>  
                  <div className="sku-name">  
  {sku.code && (  
    <span className="sku-code-inline">{sku.code} / </span>  
  )}  
  {sku.brand ? `[${sku.brand}] ` : ''}{sku.name}  
</div>   
                  <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>  
                    <span className="criterion-badge" style={{ color: criterionColor(sku.criterion) }}>  
                      {sku.criterion}  
                    </span>  
                    {sku.category && (  
                      <span className="cat-tag">{sku.category}</span>  
                    )}  
                    {sku.subCat && (  
                      <span className="sub-cat-tag">{sku.subCat}</span>  
                    )}  
                    {sku.code && (  
                      <span className="code-tag">{sku.code}</span>  
                    )}  
                  </div>  
                </div>  
              </div>  
              <div className={`sku-tag ${sku.handled ? 'tag-ok' : 'tag-no'}`}>  
                {sku.handled ? '취급' : '미취급'}  
              </div>  
            </div>  
          ))}  
        </div>  
      </div>  
    </div>  
  );  
};  
  
export default StoreDetail;  
