/**  
 * ✅ 완전 동적 멀티시트 파서  
 * - 시트명 자동 인식 (상온/저온/추가 시트 모두 지원)  
 * - SKU/대리점/ASA 유동적 증감 자동 반영  
 * - 헤더행 자동 탐지 (하드코딩 없음)  
 */  
  
const GRADE_CRITERIA = {  
  'S+': ['S+/S', 'S+/A', 'S+/B', 'S+/C'],  
  'S':  ['S+/S'],  
  'A':  ['S+/A', 'S+/B', 'S+/C'],  
  'B':  ['S+/B', 'S+/C'],  
  'C':  ['S+/C'],  
};  
  
// ── 헤더행 자동 탐지 ─────────────────────────────────────────────  
const findHeaderRowIdx = (raw2d) => {  
  for (let r = 0; r < Math.min(raw2d.length, 40); r++) {  
    const row = raw2d[r] || [];  
    const hasGrade = row.some((c) => String(c || '').trim() === '등급');  
    const hasCriteria = row.some((c) => /^S\+\//.test(String(c || '').trim()));  
    if (hasGrade && hasCriteria) return r;  
  }  
  return -1;  
};  
  
// ── 헤더행 컬럼 위치 자동 매핑 ───────────────────────────────────  
const buildColMap = (headerRow) => {  
  const map = {};  
  headerRow.forEach((cell, idx) => {  
    const v = String(cell || '').trim();  
    if (v === '등급')                                           map.GRADE = idx;  
    else if (v === '멥핑' || v === '맵핑' || v === '매핑')          map.MAPPING = idx;  
    else if (v === 'SU')                                             map.SU = idx;  
    else if (v.includes('지점'))                                     map.BRANCH = idx;  
    else if (v === '코드')                                           map.CODE = idx;  
    else if (v.includes('대리점'))                                   map.DEALER = idx;  
    else if (v === 'SA')                                             map.SA = idx;  
    else if (v.includes('2차점코드') || v.includes('점포코드'))      map.STORE_CODE = idx;  
    else if (v.includes('2차점명')   || v.includes('점포명'))        map.STORE_NAME = idx;  
    else if (v === 'ASA' || v === 'ASA명')                           map.ASA = idx;  
  });  
  return map;  
};  
  
// ── SKU 컬럼 자동 감지 (S+/ 패턴) ────────────────────────────────  
const findSkuCols = (headerRow) =>  
  headerRow.reduce((acc, cell, idx) => {  
    if (/^S\+\//.test(String(cell || '').trim())) acc.push(idx);  
    return acc;  
  }, []);  
  
// ── 단일 시트 파서 ────────────────────────────────────────────────  
export const parseSheet = (raw2d, sheetName, idxOffset = 0) => {  
  const headerRowIdx = findHeaderRowIdx(raw2d);  
  if (headerRowIdx === -1)  
    throw new Error(`[${sheetName}] 헤더행을 찾을 수 없습니다.`);  
  
  const headerRow = raw2d[headerRowIdx] || [];  
  const colMap = buildColMap(headerRow);  
  const skuCols = findSkuCols(headerRow);  
  
  if (skuCols.length === 0)  
    throw new Error(`[${sheetName}] SKU 기준(S+/) 컬럼을 찾을 수 없습니다.`);  
  
  // 헤더 기준 상대 offset으로 메타데이터 추출  
  const brandRow = raw2d[headerRowIdx - 5] || []; // 브랜드명 (햇반 등)  
  const catRow = raw2d[headerRowIdx - 4] || []; // 카테고리 (식품/장류)  
  const nameRow = raw2d[headerRowIdx - 3] || []; // SKU명  
  const subCatRow = raw2d[headerRowIdx - 2] || []; // 묶음형태 (개별/묶음)  
  const codeRow = raw2d[headerRowIdx - 1] || []; // SKU 코드  
  
  // ① SKU 목록 (전역 고유 idx)  
  const skus = skuCols.map((col, localIdx) => ({  
    idx:       idxOffset + localIdx,  
    col,  
    sheet:     sheetName,  
    criterion: String(headerRow[col] || '').trim(),  
    brand:     String(brandRow[col] || '').trim(),  
    category:  String(catRow[col] || '').trim(),  
    name:      String(nameRow[col] || '').trim(),  
    subCat:    String(subCatRow[col] || '').trim(),  
    code:      String(codeRow[col] || '').trim(),  
  }));  
  
  // ② 시트 내 카테고리 목록 자동 추출 (식품/장류 등)  
  const subCategories = [...new Set(skus.map((s) => s.category).filter(Boolean))].sort();  
  
  // ③ 점포 데이터 추출  
  const VALID_GRADES = new Set(Object.keys(GRADE_CRITERIA));  
  const stores = [];  
  
  for (let r = headerRowIdx + 1; r < raw2d.length; r++) {  
    const row = raw2d[r];  
    if (!row) continue;  
  
    const grade = String(row[colMap.GRADE] ?? '').trim();  
    const storeName = String(row[colMap.STORE_NAME] ?? '').trim();  
    if (!VALID_GRADES.has(grade) || !storeName) continue;  
  
    const dealer = String(row[colMap.DEALER] ?? '').trim();  
    const asa = String(row[colMap.ASA] ?? '').trim();  
  
    // SKU 취급 데이터 파싱  
    const handling = {};  
    skus.forEach((sku) => {  
      const v = row[sku.col];  
      handling[sku.idx] =  
        v === 1 || v === '1'              ? 1   :  
        v === 0 || v === '0'              ? 0   :  
        v === 3 || v === '3'              ? 3   :  
        String(v ?? '').trim() === '제외' ? 'X' : null;  
    });  
  
    // 전체 취급률 계산  
    const requiredCriteria = GRADE_CRITERIA[grade] || [];  
    const requiredSkus = skus.filter((s) => requiredCriteria.includes(s.criterion));  
    const applicable = requiredSkus.filter((s) => handling[s.idx] === 0 || handling[s.idx] === 1);  
    const handled = applicable.filter((s) => handling[s.idx] === 1);  
    const rate = applicable.length > 0  
      ? Math.round((handled.length / applicable.length) * 1000) / 10  
      : 0;  
  
    // 카테고리별 취급률 계산 (식품/장류 등)  
    const catRates = {};  
    subCategories.forEach((cat) => {  
      const catReq = requiredSkus.filter((s) => s.category === cat);  
      const catApp = catReq.filter((s) => handling[s.idx] === 0 || handling[s.idx] === 1);  
      const catHand = catApp.filter((s) => handling[s.idx] === 1);  
      catRates[cat] = catApp.length > 0  
        ? Math.round((catHand.length / catApp.length) * 1000) / 10  
        : null;  
    });  
  
    stores.push({  
      row:       r,  
      sheet:     sheetName,  
      grade,  
      su:        String(row[colMap.SU] ?? '').trim(),  
      branch:    String(row[colMap.BRANCH] ?? '').trim(),  
      code:      String(row[colMap.CODE] ?? '').trim(),  
      dealer,  
      sa:        String(row[colMap.SA] ?? '').trim(),  
      storeCode: String(row[colMap.STORE_CODE] ?? '').trim(),  
      name:      storeName,  
      asa,  
      rate,  
      catRates,  
      handling,  
      requiredTotal: applicable.length,  
      handledTotal:  handled.length,  
    });  
  }  
  
  return { stores, skus, subCategories };  
};  
  
// ── 유틸 함수 ─────────────────────────────────────────────────────  
  
export const getUnique = (arr) =>  
  [...new Set(arr.filter(Boolean))].sort();  
  
export const applyFilters = (stores, { sheet, dealer, asa, grade, search }) =>  
  stores.filter((s) => {  
    if (sheet && sheet !== '전체' && s.sheet !== sheet)  return false;  
    if (dealer && dealer !== '전체' && s.dealer !== dealer) return false;  
    if (asa && asa !== '전체' && s.asa !== asa)    return false;  
    if (grade && grade !== '전체' && s.grade !== grade)  return false;  
    if (search &&  
        !s.name.includes(search)   &&  
        !s.dealer.includes(search) &&  
        !s.asa.includes(search))    return false;  
    return true;  
  });  
  
// 점포 SKU 상세 (해당 시트 + 등급 필수기준 + 카테고리 필터)  
export const getStoreSkuDetail = (store, skus, subCatFilter = '전체') => {  
  const requiredCriteria = GRADE_CRITERIA[store.grade] || [];  
  return skus  
    .filter((sku) => {  
      if (sku.sheet !== store.sheet)             return false;  
      if (!requiredCriteria.includes(sku.criterion)) return false;  
      if (subCatFilter !== '전체' && sku.category !== subCatFilter) return false;  
      return true;  
    })  
    .map((sku) => {  
      const val = store.handling[sku.idx];  
      return {  
        ...sku,  
        value:      val,  
        handled:    val === 1,  
        notHandled: val === 0,  
        gradeOut:   val === 3,  
        excluded:   val === 'X',  
      };  
    });  
};  
