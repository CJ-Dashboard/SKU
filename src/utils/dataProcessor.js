/**  
 * ✅ JSON 기반 파서 (경량화 버전)  
 * - meta.json: 대리점/ASA 목록  
 * - asa/*.json: ASA별 데이터  
 */  
  
const GRADE_CRITERIA = {  
  'S+': ['S+/S', 'S+/A', 'S+/B', 'S+/C'],  
  'S':  ['S+/S'],  
  'A':  ['S+/A', 'S+/B', 'S+/C'],  
  'B':  ['S+/B', 'S+/C'],  
  'C':  ['S+/C'],  
};  
  
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
  
export const getStoreSkuDetail = (store, skus, subCatFilter = '전체') => {  
  const requiredCriteria = GRADE_CRITERIA[store.grade] || [];  
  return skus  
    .filter((sku) => {  
      if (sku.sheet !== store.sheet)                              return false;  
      if (!requiredCriteria.includes(sku.criterion))             return false;  
      if (store.isJeju && sku.jejuExcluded)                      return false;  
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
