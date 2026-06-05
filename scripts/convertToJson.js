/**  
 * XLSX → JSON 변환 스크립트  
 * [2026-05-31 수정] 신규 RAW 파일 대응  
 * - S+/ 컬럼이 col[96]부터 시작 (기존 col[10]에서 이동)  
 * - col[10~95]: CAT별 집계 구간 (식품/장류 등급, 가동SKU, 필수SKU 등)  
 */  
  
const XLSX = require('xlsx');  
const fs = require('fs');  
const path = require('path');  
  
const DATA_DIR = path.join(__dirname, '../public/data');  
const xlsxFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.xlsx'));  
  
if (xlsxFiles.length === 0) {  
  console.error('❌ public/data/ 폴더에 xlsx 파일이 없습니다.');  
  process.exit(1);  
}  
if (xlsxFiles.length > 1) {  
  console.warn(`⚠️ xlsx 파일이 여러 개입니다: ${xlsxFiles.join(', ')}`);  
  console.warn(` → 가장 최신 파일을 사용합니다.`);  
}  
  
const XLSX_FILE = xlsxFiles.sort().reverse()[0];  
const XLSX_PATH = path.join(DATA_DIR, XLSX_FILE);  
console.log(`📂 사용 파일: ${XLSX_FILE}`);  
  
const dateMatch = XLSX_FILE.match(/(\d{4})(\d{2})(\d{2})/);  
const lastUpdate = dateMatch  
  ? {  
      date:      `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,  
      version:   `${dateMatch[2]}/${dateMatch[3]} 업데이트`,  
      updatedBy: '이동현',  
    }  
  : {  
      date:      new Date().toISOString().slice(0, 10),  
      version:   '업데이트',  
      updatedBy: '이동현',  
    };  
  
console.log(`📅 업데이트 날짜: ${lastUpdate.date}`);  
  
const OUTPUT_DIR = path.join(__dirname, '../public/data/asa');  
const META_PATH = path.join(__dirname, '../public/data/meta.json');  
  
const GRADE_CRITERIA = {  
  'S+': ['S+/S', 'S+/A', 'S+/B', 'S+/C'],  
  'S':  ['S+/S', 'S+/A', 'S+/B', 'S+/C'],  
  'A':  ['S+/A', 'S+/B', 'S+/C'],  
  'B':  ['S+/B', 'S+/C'],  
  'C':  ['S+/C'],  
};  
  
// ✅ [수정1] 헤더행 탐지  
// - row[0]==='등급' && row[1]==='멥핑' 조건으로 Row18 확정  
// - Row13은 col[0]=None이라 자동 skip됨  
const findHeaderRowIdx = (raw2d) => {  
  const MAPPING_NAMES = ['멥핑', '맵핑', '매핑'];  
  const KNOWN_HEADERS = ['SU', '지점', '코드', '대리점명', 'SA', '2차점코드', '2차점명', 'ASA'];  
  
  for (let r = 0; r < Math.min(raw2d.length, 40); r++) {  
    const row = raw2d[r] || [];  
    const col0 = String(row[0] == null ? '' : row[0]).trim();  
    const col1 = String(row[1] == null ? '' : row[1]).trim();  
  
    // 1순위: 등급 + 멥핑 → Row18 확정 탐지  
    if (col0 === '등급' && MAPPING_NAMES.includes(col1)) return r;  
  
    // 폴백: 등급이 col[0]에 있고 앞 15개 컬럼에서 주요 헤더 5개 이상 매칭  
    if (col0 === '등급') {  
      const front15    = Array.from({ length: 15 }, (_, i) => String(row[i] == null ? '' : row[i]).trim());  
      const matchCount = KNOWN_HEADERS.filter((k) => front15.includes(k)).length;  
      if (matchCount >= 5) return r;  
    }  
  }  
  return -1;  
};  
  
// ✅ [수정2] SKU 컬럼 탐색  
// - Object.entries()로 sparse array 구멍 없이 전체 순회  
// - col[96~279]의 S+/ 컬럼도 빠짐없이 탐지  
const findSkuCols = (headerRow) => {  
  const result = [];  
  Object.entries(headerRow).forEach(([idx, cell]) => {  
    const v = String(cell == null ? '' : cell).trim();  
    if (v.startsWith('S+/')) result.push(Number(idx));  
  });  
  return result;  
};  
  
// ✅ [수정3] buildColMap도 Object.entries()로 안전하게  
const buildColMap = (headerRow) => {  
  const map = {};  
  Object.entries(headerRow).forEach(([i, cell]) => {  
    const idx = Number(i);  
    const v = String(cell == null ? '' : cell).trim();  
    if (v === '등급')                                          map.GRADE = idx;  
    else if (['멥핑', '맵핑', '매핑'].includes(v))                  map.MAPPING = idx;  
    else if (v === 'SU')                                            map.SU = idx;  
    else if (v.includes('지점'))                                    map.BRANCH = idx;  
    else if (v === '코드')                                          map.CODE = idx;  
    else if (v.includes('대리점'))                                  map.DEALER = idx;  
    else if (v === 'SA')                                            map.SA = idx;  
    else if (v.includes('2차점코드') || v.includes('점포코드'))     map.STORE_CODE = idx;  
    else if (v.includes('2차점명')   || v.includes('점포명'))       map.STORE_NAME = idx;  
    else if (v === 'ASA' || v === 'ASA명')                          map.ASA = idx;  
  });  
  return map;  
};  
  
const isJejuBranch = (branch) => String(branch || '').trim().includes('제주');  
const convertJejuLabel = (val)    => String(val || '').trim() === '제주외' ? '신선' : String(val || '').trim();  
const convertFoodCategory = (val, sheetName) => {  
  const v = String(val || '').trim();  
  if (sheetName.includes('식품') && (v === '식품' || v === '장류')) return '식품';  
  return v;  
};  
  
const parseSheet = (raw2d, sheetName) => {  
  const headerRowIdx = findHeaderRowIdx(raw2d);  
  if (headerRowIdx === -1) throw new Error(`헤더행 없음: ${sheetName}`);  
  
  console.log(` → 헤더행 위치: Row ${headerRowIdx + 1} (0-indexed: ${headerRowIdx})`);  
  
  const headerRow = raw2d[headerRowIdx] || [];  
  const colMap = buildColMap(headerRow);  
  const skuCols = findSkuCols(headerRow);  
  
  console.log(` → GRADE col: ${colMap.GRADE}, ASA col: ${colMap.ASA}`);  
  console.log(` → SKU 컬럼 수: ${skuCols.length}, 시작: ${skuCols[0]}, 끝: ${skuCols[skuCols.length - 1]}`);  
  
  if (skuCols.length === 0) throw new Error(`SKU 컬럼 없음: ${sheetName}`);  
  
  // 헤더 기준 상대 위치 row (구조 확인됨)  
  // headerRowIdx=17 기준: brandRow=12, catRow=13, nameRow=14, subCatRow=15, codeRow=16  
  const brandRow = raw2d[headerRowIdx - 5] || [];  
  const catRow = raw2d[headerRowIdx - 4] || [];  
  const nameRow = raw2d[headerRowIdx - 3] || [];  
  const subCatRow = raw2d[headerRowIdx - 2] || [];  
  const codeRow = raw2d[headerRowIdx - 1] || [];  
  const jejuRowIdx = headerRowIdx - 14;  
  const jejuRow = jejuRowIdx >= 0 ? (raw2d[jejuRowIdx] || []) : [];  
  
  const skus = skuCols.map((col, idx) => ({  
    idx,  
    col,  
    sheet:        sheetName,  
    criterion:    String(headerRow[col] == null ? '' : headerRow[col]).trim(),  
    brand:        String(brandRow[col] == null ? '' : brandRow[col]).trim(),  
    category:     convertFoodCategory(convertJejuLabel(catRow[col]),    sheetName),  
    name:         String(nameRow[col] == null ? '' : nameRow[col]).trim(),  
    subCat:       convertFoodCategory(convertJejuLabel(subCatRow[col]), sheetName),  
    code:         String(codeRow[col] == null ? '' : codeRow[col]).trim(),  
    jejuExcluded: String(jejuRow[col] == null ? '' : jejuRow[col]).trim() === '제외',  
  }));  
  
  const subCategories = [...new Set(  
    skus.map((s) => s.category).filter((c) => Boolean(c) && c !== '제주외')  
  )].sort();  
  
  // 가동/필수 컬럼은 Row14(nameRow)에 있음  
  // col[12]=가동SKU, col[40]=필수SKU → 기본값 12, 40이 이미 정확함  
  let col12Idx = 12, col40Idx = 40;  
  Object.entries(nameRow).forEach(([i, cell]) => {  
    const v = String(cell == null ? '' : cell).trim();  
    const idx = Number(i);  
    if (v.includes('가동') && v.includes('SKU')) col12Idx = idx;  
    if (v.includes('필수') && v.includes('SKU')) col40Idx = idx;  
  });  
  
  console.log(` → 가동SKU col: ${col12Idx}, 필수SKU col: ${col40Idx}`);  
  
  const VALID_GRADES = new Set(Object.keys(GRADE_CRITERIA));  
  const stores = [];  
  
  for (let r = headerRowIdx + 1; r < raw2d.length; r++) {  
    const row = raw2d[r];  
    if (!row) continue;  
  
    const grade = String(row[colMap.GRADE] == null ? '' : row[colMap.GRADE]).trim();  
    const storeName = String(row[colMap.STORE_NAME] == null ? '' : row[colMap.STORE_NAME]).trim();  
    if (!VALID_GRADES.has(grade) || !storeName) continue;  
  
    const dealer = String(row[colMap.DEALER] == null ? '' : row[colMap.DEALER]).trim();  
    const asa = String(row[colMap.ASA] == null ? '' : row[colMap.ASA]).trim();  
    const branch = String(row[colMap.BRANCH] == null ? '' : row[colMap.BRANCH]).trim();  
    const jeju = isJejuBranch(branch);  
  
    const handling = {};  
    skus.forEach((sku) => {  
      const v = row[sku.col];  
      handling[sku.idx] =  
        v === 1 || v === '1'              ? 1   :  
        v === 0 || v === '0'              ? 0   :  
        v === 3 || v === '3'              ? 3   :  
        String(v == null ? '' : v).trim() === '제외' ? 'X' : null;  
    });  
  
    let rate, handledTotal, requiredTotal;  
    if (!jeju) {  
      const rawActive = parseInt(row[col12Idx] ?? 0) || 0;  
      const rawRequired = parseInt(row[col40Idx] ?? 0) || 0;  
      rate = rawRequired > 0 ? Math.round(rawActive / rawRequired * 1000) / 10 : 0;  
      handledTotal = rawActive;  
      requiredTotal = rawRequired;  
    } else {  
      const requiredCriteria = GRADE_CRITERIA[grade] || [];  
      const applicableSkus = skus.filter((s) => requiredCriteria.includes(s.criterion) && !s.jejuExcluded);  
      const applicable = applicableSkus.filter((s) => handling[s.idx] === 0 || handling[s.idx] === 1);  
      const handled = applicable.filter((s) => handling[s.idx] === 1);  
      rate = applicable.length > 0 ? Math.round(handled.length / applicable.length * 1000) / 10 : 0;  
      handledTotal = handled.length;  
      requiredTotal = applicable.length;  
    }  
  
    const reqCritForCat = GRADE_CRITERIA[grade] || [];  
    const catRates = {};  
    subCategories.forEach((cat) => {  
      const catReq = skus.filter((s) => reqCritForCat.includes(s.criterion) && s.category === cat && (!jeju || !s.jejuExcluded));  
      const catApp = catReq.filter((s) => handling[s.idx] === 0 || handling[s.idx] === 1);  
      const catHand = catApp.filter((s) => handling[s.idx] === 1);  
      catRates[cat] = catApp.length > 0 ? Math.round(catHand.length / catApp.length * 1000) / 10 : null;  
    });  
  
    stores.push({  
      row: r,  
      sheet: sheetName,  
      grade,  
      su:        String(row[colMap.SU] == null ? '' : row[colMap.SU]).trim(),  
      branch,  
      code:      String(row[colMap.CODE] == null ? '' : row[colMap.CODE]).trim(),  
      dealer,  
      sa:        String(row[colMap.SA] == null ? '' : row[colMap.SA]).trim(),  
      storeCode: String(row[colMap.STORE_CODE] == null ? '' : row[colMap.STORE_CODE]).trim(),  
      name:      storeName,  
      asa,  
      isJeju: jeju,  
      rate,  
      catRates,  
      handling,  
      handledTotal,  
      requiredTotal,  
    });  
  }  
  
  return { stores, skus, subCategories };  
};  
  
// ── 메인 실행 ──────────────────────────────────────────────  
const main = () => {  
  console.log('📊 XLSX → JSON 변환 시작...');  
  
  if (!fs.existsSync(XLSX_PATH)) {  
    console.error(`❌ 파일 없음: ${XLSX_PATH}`);  
    process.exit(1);  
  }  
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });  
  
  const wb = XLSX.readFile(XLSX_PATH);  
  const metaDealers = {};  
  let totalStores = 0, totalAsa = 0;  
  
  wb.SheetNames.forEach((sheetName) => {  
    try {  
      const ws = wb.Sheets[sheetName];  
      const raw2d = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });  
      const { stores, skus, subCategories } = parseSheet(raw2d, sheetName);  
  
      console.log(` 📄 [${sheetName}] 점포 ${stores.length}개, SKU ${skus.length}개`);  
  
      const asaGroups = {};  
      stores.forEach((store) => {  
        const key = `${sheetName}__${store.dealer}__${store.asa}`;  
        if (!asaGroups[key]) {  
          asaGroups[key] = { sheet: sheetName, dealer: store.dealer, asa: store.asa, stores: [], skus, subCategories };  
        }  
        asaGroups[key].stores.push(store);  
      });  
  
      Object.entries(asaGroups).forEach(([, data]) => {  
        const fileName = `${sheetName}_${data.dealer}_${data.asa}.json`;  
        fs.writeFileSync(path.join(OUTPUT_DIR, fileName), JSON.stringify(data), 'utf8');  
  
        const avgRate = data.stores.length  
          ? Math.round(data.stores.reduce((s, d) => s + d.rate, 0) / data.stores.length * 10) / 10  
          : 0;  
  
        if (!metaDealers[data.dealer]) metaDealers[data.dealer] = {};  
        if (!metaDealers[data.dealer][data.asa]) { metaDealers[data.dealer][data.asa] = []; totalAsa++; }  
        metaDealers[data.dealer][data.asa].push({ sheet: sheetName, storeCount: data.stores.length, avgRate, fileName });  
        totalStores += data.stores.length;  
      });  
  
    } catch (err) {  
      console.warn(` ⚠️ [${sheetName}] 파싱 실패: ${err.message}`);  
    }  
  });  
  
  const meta = {  
    sheets: wb.SheetNames,  
    lastUpdate,  
    dealers: Object.entries(metaDealers).map(([dealer, asas]) => ({  
      dealer,  
      asas: Object.entries(asas).map(([asa, sheets]) => ({  
        asa,  
        sheets,  
        totalStores: sheets.reduce((s, d) => s + d.storeCount, 0),  
        avgRate: Math.round(sheets.reduce((s, d) => s + d.avgRate, 0) / sheets.length * 10) / 10,  
      })),  
    })),  
  };  
  
  fs.writeFileSync(META_PATH, JSON.stringify(meta), 'utf8');  
  
  console.log(`\n✅ 변환 완료!`);  
  console.log(` - 대리점: ${Object.keys(metaDealers).length}개`);  
  console.log(` - ASA: ${totalAsa}명`);  
  console.log(` - 점포: ${totalStores}개`);  
  console.log(` - 저장 위치: public/data/asa/\n`);  
};  
  
main();  
