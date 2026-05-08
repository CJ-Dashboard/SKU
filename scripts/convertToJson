/**  
 * XLSX → JSON 변환 스크립트  
 * 실행: npm run convert  
 * 결과: public/data/meta.json + public/data/asa/*.json  
 */  
  
const XLSX = require('xlsx');  
const fs = require('fs');  
const path = require('path');  
  
// ── 설정 ─────────────────────────────────────────────────────────  
const XLSX_PATH = path.join(__dirname, '../public/data/필수취급raw.xlsx');  
const OUTPUT_DIR = path.join(__dirname, '../public/data/asa');  
const META_PATH = path.join(__dirname, '../public/data/meta.json');  
  
// ── GRADE_CRITERIA ────────────────────────────────────────────────  
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
  
// ── 컬럼 매핑 ────────────────────────────────────────────────────  
const buildColMap = (headerRow) => {  
  const map = {};  
  headerRow.forEach((cell, idx) => {  
    const v = String(cell || '').trim();  
    if (v === '등급')                                          map.GRADE = idx;  
    else if (v === '멥핑' || v === '맵핑' || v === '매핑')         map.MAPPING = idx;  
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
  
// ── SKU 컬럼 감지 ────────────────────────────────────────────────  
const findSkuCols = (headerRow) =>  
  headerRow.reduce((acc, cell, idx) => {  
    if (/^S\+\//.test(String(cell || '').trim())) acc.push(idx);  
    return acc;  
  }, []);  
  
const isJejuBranch = (branch) => String(branch || '').trim().includes('제주');  
const convertJejuLabel = (val)   => {  
  const v = String(val || '').trim();  
  return v === '제주외' ? '신선' : v;  
};  
  
// ── 시트 파싱 ────────────────────────────────────────────────────  
const parseSheet = (raw2d, sheetName) => {  
  const headerRowIdx = findHeaderRowIdx(raw2d);  
  if (headerRowIdx === -1) throw new Error(`헤더행 없음: ${sheetName}`);  
  
  const headerRow = raw2d[headerRowIdx] || [];  
  const colMap = buildColMap(headerRow);  
  const skuCols = findSkuCols(headerRow);  
  if (skuCols.length === 0) throw new Error(`SKU 컬럼 없음: ${sheetName}`);  
  
  const brandRow = raw2d[headerRowIdx - 5] || [];  
  const catRow = raw2d[headerRowIdx - 4] || [];  
  const nameRow = raw2d[headerRowIdx - 3] || [];  
  const subCatRow = raw2d[headerRowIdx - 2] || [];  
  const codeRow = raw2d[headerRowIdx - 1] || [];  
  const jejuRowIdx = headerRowIdx - 14;  
  const jejuRow = jejuRowIdx >= 0 ? (raw2d[jejuRowIdx] || []) : [];  
  
  // SKU 메타데이터  
  const skus = skuCols.map((col, idx) => ({  
    idx,  
    col,  
    sheet:        sheetName,  
    criterion:    String(headerRow[col] || '').trim(),  
    brand:        String(brandRow[col] || '').trim(),  
    category:     convertJejuLabel(catRow[col]),  
    name:         String(nameRow[col] || '').trim(),  
    subCat:       convertJejuLabel(subCatRow[col]),  
    code:         String(codeRow[col] || '').trim(),  
    jejuExcluded: String(jejuRow[col] || '').trim() === '제외',  
  }));  
  
  const subCategories = [...new Set(  
    skus.map((s) => s.category).filter((c) => Boolean(c) && c !== '제주외')  
  )].sort();  
  
  let col12Idx = 12, col40Idx = 40;  
  headerRow.forEach((cell, idx) => {  
    const v = String(cell || '').trim();  
    if (v.includes('가동')) col12Idx = idx;  
    if (v.includes('필수')) col40Idx = idx;  
  });  
  
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
    const jeju = isJejuBranch(branch);  
  
    const handling = {};  
    skus.forEach((sku) => {  
      const v = row[sku.col];  
      handling[sku.idx] =  
        v === 1 || v === '1'              ? 1   :  
        v === 0 || v === '0'              ? 0   :  
        v === 3 || v === '3'              ? 3   :  
        String(v ?? '').trim() === '제외' ? 'X' : null;  
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
      const applicableSkus = skus.filter((s) =>  
        requiredCriteria.includes(s.criterion) && !s.jejuExcluded  
      );  
      const applicable = applicableSkus.filter((s) =>  
        handling[s.idx] === 0 || handling[s.idx] === 1  
      );  
      const handled = applicable.filter((s) => handling[s.idx] === 1);  
      rate = applicable.length > 0  
        ? Math.round(handled.length / applicable.length * 1000) / 10 : 0;  
      handledTotal = handled.length;  
      requiredTotal = applicable.length;  
    }  
  
    const reqCritForCat = GRADE_CRITERIA[grade] || [];  
    const catRates = {};  
    subCategories.forEach((cat) => {  
      const catReq = skus.filter((s) =>  
        reqCritForCat.includes(s.criterion) &&  
        s.category === cat &&  
        (!jeju || !s.jejuExcluded)  
      );  
      const catApp = catReq.filter((s) => handling[s.idx] === 0 || handling[s.idx] === 1);  
      const catHand = catApp.filter((s) => handling[s.idx] === 1);  
      catRates[cat] = catApp.length > 0  
        ? Math.round(catHand.length / catApp.length * 1000) / 10 : null;  
    });  
  
    stores.push({  
      row: r,  
      sheet: sheetName,  
      grade,  
      su:        String(row[colMap.SU] ?? '').trim(),  
      branch,  
      code:      String(row[colMap.CODE] ?? '').trim(),  
      dealer,  
      sa:        String(row[colMap.SA] ?? '').trim(),  
      storeCode: String(row[colMap.STORE_CODE] ?? '').trim(),  
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
  
// ── 메인 실행 ────────────────────────────────────────────────────  
const main = () => {  
  console.log('📊 XLSX → JSON 변환 시작...');  
  
  if (!fs.existsSync(XLSX_PATH)) {  
    console.error(`❌ 파일 없음: ${XLSX_PATH}`);  
    process.exit(1);  
  }  
  
  // asa 폴더 생성  
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });  
  
  const wb = XLSX.readFile(XLSX_PATH);  
  
  // 시트별 파싱  
  const metaDealers = {};  
  let totalStores = 0;  
  let totalAsa = 0;  
  
  wb.SheetNames.forEach((sheetName) => {  
    try {  
      const ws = wb.Sheets[sheetName];  
      const raw2d = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });  
      const { stores, skus, subCategories } = parseSheet(raw2d, sheetName);  
  
      console.log(` 📄 [${sheetName}] 점포 ${stores.length}개, SKU ${skus.length}개`);  
  
      // ASA별로 그룹핑  
      const asaGroups = {};  
      stores.forEach((store) => {  
        const key = `${sheetName}__${store.dealer}__${store.asa}`;  
        if (!asaGroups[key]) {  
          asaGroups[key] = {  
            sheet: sheetName,  
            dealer: store.dealer,  
            asa: store.asa,  
            stores: [],  
            skus,  
            subCategories,  
          };  
        }  
        asaGroups[key].stores.push(store);  
      });  
  
      // ASA별 JSON 파일 저장  
      Object.entries(asaGroups).forEach(([key, data]) => {  
        const fileName = `${sheetName}_${data.dealer}_${data.asa}.json`;  
        const filePath = path.join(OUTPUT_DIR, fileName);  
        fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');  
  
        // meta 정보 수집  
        const avgRate = data.stores.length  
          ? Math.round(data.stores.reduce((s, d) => s + d.rate, 0) / data.stores.length * 10) / 10  
          : 0;  
  
        if (!metaDealers[data.dealer]) metaDealers[data.dealer] = {};  
        if (!metaDealers[data.dealer][data.asa]) {  
          metaDealers[data.dealer][data.asa] = [];  
          totalAsa++;  
        }  
        metaDealers[data.dealer][data.asa].push({  
          sheet: sheetName,  
          storeCount: data.stores.length,  
          avgRate,  
          fileName,  
        });  
        totalStores += data.stores.length;  
      });  
  
    } catch (err) {  
      console.warn(` ⚠️ [${sheetName}] 파싱 실패: ${err.message}`);  
    }  
  });  
  
  // meta.json 저장  
  const meta = {  
    sheets: wb.SheetNames,  
    dealers: Object.entries(metaDealers).map(([dealer, asas]) => ({  
      dealer,  
      asas: Object.entries(asas).map(([asa, sheets]) => ({  
        asa,  
        sheets,  
        totalStores: sheets.reduce((s, d) => s + d.storeCount, 0),  
        avgRate: Math.round(  
          sheets.reduce((s, d) => s + d.avgRate, 0) / sheets.length * 10  
        ) / 10,  
      })),  
    })),  
  };  
  
  // lastUpdate.json 읽어서 meta에 포함  
  const lastUpdatePath = path.join(__dirname, '../public/data/lastUpdate.json');  
  if (fs.existsSync(lastUpdatePath)) {  
    meta.lastUpdate = JSON.parse(fs.readFileSync(lastUpdatePath, 'utf8'));  
  }  
  
  fs.writeFileSync(META_PATH, JSON.stringify(meta), 'utf8');  
  
  console.log(`\n✅ 변환 완료!`);  
  console.log(` - 대리점: ${Object.keys(metaDealers).length}개`);  
  console.log(` - ASA: ${totalAsa}명`);  
  console.log(` - 점포: ${totalStores}개`);  
  console.log(` - 저장 위치: public/data/asa/\n`);  
};  
  
main();  
