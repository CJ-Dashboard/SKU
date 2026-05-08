/**  
 * ✅ 완전 동적 멀티시트 파서  
 * - RAW col12(가동SKU) / col40(필수SKU) 직접 사용  
 * - 제주 지점: Row3='제외' SKU 자동 제외 후 재계산  
 * - 비제주 지점: 모든 SKU 등급 기준 적용  
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
  
// ── 제주외 여부 확인 (headerRowIdx - 14 = Row3) ───────────────────  
const findJejuRow = (raw2d, headerRowIdx) => {  
  // Row3 = 포함/제외 행 (headerRowIdx - 14)  
  const jejuRowIdx = headerRowIdx - 14;  
  return jejuRowIdx >= 0 ? (raw2d[jejuRowIdx] || []) : [];  
};  
  
// ── 제주 지점 여부 확인 ────────────────────────────────────────────  
const isJejuBranch = (branch) =>  
  String(branch || '').trim().includes('제주');  
  
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
  const brandRow = raw2d[headerRowIdx - 5] || [];  
  const catRow = raw2d[headerRowIdx - 4] || [];  
  const nameRow = raw2d[headerRowIdx - 3] || [];  
  const subCatRow = raw2d[headerRowIdx - 2] || [];  
  const codeRow = raw2d[headerRowIdx - 1] || [];  
  
  // ✅ 제주외 행 (Row3 = headerRowIdx - 14)  
  const jejuRow = findJejuRow(raw2d, headerRowIdx);  
  
  // ① SKU 목록 + 제주외 여부 태깅  
  const skus = skuCols.map((col, localIdx) => {  
  const rawSubCat = String(subCatRow[col] || '').trim();  
  // ✅ "제주외"를 "신선"으로 변환  
  const subCat = rawSubCat === '제주외' ? '신선' : rawSubCat;  
  
  return {  
    idx:          idxOffset + localIdx,  
    col,  
    sheet:        sheetName,  
    criterion:    String(headerRow[col] || '').trim(),  
    brand:        String(brandRow[col] || '').trim(),  
    category:     String(catRow[col] || '').trim(),  
    name:         String(nameRow[col] || '').trim(),  
    subCat,       // ✅ 변환된 값 사용  
    code:         String(codeRow[col] || '').trim(),  
    jejuExcluded: String(jejuRow[col] || '').trim() === '제외',  
  };  
});   
  
  // ② 시트 내 카테고리 목록 자동 추출  
  const subCategories = [...new Set(skus.map((s) => s.category).filter(Boolean))].sort();  
  
  // ③ col12(가동SKU), col40(필수SKU) 위치 자동 탐지  
  let col12Idx = 12;  
  let col40Idx = 40;  
  headerRow.forEach((cell, idx) => {  
    const v = String(cell || '').trim();  
    if (v.includes('가동')) col12Idx = idx;  
    if (v.includes('필수')) col40Idx = idx;  
  });  
  
  // ④ 점포 데이터 추출  
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
    const branch = String(row[colMap.BRANCH] ?? '').trim();  
    const jeju = isJejuBranch(branch); // ✅ 제주 지점 여부  
  
    // SKU 취급 데이터  
    const handling = {};  
    skus.forEach((sku) => {  
      const v = row[sku.col];  
      handling[sku.idx] =  
        v === 1 || v === '1'              ? 1   :  
        v === 0 || v === '0'              ? 0   :  
        v === 3 || v === '3'              ? 3   :  
        String(v ?? '').trim() === '제외' ? 'X' : null;  
    });  
  
    // ✅ 취급률 계산 분기  
    let rate, handledTotal, requiredTotal;  
  
    if (!jeju) {  
      // ── 비제주 지점: RAW col12/col40 직접 사용 ──────────────────  
      const rawActive = parseInt(row[col12Idx] ?? 0) || 0;  
      const rawRequired = parseInt(row[col40Idx] ?? 0) || 0;  
      rate = rawRequired > 0 ? Math.round(rawActive / rawRequired * 1000) / 10 : 0;  
      handledTotal = rawActive;  
      requiredTotal = rawRequired;  
    } else {  
      // ── 제주 지점: 제주외 SKU 제외 후 직접 계산 ─────────────────  
      const requiredCriteria = GRADE_CRITERIA[grade] || [];  
      const applicableSkus = skus.filter((sku) =>  
        requiredCriteria.includes(sku.criterion) &&  
        !sku.jejuExcluded // ✅ 제주외 SKU 제외  
      );  
      const applicable = applicableSkus.filter((s) =>  
        handling[s.idx] === 0 || handling[s.idx] === 1  
      );  
      const handled = applicable.filter((s) => handling[s.idx] === 1);  
  
      rate = applicable.length > 0  
        ? Math.round(handled.length / applicable.length * 1000) / 10  
        : 0;  
      handledTotal = handled.length;  
      requiredTotal = applicable.length;  
    }  
  
    // ✅ 카테고리별 취급률 계산 (제주외 반영)  
    const requiredCriteriaForCat = GRADE_CRITERIA[grade] || [];  
    const catRates = {};  
    subCategories.forEach((cat) => {  
      const catReq = skus.filter((s) =>  
        requiredCriteriaForCat.includes(s.criterion) &&  
        s.category === cat &&  
        (!jeju || !s.jejuExcluded) // ✅ 제주면 제주외 제외  
      );  
      const catApp = catReq.filter((s) => handling[s.idx] === 0 || handling[s.idx] === 1);  
      const catHand = catApp.filter((s) => handling[s.idx] === 1);  
      catRates[cat] = catApp.length > 0  
        ? Math.round(catHand.length / catApp.length * 1000) / 10  
        : null;  
    });  
  
    stores.push({  
      row:       r,  
      sheet:     sheetName,  
      grade,  
      su:        String(row[colMap.SU] ?? '').trim(),  
      branch,  
      code:      String(row[colMap.CODE] ?? '').trim(),  
      dealer,  
      sa:        String(row[colMap.SA] ?? '').trim(),  
      storeCode: String(row[colMap.STORE_CODE] ?? '').trim(),  
      name:      storeName,  
      asa,  
      isJeju:    jeju, // ✅ 제주 여부 저장  
      rate,  
      catRates,  
      handling,  
      handledTotal,  
      requiredTotal,  
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
  
// ✅ 점포 SKU 상세 (제주 지점이면 제주외 SKU 자동 제외)  
export const getStoreSkuDetail = (store, skus, subCatFilter = '전체') => {  
  const requiredCriteria = GRADE_CRITERIA[store.grade] || [];  
  return skus  
    .filter((sku) => {  
      if (sku.sheet !== store.sheet)                return false;  
      if (!requiredCriteria.includes(sku.criterion)) return false;  
      // ✅ 제주 지점이면 제주외 SKU 제외  
      if (store.isJeju && sku.jejuExcluded)         return false;  
      if (subCatFilter !== '전체' && sku.category !== subCatFilter) return false;  
      return true;  
    })  
    .map((sku) => {  
      const val = store.handling[sku.idx];  
      return {  
        ...sku,  
        value:        val,  
        handled:      val === 1,  
        notHandled:   val === 0,  
        gradeOut:     val === 3,  
        excluded:     val === 'X',  
        jejuExcluded: sku.jejuExcluded,  
      };  
    });  
};  
