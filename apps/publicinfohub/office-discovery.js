// Pure client-side helpers shared by directory browsing and regression tests.
// This file is loaded before app.js; no accounts, tracking or network calls.
function sortDirectoryOffices(offices, mode="name", language="en") {
  const locale=language==="ne"?"ne":"en";
  const cmp=(a,b)=>String(a||"").localeCompare(String(b||""),locale,{sensitivity:"base",numeric:true});
  const byName=(a,b)=>cmp(language==="ne"?a.nameNe:a.name,language==="ne"?b.nameNe:b.name) || cmp(a.id,b.id);
  return [...offices].sort((a,b)=>{
    if(mode==="province")return cmp(a.province,b.province)||cmp(a.district,b.district)||byName(a,b);
    if(mode==="checked")return cmp(b.checkedOn,a.checkedOn)||byName(a,b);
    return byName(a,b);
  });
}
