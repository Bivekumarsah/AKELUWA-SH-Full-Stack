// Shareable, validated office-directory filters. This module never modifies office data.
const OFFICE_QUERY_KEYS = Object.freeze({search:"office",category:"category",province:"province",district:"district",level:"level"});
function readOfficeLink(search, offices, regions) {
  const qs=new URLSearchParams(search);
  const categories=new Set(offices.map(item=>item.category));
  const provinces=new Set(regions.map(item=>item.name));
  const levels=new Set(["Federal","Local"]);
  const province=provinces.has(qs.get("province")) ? qs.get("province") : "All";
  const matchingDistricts=new Set(offices.filter(item=>province==="All"||item.province===province).map(item=>item.district));
  return {
    search:(qs.get("office")||"").slice(0,120),
    category:categories.has(qs.get("category")) ? qs.get("category") : "All",
    province,
    district:matchingDistricts.has(qs.get("district")) ? qs.get("district") : "All",
    level:levels.has(qs.get("level")) ? qs.get("level") : "All"
  };
}
function makeOfficeLink(currentUrl, state) {
  const url=new URL(currentUrl);
  for(const key of Object.values(OFFICE_QUERY_KEYS)) url.searchParams.delete(key);
  const values={
    office:String(state.search||"").trim().slice(0,120),
    category:state.category,
    province:state.province,
    district:state.district,
    level:state.level
  };
  for(const [key,value] of Object.entries(values)) {
    if(value && value!=="All") url.searchParams.set(key,value);
  }
  url.hash="offices";
  return url.toString();
}
