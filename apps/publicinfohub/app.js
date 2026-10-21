const services=[
{id:"passport",name:"Passport Information",category:"Identity",icon:"🛂",desc:"Find passport application guidance and the responsible government department.",agency:"Department of Passports",url:"https://nepalpassport.gov.np/",scope:"Federal"},
{id:"pan",name:"PAN Registration",category:"Tax",icon:"🧾",desc:"Find information about Personal and Business Permanent Account Numbers.",agency:"Inland Revenue Department",url:"https://ird.gov.np/",scope:"Federal"},
{id:"company",name:"Company Registration",category:"Business",icon:"🏢",desc:"Find official company registration information and requirements.",agency:"Office of Company Registrar",url:"https://ocr.gov.np/",scope:"Federal"},
{id:"license",name:"Driving License",category:"Transport",icon:"🚗",desc:"Find driving license information. Available offices and processes can vary by province.",agency:"Department of Transport Management",url:"https://dotm.gov.np/",scope:"Provincial"},
{id:"nid",name:"National Identity Card",category:"Identity",icon:"🪪",desc:"Find official information about national identity card services.",agency:"Department of National ID and Civil Registration",url:"https://donidcr.gov.np/",scope:"Federal"},
{id:"birth",name:"Birth Registration",category:"Civil Registration",icon:"👶",desc:"Learn where to start with civil registration through local government.",agency:"Local Government / DONIDCR",url:"https://donidcr.gov.np/",scope:"Local"}
];
let query = "", category = "All", province = "", district = "";
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[char]);
const regionFor = name => NEPAL_REGIONS.find(region => region.name === name);
const searchText = item => [item.name,item.desc,item.agency,item.category,item.scope,uiText(item.name),uiText(item.desc),uiText(item.category)].join(" ").toLocaleLowerCase();
const renderButton = (label, type, active) =>
  '<button type="button" class="'+type+(active?' active':'')+'" data-'+type+'="'+escapeHtml(label)+'" aria-pressed="'+active+'">'+escapeHtml(uiText(label))+'</button>';

function renderRegions() {
  $("provinces").innerHTML = NEPAL_REGIONS.map(region =>
    '<button type="button" class="province'+(region.name===province?' active':'')+'" data-province="'+escapeHtml(region.name)+'" aria-pressed="'+(region.name===province)+'"><span class="province-icon" aria-hidden="true">'+(NEPAL_REGIONS.indexOf(region)+1)+'</span><span class="province-title">'+escapeHtml(uiProvince(region.name))+'</span><span class="province-count">'+uiDigits(region.districts.length)+(uiLanguage==='ne'?' जिल्ला →':' districts →')+'</span></button>'
  ).join("");
  const selected=regionFor(province);
  const visible=selected ? selected.districts.filter(name=>name.toLowerCase().includes(query)) :
    query ? NEPAL_REGIONS.flatMap(region=>region.districts.map(name=>({name,region:region.name}))).filter(item=>item.name.toLowerCase().includes(query)||item.region.toLowerCase().includes(query)) : [];
  if(selected){
    $("provinceMessage").textContent=uiLanguage === "ne" ? uiProvince(province)+" प्रदेश • "+uiDigits(selected.districts.length)+" जिल्ला" : province+" Province • "+selected.districts.length+" districts";
  } else if(query && visible.length) {
    $("provinceMessage").textContent=uiLanguage === "ne" ? "नेपालभरका मिल्ने जिल्ला। जिल्लाहरू हेर्न प्रदेश छान्नुहोस्।" : "District matches across Nepal. Select a province to browse its districts.";
  } else {
    $("provinceMessage").textContent=uiLanguage === "ne" ? "जिल्लाहरू हेर्न प्रदेश छान्नुहोस्।" : "Select a province to browse its districts.";
  }
  $("districts").innerHTML=(selected ? visible.map(name=>({name,region:province})):visible).map(item=>
    '<button type="button" class="district'+(item.name===district&&item.region===province?' active':'')+'" data-district="'+escapeHtml(item.name)+'" data-region="'+escapeHtml(item.region)+'" aria-pressed="'+(item.name===district&&item.region===province)+'">'+escapeHtml(item.name)+(selected?'':' <small>'+escapeHtml(uiProvince(item.region))+'</small>')+'</button>'
  ).join("");
  const localOffices = GOVERNMENT_OFFICES.filter(office => office.level === "Local" && office.province === province && office.district === district);
  const label = district ?
    (localOffices.length ? district + ", " + province + ": " + localOffices.length + " checked local government homepage" + (localOffices.length === 1 ? "" : "s") + " available in our partial directory. Service availability is not verified." :
      district + ", " + province + ": no local government homepages indexed yet. This does not mean there are no government offices in this district.") :
    selected ? "Select a district to find checked local government homepages, where available. Coverage is partial." :
    query && !visible.length ? "No matching districts. Try another search term." : "";
  $("districtMessage").textContent=uiLanguage === "ne" ? (district ? (localOffices.length ? uiDigits(localOffices.length)+" सूचीकृत स्थानीय सरकारको वेबसाइट "+district+", "+uiProvince(province)+" मा उपलब्ध छ। सेवा उपलब्धता पुष्टि गरिएको छैन।" : district+", "+uiProvince(province)+" मा अहिलेसम्म कुनै स्थानीय सरकारको वेबसाइट सूचीकृत छैन। यसले त्यहाँ कार्यालय छैन भन्ने जनाउँदैन।") : selected ? "सूचीकृत सरकारी वेबसाइट हेर्न जिल्ला छान्नुहोस्। सूची आंशिक छ।" : query && !visible.length ? "मिल्ने जिल्ला भेटिएन। अर्को शब्द खोज्नुहोस्।" : "") : label;
  const districtOfficeAction = $("districtOfficeAction");
  districtOfficeAction.hidden = !district || localOffices.length === 0;
  districtOfficeAction.textContent = district && localOffices.length ?
    (uiLanguage === "ne" ? district+" का "+uiDigits(localOffices.length)+" सूचीकृत स्थानीय कार्यालय हेर्नुहोस् →" : "View " + localOffices.length + " listed local government office" + (localOffices.length === 1 ? "" : "s") + " in " + district + " →") : "";
  document.querySelectorAll("[data-province]").forEach(btn=>btn.addEventListener("click",()=>{
    province=province===btn.dataset.province?"":btn.dataset.province;district="";render();
  }));
  document.querySelectorAll("[data-district]").forEach(btn=>btn.addEventListener("click",()=>{
    province=btn.dataset.region;
    district=district===btn.dataset.district?"":btn.dataset.district;
    render();
  }));
}
function openSelectedDistrictOffices() {
  if (!province || !district) return;
  const matching = GOVERNMENT_OFFICES.some(office => office.level === "Local" && office.province === province && office.district === district);
  if (!matching) return;
  $("officeSearch").value = "";
  $("officeCategory").value = "All";
  $("officeLevel").value = "Local";
  $("officeProvince").value = province;
  $("officeProvince").dispatchEvent(new Event("change"));
  $("officeDistrict").value = district;
  renderOffices();
  $("offices").scrollIntoView({behavior:"smooth"});
  $("officeDistrict").focus({preventScroll:true});
}
function render() {
  const cats=["All",...new Set(services.map(s=>s.category))];
  $("filters").innerHTML=cats.map(cat=>renderButton(cat,"filter",category===cat)).join("");
  document.querySelectorAll("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{
    category=btn.dataset.filter;render();
  }));
  const matches=services.filter(item=>(category==="All"||item.category===category)&&(!query||searchText(item).includes(query)));
  $("serviceGrid").innerHTML=matches.length ? matches.map(item=>
    '<button type="button" class="card service" data-service="'+escapeHtml(item.id)+'"><div class="symbol">'+escapeHtml(item.icon)+'</div><span class="tag">'+escapeHtml(uiText(item.category))+'</span><h3>'+escapeHtml(uiText(item.name))+'</h3><p>'+escapeHtml(uiText(item.desc))+'</p><footer>'+escapeHtml(uiText('View service details →'))+'</footer></button>'
  ).join("") : '<div class="empty">'+escapeHtml(uiText('No matching example services. Search for a different service, or browse the district index.'))+'</div>';
  document.querySelectorAll("[data-service]").forEach(btn=>btn.addEventListener("click",()=>showService(btn.dataset.service)));
  $("resultCount").textContent=uiLanguage === "ne" ? uiDigits(matches.length)+" नमुना सेवा • यी राष्ट्रिय सन्दर्भ मात्र हुन्, जिल्लाका विशेष कार्यालय सूची होइनन्।" : matches.length+" sample service"+(matches.length===1?"":"s")+" • These are national references, not district-specific office listings.";
  renderRegions();
}

function initOfficeFilters() {
  const provinceSelect = $("officeProvince");
  const districtSelect = $("officeDistrict");
  const regionNames = NEPAL_REGIONS.map(region => region.name);
  provinceSelect.innerHTML = '<option value="All">'+uiText('All provinces')+'</option>' + regionNames.map(name =>
    '<option value="' + escapeHtml(name) + '">' + escapeHtml(uiProvince(name)) + '</option>'
  ).join("");
  const refreshDistrictOptions = () => {
    const selectedProvince = provinceSelect.value;
    const previous = districtSelect.value;
    const districts = [...new Set(GOVERNMENT_OFFICES
      .filter(office => selectedProvince === "All" || office.province === selectedProvince)
      .map(office => office.district))].sort();
    districtSelect.innerHTML = '<option value="All">'+uiText('All headquarters districts')+'</option>' +
      districts.map(name => '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>').join("");
    districtSelect.value = districts.includes(previous) ? previous : "All";
    renderOffices();
  };
  const localCount = GOVERNMENT_OFFICES.filter(office => office.level === "Local").length;
  const coverageCount = new Set(GOVERNMENT_OFFICES.filter(office => office.level === "Local").map(office => office.province)).size;
  $("officeSummary").textContent = uiLanguage === "ne" ? uiDigits(GOVERNMENT_OFFICES.length)+" सूचीकृत सरकारी वेबसाइट ("+uiDigits(localCount)+" स्थानीय तह, "+uiDigits(GOVERNMENT_OFFICES.length-localCount)+" संघीय विभाग), "+uiDigits(coverageCount)+" प्रदेशमा। यो आंशिक निर्देशिका हो, पूर्ण राष्ट्रिय अभिलेख होइन।" : GOVERNMENT_OFFICES.length + " indexed government organization homepages (" + localCount + " local governments, " + (GOVERNMENT_OFFICES.length - localCount) + " federal departments) across " + coverageCount + " provinces. This is a partial directory, not a complete nationwide registry.";
  $("resetOfficeFilters").addEventListener("click", () => {
    $("officeSort").value = "name";
    $("officeSearch").value = "";
    $("officeCategory").value = "All";
    $("officeLevel").value = "All";
    provinceSelect.value = "All";
    districtSelect.value = "All";
    refreshDistrictOptions();
    $("officeSearch").focus();
  });
  $("officeSearch").addEventListener("input", renderOffices);
  $("officeCategory").addEventListener("change", renderOffices);
  $("officeLevel").addEventListener("change", renderOffices);
  $("officeSort").addEventListener("change", renderOffices);
  districtSelect.addEventListener("change", renderOffices);
  provinceSelect.addEventListener("change", refreshDistrictOptions);
  refreshDistrictOptions();
  updateOfficeSortLabels();
  // Populate only known, valid filters from a copied URL.
  const restored=readOfficeLink(window.location.search,GOVERNMENT_OFFICES,NEPAL_REGIONS);
  $("officeSearch").value=restored.search;
  $("officeCategory").value=restored.category;
  $("officeLevel").value=restored.level;
  provinceSelect.value=restored.province;
  refreshDistrictOptions();
  districtSelect.value=restored.district;
  renderOffices();

  $("shareOfficeSearch").addEventListener("click", async () => {
    const shareUrl=makeOfficeLink(window.location.href,{
      search:$("officeSearch").value,
      category:$("officeCategory").value,
      province:provinceSelect.value,
      district:districtSelect.value,
      level:$("officeLevel").value
    });
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard not available");
      await navigator.clipboard.writeText(shareUrl);
      $("officeShareStatus").textContent=uiLanguage==="ne" ? "कार्यालय खोजको लिङ्क प्रतिलिपि गरियो।" : "Office search link copied. Share it to open these filters.";
    } catch {
      // Some browsers block clipboard access on untrusted origins.
      window.prompt(uiLanguage==="ne" ? "यो लिङ्क प्रतिलिपि गर्नुहोस्:" : "Copy this office search link:",shareUrl);
      $("officeShareStatus").textContent=uiLanguage==="ne" ? "लिङ्क प्रतिलिपि गर्न माथिको ठेगाना छान्नुहोस्।" : "Use the displayed URL to share this office search.";
    }
  });
}

// Keep the sort labels bilingual while preserving the user's selected order.
function updateOfficeSortLabels() {
  const select = $("officeSort");
  const labels = uiLanguage === "ne"
    ? ["नाम अनुसार", "प्रदेश र नाम अनुसार", "हालसालै जाँच गरिएको"]
    : ["Name A–Z", "Province then name", "Recently checked"];
  select.parentElement.firstChild.nodeValue = uiLanguage === "ne" ? "कार्यालय क्रमबद्ध गर्नुहोस्" : "Sort offices";
  select.setAttribute("aria-label", uiLanguage === "ne" ? "सरकारी कार्यालयको सूची क्रमबद्ध गर्नुहोस्" : "Sort listed government offices");
  [...select.options].forEach((option,index)=>{option.textContent=labels[index]});
}

function renderOffices() {
  const officeQuery = $("officeSearch").value.trim().toLocaleLowerCase();
  const officeCategory = $("officeCategory").value;
  const officeProvince = $("officeProvince").value;
  const officeDistrict = $("officeDistrict").value;
  const officeLevel = $("officeLevel").value;
  const matches = sortDirectoryOffices(GOVERNMENT_OFFICES.filter(office =>
    (officeCategory === "All" || office.category === officeCategory) &&
    (officeProvince === "All" || office.province === officeProvince) &&
    (officeDistrict === "All" || office.district === officeDistrict) &&
    (officeLevel === "All" || office.level === officeLevel) &&
    (!officeQuery || [office.name, office.nameNe, office.category, uiText(office.category), office.level, office.city, office.province, uiProvince(office.province), office.district, office.description]
      .join(" ").toLocaleLowerCase().includes(officeQuery))
  ), $("officeSort").value, uiLanguage);
  $("officeCount").textContent = uiLanguage === "ne" ? uiDigits(matches.length)+" जाँच गरिएका सरकारी वेबसाइट भेटिए" : matches.length + " checked government organization homepage" + (matches.length === 1 ? "" : "s") + " found";
  $("officeGrid").innerHTML = matches.length ? matches.map(office =>
    '<article class="card office-card" id="office-' + escapeHtml(office.id) + '"><div class="office-meta"><span class="tag">' + escapeHtml(uiText(office.category)) +
    ' · ' + escapeHtml(uiText(office.level)) + '</span><span class="verified-label">' + escapeHtml(uiText('Official homepage checked')) + '</span></div><h3>' + escapeHtml(uiOfficeName(office)) +
    '</h3><p class="office-ne">' + escapeHtml(office.nameNe) +
    '</p><p>' + escapeHtml(uiLanguage === 'ne' ? 'आधिकारिक सरकारी वेबसाइट र सूचना। हालको सेवा विवरण सम्बन्धित कार्यालयमै पुष्टि गर्नुहोस्।' : office.description) +
    '</p><p><strong>' + escapeHtml(uiText('Location:')) + '</strong> ' + escapeHtml(office.city) + ', ' + escapeHtml(uiProvince(office.province)) + (uiLanguage === 'ne' ? ' प्रदेश' : ' Province') +
    '</p><p><strong>' + escapeHtml(uiText('Last checked:')) + '</strong> ' + escapeHtml(uiDigits(office.checkedOn)) +
    '</p><a class="office-link" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(office.website) +
    '">'+escapeHtml(uiText('Open official government website ↗'))+'</a><p class="office-source">'+escapeHtml(uiText('Source:'))+' <a target="_blank" rel="noopener noreferrer" href="' +
    escapeHtml(office.sourceUrl) + '">' + escapeHtml(new URL(office.sourceUrl).hostname) + '</a></p></article>'
  ).join("") : '<p class="empty">'+escapeHtml(uiText('No matching organization homepages. Try resetting the office filters.'))+'</p>';
}

let previousFocus=null;
function showService(id) {
  const item=services.find(s=>s.id===id);
  if(!item)return;
  previousFocus=document.activeElement;
  const detail=$("detail");
  detail.innerHTML='<button type="button" class="close" id="closeDetail" aria-label="'+escapeHtml(uiText('Close service details'))+'">✕</button>'+
    '<div class="symbol">'+escapeHtml(item.icon)+'</div><span class="tag">'+escapeHtml(uiText(item.category))+'</span><h2 id="dialogTitle">'+escapeHtml(uiText(item.name))+'</h2>'+
    '<p class="muted">'+escapeHtml(uiText(item.desc))+'</p><p><strong>'+escapeHtml(uiText('Responsible organization:'))+'</strong> '+escapeHtml(uiText(item.agency))+'</p>'+
    '<p><strong>'+escapeHtml(uiText('Scope:'))+'</strong> '+escapeHtml(uiText(item.scope))+'</p><p><strong>'+escapeHtml(uiText('Source:'))+'</strong> '+(uiLanguage === 'ne' ? 'सम्बन्धित विभागको वेबसाइट; वर्तमान प्रक्रिया आधिकारिक साइटमा पुष्टि गर्नुहोस्।' : 'Department homepage; confirm current procedures on the official site.')+'</p>'+
    '<p><a href="'+escapeHtml(item.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(uiText('Open government website ↗'))+'</a></p>'+
    '<p class="muted">'+escapeHtml(uiText('Fees, requirements, deadlines and processing times are not verified here.'))+'</p>';
  $("modal").classList.add("show");
  $("modal").setAttribute("aria-hidden","false");
  $("closeDetail").addEventListener("click",closeModal);
  $("closeDetail").focus();
}
function closeModal() {
  if(!$("modal").classList.contains("show"))return;
  $("modal").classList.remove("show");
  $("modal").setAttribute("aria-hidden","true");
  if(previousFocus&&typeof previousFocus.focus==="function")previousFocus.focus();
}
document.addEventListener("DOMContentLoaded",()=>{
  const footerYear=$("footerYear");if(footerYear)footerYear.textContent=String(new Date().getFullYear());
  const quickDistrict=$("quickDistrict");
  if(quickDistrict){
    quickDistrict.innerHTML='<option value="">Select your district</option>'+NEPAL_REGIONS.flatMap(region=>region.districts.map(name=>'<option value="'+escapeHtml(region.name+'|'+name)+'">'+escapeHtml(name+' · '+region.name)+'</option>')).join("");
    quickDistrict.addEventListener("change",()=>{
      if(!quickDistrict.value)return;
      const [name,place]=quickDistrict.value.split("|");
      province=name;district=place;query="";$("searchInput").value="";
      render();
      $("districtMessage").scrollIntoView({behavior:"smooth",block:"center"});
    });
  }

  $("districtOfficeAction").addEventListener("click", openSelectedDistrictOffices);
  const menuToggle = $("menuToggle");
  const primaryNav = $("primaryNav");
  function closeMenu() {
    primaryNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
  }
  menuToggle.addEventListener("click", () => {
    const opened = primaryNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(opened));
    menuToggle.setAttribute("aria-label", opened ? "Close navigation menu" : "Open navigation menu");
  });
  primaryNav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
  document.addEventListener("click", event => {
    if (!primaryNav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });
  translateStaticUi();
  $("langSwitch").addEventListener("click", () => {
    if ($("modal").classList.contains("show")) closeModal();
    uiLanguage = uiLanguage === "en" ? "ne" : "en";
    translateStaticUi();
    for(const id of ["officeCategory","officeLevel"]){
      [...$(id).options].forEach(option => {
        option.textContent=uiText(option.value === "All" ? (id === "officeCategory" ? "All categories" : "All government levels") : option.value === "Federal" ? "Federal departments" : option.value === "Local" ? "Local governments" : option.value);
      });
    }
    [...$("officeProvince").options].forEach(option => {option.textContent=option.value === "All" ? uiText("All provinces") : uiProvince(option.value);});
    [...$("officeDistrict").options].forEach(option => {option.textContent=option.value === "All" ? uiText("All headquarters districts") : option.value;});
    const locals=GOVERNMENT_OFFICES.filter(office=>office.level==="Local").length;
    const coverage=new Set(GOVERNMENT_OFFICES.filter(office=>office.level==="Local").map(office=>office.province)).size;
    $("officeSummary").textContent=uiLanguage==="ne" ? uiDigits(GOVERNMENT_OFFICES.length)+" सूचीकृत सरकारी वेबसाइट ("+uiDigits(locals)+" स्थानीय तह, "+uiDigits(GOVERNMENT_OFFICES.length-locals)+" संघीय विभाग), "+uiDigits(coverage)+" प्रदेशमा। यो आंशिक निर्देशिका हो, पूर्ण राष्ट्रिय अभिलेख होइन।" : GOVERNMENT_OFFICES.length+" indexed government organization homepages ("+locals+" local governments, "+(GOVERNMENT_OFFICES.length-locals)+" federal departments) across "+coverage+" provinces. This is a partial directory, not a complete nationwide registry.";
    render();
    updateOfficeSortLabels();
    renderOffices();
    translateLoksewa();
    if(quickDistrict){
      quickDistrict.options[0].textContent=uiLanguage==="ne"?"आफ्नो जिल्ला छान्नुहोस्":"Select your district";
      [...quickDistrict.options].slice(1).forEach(option=>{const [name,place]=option.value.split("|");option.textContent=place+" · "+uiProvince(name);});
    }
  });
  initOfficeFilters();
  $("modal").setAttribute("aria-hidden","true");
  $("modal").setAttribute("aria-labelledby","dialogTitle");
  // Popular searches perform the action they describe, instead of only scrolling
  // to an unfiltered directory. Links retain their anchor destinations without JS.
  document.querySelectorAll("[data-quick-search]").forEach(link => {
    link.addEventListener("click", event => {
      const phrase = link.dataset.quickSearch;
      if(!phrase)return;
      event.preventDefault();
      query=phrase.trim().toLocaleLowerCase();
      category="All";
      $("searchInput").value=phrase;
      render();
      $("services").scrollIntoView({behavior:"smooth",block:"start"});
    });
  });
  $("searchForm").addEventListener("submit",event=>{
    event.preventDefault();query=$("searchInput").value.trim().toLowerCase();render();
    const districtMatches=NEPAL_REGIONS.some(region=>[region.name,uiProvince(region.name)].some(n=>n.toLocaleLowerCase().includes(query))||region.districts.some(d=>d.toLocaleLowerCase().includes(query)));
    const serviceMatches=services.some(item=>searchText(item).includes(query));
    const officeMatches=GOVERNMENT_OFFICES.some(item=>[item.name,item.nameNe,item.city,item.province,uiProvince(item.province),item.district,item.category,uiText(item.category)].join(" ").toLocaleLowerCase().includes(query));
    if(officeMatches && !serviceMatches && !districtMatches) {
      $("officeSearch").value=$("searchInput").value.trim();
      renderOffices();
    }
    $(districtMatches?"provinces-section":serviceMatches?"services":officeMatches?"offices":"services").scrollIntoView({behavior:"smooth"});
  });
  $("clearFilters").addEventListener("click",()=>{
    query="";category="All";province="";district="";$("searchInput").value="";render();
  });
  document.querySelectorAll("#categories .card").forEach((card,index)=>{
    card.addEventListener("click",event=>{
      event.preventDefault();
      if(index===3){$("offices").scrollIntoView({behavior:"smooth"});$("officeSearch").focus({preventScroll:true});return;}
      if(index===4){$("loksewa").scrollIntoView({behavior:"smooth"});return;}
      if(index===5){$("provinces-section").scrollIntoView({behavior:"smooth"});return;}
      category=["Identity","Business","Transport"][index];
      render();$("services").scrollIntoView({behavior:"smooth"});
    });
  });
  $("modal").addEventListener("click",event=>{if(event.target===$("modal"))closeModal()});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){closeModal();closeMenu();}
    if(event.key==="Tab"&&$("modal").classList.contains("show")){
      const focusables=[...$("detail").querySelectorAll("button,a[href]")];
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
  });
  render();
});
