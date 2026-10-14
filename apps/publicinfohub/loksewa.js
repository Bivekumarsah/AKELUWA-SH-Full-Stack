// Separate, bilingual Lok Sewa guide. The app never hosts a login form.
const loksewaText=(en,ne)=>uiLanguage==="ne"?ne:en;
function loksewaCards(){
  const level=document.getElementById("loksewaLevel").value;
  const province=document.getElementById("loksewaProvince").value;
  const matches=LOKSEWA_PORTALS.filter(item=>(level==="All"||level===item.level)&&(province==="All"||item.province===province));
  document.getElementById("loksewaCount").textContent=uiLanguage==="ne"
    ?uiDigits(matches.length)+" आधिकारिक आयोग सूचीमा"
    :matches.length+" official commission"+(matches.length===1?"":"s")+" listed";
  document.getElementById("loksewaGrid").innerHTML=matches.map(item=>{
    const name=uiLanguage==="ne"?item.nameNe:item.name;
    const classification=item.level==="Federal"
      ?loksewaText("Federal commission","संघीय आयोग")
      :loksewaText(uiProvince(item.province)+" provincial commission",uiProvince(item.province)+" प्रदेश आयोग");
    const note=uiLanguage==="ne"
      ?(item.level==="Federal"?"संघीय पदका विज्ञापन, पाठ्यक्रम, परीक्षा केन्द्र र नतिजा आधिकारिक साइटमा हेर्नुहोस्।":"प्रदेश तथा सम्बन्धित स्थानीय सेवाका विज्ञापन र आवेदन विवरण आधिकारिक आयोगमा पुष्टि गर्नुहोस्।")
      :item.note;
    const label=loksewaText("Official commission website ↗","आधिकारिक आयोग वेबसाइट ↗");
    const apply=item.applyUrl
      ?'<a class="loksewa-apply" href="'+escapeHtml(item.applyUrl)+'" target="_blank" rel="noopener noreferrer">'+loksewaText("Official application / login ↗","आधिकारिक आवेदन / लगइन ↗")+'</a>'
      :'<p class="loksewa-uncertain">'+loksewaText("Login link not independently confirmed — find it through the official website.","प्रत्यक्ष लगइन लिङ्क पुष्टि भएको छैन — आधिकारिक वेबसाइटबाट खोज्नुहोस्।")+'</p>';
    return '<article class="card loksewa-card"><span class="tag">'+escapeHtml(classification)+'</span><h3>'+escapeHtml(name)+'</h3><p>'+escapeHtml(note)+'</p><div class="loksewa-actions"><a href="'+escapeHtml(item.website)+'" target="_blank" rel="noopener noreferrer">'+label+'</a>'+apply+'</div><p class="office-source">'+loksewaText("Source checked: ","स्रोत जाँच: ")+LOKSEWA_CHECKED_ON+' · <a href="'+escapeHtml(item.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(new URL(item.sourceUrl).hostname)+'</a></p></article>';
  }).join("");
}
function translateLoksewa(){
  const changes={
    "loksewaTitle":["Lok Sewa commissions & applications","लोक सेवा आयोग र आवेदन"],
    "loksewaIntro":["Find the right official commission, recruitment notices and application portal. This is an independent link directory, not a government login service.","सम्बन्धित आधिकारिक आयोग, विज्ञापन र आवेदन पोर्टल खोज्नुहोस्। यो स्वतन्त्र लिङ्क निर्देशिका हो, सरकारी लगइन सेवा होइन।"],
    "loksewaGuidanceTitle":["Which level should I choose?","कुन तह छान्ने?"],
    "loksewaGuidance":["Federal vacancies: check Nepal's Public Service Commission. Provincial vacancies: check the relevant province commission. Local government posts may be advertised through a provincial commission or another competent authority—always follow the specific official advertisement.","संघीय पदका लागि नेपालको लोक सेवा आयोग हेर्नुहोस्। प्रादेशिक पदका लागि सम्बन्धित प्रदेश आयोग हेर्नुहोस्। स्थानीय तहका पद प्रदेश आयोग वा सम्बन्धित अधिकारप्राप्त निकायबाट विज्ञापन हुन सक्छन्—सधैं आधिकारिक विज्ञापन जाँच गर्नुहोस्।"],
    "loksewaCaution":["Before applying: check official vacancy dates, qualifications, fee/payment instructions, syllabus, admit cards and results. Never enter passwords, citizenship data or make payments on PublicInfoHub.","आवेदनअघि आधिकारिक विज्ञापन मिति, योग्यता, शुल्क, पाठ्यक्रम, प्रवेशपत्र र नतिजा जाँच गर्नुहोस्। PublicInfoHub मा पासवर्ड, नागरिकता विवरण वा भुक्तानी नगर्नुहोस्।"],
    "loksewaLocalTitle":["Local government recruitment","स्थानीय तहको पदपूर्ति"],
    "loksewaLocalDescription":["Local-level government recruitment does not have one universal login. Read the relevant advertisement to identify whether the provincial commission or another authority accepts applications.","स्थानीय तहको भर्नाका लागि एउटै सार्वभौमिक लगइन छैन। आवेदन लिने निकाय प्रदेश आयोग वा अन्य अधिकारप्राप्त संस्था हो भन्ने सम्बन्धित विज्ञापनबाट पुष्टि गर्नुहोस्।"]
  };
  for(const [id,[en,ne]] of Object.entries(changes)) document.getElementById(id).textContent=loksewaText(en,ne);
  document.getElementById("loksewaLevel").options[0].textContent=loksewaText("All commission levels","सबै आयोग तह");
  document.getElementById("loksewaLevel").options[1].textContent=loksewaText("Federal","संघीय");
  document.getElementById("loksewaLevel").options[2].textContent=loksewaText("Provincial","प्रादेशिक");
  document.getElementById("loksewaProvince").options[0].textContent=loksewaText("All provinces","सबै प्रदेश");
  for(const opt of [...document.getElementById("loksewaProvince").options].slice(1))opt.textContent=uiProvince(opt.value);
  document.getElementById("loksewaLevel").setAttribute("aria-label",loksewaText("Filter Lok Sewa commissions by level","तहअनुसार लोक सेवा आयोग छान्नुहोस्"));
  document.getElementById("loksewaProvince").setAttribute("aria-label",loksewaText("Filter Lok Sewa by province","प्रदेशअनुसार लोक सेवा आयोग छान्नुहोस्"));
  loksewaCards();
}
function initializeLoksewa(){
  const province=document.getElementById("loksewaProvince");
  province.innerHTML='<option value="All">All provinces</option>'+NEPAL_REGIONS.map(r=>'<option value="'+escapeHtml(r.name)+'">'+escapeHtml(r.name)+'</option>').join("");
  for(const id of ["loksewaLevel","loksewaProvince"])document.getElementById(id).addEventListener("change",loksewaCards);
  translateLoksewa();
}
document.addEventListener("DOMContentLoaded",initializeLoksewa);
