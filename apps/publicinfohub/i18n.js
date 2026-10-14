// Client-side interface translation; records, URLs and source attestations remain unchanged.
const UI_LANGUAGES = Object.freeze(["en", "ne"]);
const UI_WORDS = {
  ne: {
    "Lok Sewa":"लोक सेवा","Categories":"वर्गहरू","Provinces":"प्रदेशहरू","Services":"सेवाहरू","Offices":"कार्यालयहरू","About":"हाम्रो बारेमा",
    "Explore services ↗":"सेवाहरू हेर्नुहोस् ↗","Menu":"मेनु","Independent public information directory • Nepal":"स्वतन्त्र सार्वजनिक सूचना निर्देशिका • नेपाल",
    "Public services.":"सार्वजनिक सेवाहरू.","One place to start.":"सुरु गर्ने एउटै ठाउँ.",
    "Explore Nepal government departments, service information, and official website links through a simple, accessible directory built by AKELUWA Softwarehub.":"AKELUWA Softwarehub को सरल निर्देशिकाबाट नेपालका सरकारी विभाग, सेवा जानकारी र आधिकारिक वेबसाइटका लिङ्क खोज्नुहोस्।",
    "Search →":"खोज्नुहोस् →","Provinces":"प्रदेशहरू","Districts nationwide":"देशभरका जिल्ला","Local governments":"स्थानीय तह",
    "Explore by category":"वर्गअनुसार खोज्नुहोस्","Discover relevant public resources without searching multiple websites.":"धेरै वेबसाइट नखोली सार्वजनिक स्रोतहरू पत्ता लगाउनुहोस्।",
    "Government Offices":"सरकारी कार्यालयहरू","Ministries and departments":"मन्त्रालय तथा विभागहरू","Identity & Documents":"परिचयपत्र तथा कागजात","Passport, identity, registration":"राहदानी, परिचयपत्र र दर्ता",
    "Business & Tax":"व्यवसाय तथा कर","Company and PAN services":"कम्पनी र स्थायी लेखा नम्बर सेवा","Transport Services":"यातायात सेवाहरू","Licensing and transport":"सवारी अनुमति तथा यातायात",
    "Explore Nepal's provinces":"नेपालका प्रदेशहरू हेर्नुहोस्",
    "Choose a province and district to browse our partial directory of checked local-government websites. Not every district has an indexed office.":"जाँच गरिएका स्थानीय सरकारका वेबसाइट हेर्न प्रदेश र जिल्ला छान्नुहोस्। यो अपूर्ण सूची हो; सबै जिल्लाका कार्यालय समेटिएका छैनन्।",
    "Select a province to view its districts.":"जिल्ला हेर्न प्रदेश छान्नुहोस्।",
    "Discover public services":"सार्वजनिक सेवाहरू खोज्नुहोस्","Browse example service entries":"नमुना सेवा विवरण हेर्नुहोस्","Clear search and filters":"खोज र फिल्टर हटाउनुहोस्",
    "Official government offices":"आधिकारिक सरकारी कार्यालयहरू",
    "A source-backed directory of government homepages across all seven provinces. Browse the growing selection of official government websites. Filter by province, office location district, category or government level. Selecting a district shows indexed headquarters there, not every public service available locally.":"सातै प्रदेशका सरकारी वेबसाइटको स्रोतसहितको आंशिक निर्देशिका। प्रदेश, जिल्ला, वर्ग वा सरकारको तहअनुसार फिल्टर गर्नुहोस्। जिल्लाको छनोटले त्यहाँ सूचीकृत कार्यालय मात्र देखाउँछ, सबै सेवा होइन।",
    "Find a government office":"सरकारी कार्यालय खोज्नुहोस्",
    "Reset office filters":"कार्यालय फिल्टर हटाउनुहोस्",
    "Government organization identities and homepage links were checked on 9 October 2026. Fees, documents, appointments and local office availability must be confirmed on the linked government website.":"सरकारी संस्थाको पहिचान र वेबसाइट लिङ्क ९ अक्टोबर २०२६ मा जाँच गरिएको हो। शुल्क, कागजात, समय र सेवा उपलब्धता सम्बन्धित सरकारी वेबसाइटमै पुष्टि गर्नुहोस्।",
    "Independent information platform.":"स्वतन्त्र सूचना मञ्च.",
    "Public information made easier to discover.":"सार्वजनिक जानकारी खोज्न सजिलो।",
    "Independent public information directory · Nepal":"स्वतन्त्र सार्वजनिक सूचना निर्देशिका · नेपाल",
    "Find official sources, not guesswork":"भरपर्दो आधिकारिक स्रोत खोज्नुहोस्",
    "Find government office websites, Lok Sewa application portals, and public-service guidance in one easy-to-use, independent Nepal directory.":"नेपालका सरकारी कार्यालयका वेबसाइट, लोक सेवा आवेदन पोर्टल र सेवा मार्गदर्शन एकै स्वतन्त्र र सहज निर्देशिकामा खोज्नुहोस्।",
    "Popular starting points:":"लोकप्रिय खोज:",
    "Passport":"राहदानी","PAN & tax":"प्यान र कर","Government offices":"सरकारी कार्यालयहरू",
    "Bilingual support":"दुई भाषाको सुविधा",
    "Districts":"जिल्ला","Checked office sites":"जाँच गरिएका कार्यालय वेबसाइट","Bilingual Support":"दुई भाषाको सेवा",
    "Browse by Category":"वर्गअनुसार हेर्नुहोस्","Quick access to commonly needed public resources and official links.":"प्रायः आवश्यक सार्वजनिक सेवा र आधिकारिक लिङ्क सहजै खोज्नुहोस्।",
    "Identity & Documents":"पहिचान र कागजात","Citizenship, passport, national ID":"नागरिकता, राहदानी, राष्ट्रिय परिचयपत्र",
    "Business & Tax":"व्यवसाय र कर","PAN, company registration, VAT":"प्यान, कम्पनी दर्ता, भ्याट",
    "Transport":"यातायात","Driving licences, vehicle registration":"चालक अनुमतिपत्र, सवारी दर्ता",
    "Government Offices":"सरकारी कार्यालयहरू","Ministries, departments, local bodies":"मन्त्रालय, विभाग, स्थानीय तह",
    "Federal and provincial commissions":"संघीय तथा प्रदेश लोक सेवा आयोग",
    "Municipalities and districts":"नगरपालिका र जिल्लाहरू",
    "Explore Services by Province":"प्रदेशअनुसार सेवा खोज्नुहोस्","Choose a province to browse its districts and indexed offices.":"जिल्ला र सूचीकृत कार्यालय हेर्न प्रदेश छान्नुहोस्।",
    "Find Your District":"आफ्नो जिल्ला खोज्नुहोस्","Choose a district to explore the available information.":"उपलब्ध जानकारी हेर्न जिल्ला छान्नुहोस्।",
    "PUBLIC INFORMATION · FOR EVERY CITIZEN":"सार्वजनिक सूचना · सबै नागरिकका लागि",
    "Find government websites, Lok Sewa application portals and helpful public-service information — simply and clearly.":"सरकारी वेबसाइट, लोक सेवा आवेदन पोर्टल र सेवासम्बन्धी उपयोगी जानकारी सरल तरिकाले खोज्नुहोस्।",

    "Find what you need, faster":"आवश्यक सेवा सजिलै खोज्नुहोस्",
    "Local Services":"स्थानीय सेवाहरू","Municipalities and district browsing":"नगरपालिका र जिल्लाको जानकारी",
    "Browse by topic and open the responsible official source when you are ready.":"विषयअनुसार खोजेर सम्बन्धित आधिकारिक स्रोत खोल्नुहोस्।",
    "Explore by province and district":"प्रदेश र जिल्लाअनुसार खोज्नुहोस्",
    "7 provinces · 77 districts":"७ प्रदेश · ७७ जिल्ला",
    "Select a province to reveal its district list.":"जिल्लाको सूची हेर्न प्रदेश छान्नुहोस्।",
    "Government office websites":"सरकारी कार्यालयका वेबसाइटहरू",
    "Making public information easier to find, understand and verify.":"सार्वजनिक सूचना खोज्न, बुझ्न र पुष्टि गर्न सहज बनाउँदै।",
    "An independent product of":"स्वतन्त्र उत्पादन:",
    "Explore":"अन्वेषण","Information":"जानकारी","Contact & support":"सम्पर्क तथा सहयोग",
    "Provinces & districts":"प्रदेश र जिल्ला","Public services":"सार्वजनिक सेवाहरू",
    "About this directory":"यो निर्देशिकाबारे","Privacy notice":"गोपनीयता सूचना",
    "Terms of use":"प्रयोगका सर्तहरू","Accessibility":"पहुँचयोग्यता",
    "Sources & corrections":"स्रोत र सच्याउने प्रक्रिया",
    "For product questions or to report outdated information, contact the team through our official company website.":"यस उत्पादनबारे सोधपुछ वा पुरानो सूचना सच्याउन हाम्रो कम्पनीको आधिकारिक वेबसाइटमार्फत सम्पर्क गर्नुहोस्।",
    "Visit AKELUWA Softwarehub ↗":"AKELUWA Softwarehub वेबसाइट ↗",
    "Back to top ↑":"माथि जानुहोस् ↑",
    "All":"सबै","Identity":"परिचय","Tax":"कर","Business":"व्यवसाय","Transport":"यातायात","Land":"भूमि","Local Government":"स्थानीय सरकार","Civil Registration":"घटना दर्ता",
    "Federal":"संघीय","Local":"स्थानीय","Provincial":"प्रादेशिक",
    "All categories":"सबै वर्ग","All provinces":"सबै प्रदेश","All headquarters districts":"सबै कार्यालय जिल्ला",
    "All government levels":"सरकारका सबै तह","Federal departments":"संघीय विभागहरू","Local governments":"स्थानीय तह",
    "Official homepage checked":"आधिकारिक वेबसाइट जाँच गरिएको","Location:":"स्थान:","Last checked:":"अन्तिम जाँच:","Source:":"स्रोत:",
    "Open official government website ↗":"आधिकारिक सरकारी वेबसाइट खोल्नुहोस् ↗","View service details →":"सेवाको विवरण हेर्नुहोस् →",
    "No matching organization homepages. Try resetting the office filters.":"मिल्ने कार्यालय वेबसाइट भेटिएन। फिल्टर हटाएर प्रयास गर्नुहोस्।",
    "No matching example services. Search for a different service, or browse the district index.":"मिल्ने नमुना सेवा भेटिएन। अर्को सेवा खोज्नुहोस् वा जिल्लाको सूची हेर्नुहोस्।",
    "Close service details":"सेवा विवरण बन्द गर्नुहोस्","Responsible organization:":"जिम्मेवार संस्था:","Scope:":"कार्यक्षेत्र:","Open government website ↗":"सरकारी वेबसाइट खोल्नुहोस् ↗",
    "Fees, requirements, deadlines and processing times are not verified here.":"शुल्क, आवश्यक कागजात, म्याद र प्रक्रिया समय यहाँ पुष्टि गरिएको छैन।",
    "Passport Information":"राहदानी जानकारी","PAN Registration":"स्थायी लेखा नम्बर (PAN) दर्ता","Company Registration":"कम्पनी दर्ता","Driving License":"सवारी चालक अनुमतिपत्र","National Identity Card":"राष्ट्रिय परिचयपत्र","Birth Registration":"जन्मदर्ता",
    "Department of Passports":"राहदानी विभाग","Inland Revenue Department":"आन्तरिक राजस्व विभाग","Office of Company Registrar":"कम्पनी रजिष्ट्रारको कार्यालय","Department of Transport Management":"यातायात व्यवस्था विभाग","Department of National ID and Civil Registration":"राष्ट्रिय परिचयपत्र तथा पञ्जीकरण विभाग",
    "Find passport application guidance and the responsible government department.":"राहदानी आवेदनसम्बन्धी जानकारी र सम्बन्धित सरकारी विभाग खोज्नुहोस्।",
    "Find information about Personal and Business Permanent Account Numbers.":"व्यक्तिगत तथा व्यावसायिक स्थायी लेखा नम्बरबारे जानकारी खोज्नुहोस्।",
    "Find official company registration information and requirements.":"कम्पनी दर्ताको आधिकारिक जानकारी र आवश्यकताहरू खोज्नुहोस्।",
    "Find driving license information. Available offices and processes can vary by province.":"सवारी चालक अनुमतिपत्रको जानकारी खोज्नुहोस्। कार्यालय र प्रक्रिया प्रदेशअनुसार फरक हुन सक्छ।",
    "Find official information about national identity card services.":"राष्ट्रिय परिचयपत्र सेवाबारे आधिकारिक जानकारी खोज्नुहोस्।",
    "Learn where to start with civil registration through local government.":"स्थानीय तहबाट घटना दर्ता कहाँ सुरु गर्ने भन्ने जानकारी लिनुहोस्।"
  }
};
const UI_PROVINCES_NE = Object.freeze({Koshi:"कोशी",Madhesh:"मधेश",Bagmati:"बागमती",Gandaki:"गण्डकी",Lumbini:"लुम्बिनी",Karnali:"कर्णाली",Sudurpashchim:"सुदूरपश्चिम"});
let uiLanguage = "en";
const uiText = (value) => uiLanguage === "ne" ? (UI_WORDS.ne[String(value)] || String(value)) : String(value);
const uiProvince = value => uiLanguage === "ne" ? (UI_PROVINCES_NE[value] || value) : value;
const uiDigits = value => uiLanguage === "ne" ? String(value).replace(/[0-9]/g, n => "०१२३४५६७८९"[Number(n)]) : String(value);
const uiOfficeName = office => uiLanguage === "ne" ? office.nameNe : office.name;
const UI_STATIC = [
  [".skip-link","Skip to main content","मुख्य सामग्रीमा जानुहोस्"],
  [".hero-badge","Independent public information directory · Nepal"],
  [".eyebrow","PUBLIC INFORMATION · FOR EVERY CITIZEN"],
  [".hero h1",null,"सार्वजनिक सेवा, कार्यालय र<br><span>आधिकारिक लिङ्कहरू — एकै ठाउँमा।</span>"],
  [".hero p","Find government websites, Lok Sewa application portals and helpful public-service information — simply and clearly."],
  [".popular-searches > span","Popular starting points:"],
  [".search button","Search →"],
  [".stats > div:nth-child(1)","Provinces",null,true],
  [".stats > div:nth-child(2)","Districts",null,true],
  [".stats > div:nth-child(3)","Checked office sites",null,true],
  [".stats > div:nth-child(4)","Bilingual Support",null,true],
  ["#categories h2","Browse by Category"],
  ["#categories .heading p","Quick access to commonly needed public resources and official links."],
  ["#categories .card:nth-child(1) h3","Identity & Documents"],
  ["#categories .card:nth-child(1) p","Citizenship, passport, national ID"],
  ["#categories .card:nth-child(2) h3","Business & Tax"],
  ["#categories .card:nth-child(2) p","PAN, company registration, VAT"],
  ["#categories .card:nth-child(3) h3","Transport"],
  ["#categories .card:nth-child(3) p","Driving licences, vehicle registration"],
  ["#categories .card:nth-child(4) h3","Government Offices"],
  ["#categories .card:nth-child(4) p","Ministries, departments, local bodies"],
  ["#categories .card:nth-child(5) h3","Lok Sewa"],
  ["#categories .card:nth-child(5) p","Federal and provincial commissions"],
  ["#categories .card:nth-child(6) h3","Local Services"],
  ["#categories .card:nth-child(6) p","Municipalities and districts"],
  ["#provinces-section h2","Explore Services by Province"],
  [".province-panel-intro strong","Explore Services by Province"],
  [".province-panel-intro span","Choose a province to browse its districts and indexed offices."],
  ["#districtFinderTitle","Find Your District"],
  ["#districtFinderHelp","Choose a district to explore the available information."],
  [".province-panel-intro strong","7 provinces · 77 districts"],
  [".province-panel-intro span","Select a province to reveal its district list."],
  ["#provinces-section .heading p","Choose a province and district to browse our partial directory of checked local-government websites. Not every district has an indexed office."],
  ["#services h2","Discover public services"],
  ["#clearFilters","Clear search and filters"],
  ["#offices h2","Government office websites"],
  ["#officeIndexLink","Browse 28 checked office websites by province →","प्रदेशअनुसार जाँच गरिएका २८ सरकारी वेबसाइट हेर्नुहोस् →"],
  ["#offices .heading p","A source-backed directory of government homepages across all seven provinces. Browse the growing selection of official government websites. Filter by province, office location district, category or government level. Selecting a district shows indexed headquarters there, not every public service available locally."],
  [".office-toolbar label","Find a government office"],
  ["#resetOfficeFilters","Reset office filters"],
  ["#shareOfficeSearch","Copy office search link","कार्यालय खोजको लिङ्क प्रतिलिपि गर्नुहोस्"],
  [".office-caution","Government organization identities and homepage links were checked on 9 October 2026. Fees, documents, appointments and local office availability must be confirmed on the linked government website."],
  [".footer-brand > p","Making public information easier to find, understand and verify."],
  [".footer-links:nth-child(2) h2","Explore"],
  [".footer-links:nth-child(3) h2","Information"],
  [".footer-links:nth-child(3) a:nth-of-type(1)","About this directory"],
  [".footer-links:nth-child(3) a:nth-of-type(2)","Privacy notice"],
  [".footer-links:nth-child(3) a:nth-of-type(3)","Terms of use"],
  [".footer-links:nth-child(3) a:nth-of-type(4)","Accessibility"],
  [".footer-links:nth-child(3) a:nth-of-type(5)","Sources & corrections"],
  [".footer-contact h2","Contact & support"],
  [".footer-contact > p:first-of-type","For product questions or to report outdated information, contact the team through our official company website."],
  [".footer-contact-link","Visit AKELUWA Softwarehub ↗"],
  [".footer-legal > a","Back to top ↑"],
  ["#privacy h2","Privacy notice"],
  ["#terms h2","Terms of use"],
  ["#accessibility h2","Accessibility"],
  ["#sources h2","Sources & corrections"]
];
function translateStaticUi() {
  document.documentElement.lang = uiLanguage;
  document.title = uiLanguage === "ne" ? "AKELUWA PublicInfoHub | नेपालका सार्वजनिक सेवा" : "AKELUWA PublicInfoHub | Nepal Public Services";
  for(const [selector, en, ne, preserveStrong] of UI_STATIC) {
    const el = document.querySelector(selector);
    if(!el) continue;
    if(selector === ".hero h1"){el.innerHTML = uiLanguage === "ne" ? ne : "Public services, offices, and<br><span>official links — in one trusted place.</span>";continue;}
    if(preserveStrong){const strong=el.querySelector("strong");const icon=el.querySelector(".stat-icon");const subtitle=el.querySelector("small");if(strong)el.replaceChildren(...(icon?[icon]:[]),strong,document.createTextNode(uiLanguage === "ne" ? " "+uiText(en) : en),...(subtitle?[subtitle]:[]));continue;}
    el.textContent = uiLanguage === "ne" && ne ? ne : uiText(en);
  }
  document.querySelectorAll("#primaryNav a").forEach((a,i)=>{a.textContent=uiText(["Categories","Provinces","Services","Offices","Lok Sewa","About"][i]);});
  const pill=document.querySelector(".nav > .pill"); if(pill) pill.textContent=uiText("Explore services ↗");
  document.querySelectorAll(".popular-searches a").forEach((a,i)=>{a.textContent=uiText(["Passport","PAN & tax","Lok Sewa","Government offices"][i]);});
  document.querySelectorAll(".footer-links:nth-child(2) a").forEach((a,i)=>{a.textContent=uiText(["Categories","Provinces & districts","Public services","Government Offices","Lok Sewa"][i]);});
  document.querySelectorAll(".footer-links:nth-child(3) a").forEach((a,i)=>{a.textContent=uiText(["About this directory","Privacy notice","Terms of use","Accessibility","Sources & corrections"][i]);});
  const menu=document.querySelector("#menuToggle span"); if(menu) menu.textContent=uiText("Menu");
  document.querySelector("#searchInput").placeholder = uiLanguage === "ne" ? "राहदानी, PAN, चालक अनुमतिपत्र, काठमाडौँ..." : "Try passport, PAN, driving license, Kathmandu...";
  document.querySelector("#searchInput").setAttribute("aria-label",uiLanguage === "ne" ? "सेवा खोज्नुहोस्" : "Search services");
  document.querySelector("#officeSearch").placeholder = uiLanguage === "ne" ? "कार्यालय, नेपाली नाम, वर्ग वा स्थान खोज्नुहोस्" : "Search office, नेपाली नाम, category or location";
  document.querySelector("#officeSearch").setAttribute("aria-label",uiLanguage === "ne" ? "सरकारी कार्यालय वेबसाइट खोज्नुहोस्" : "Search verified office homepages");
  document.querySelector("#langSwitch").textContent=uiLanguage === "ne" ? "English" : "नेपाली";
  document.querySelector("#langSwitch").lang=uiLanguage === "ne" ? "en" : "ne";
  document.querySelector("#menuToggle").setAttribute("aria-label",uiLanguage === "ne" ? "नेभिगेसन मेनु खोल्नुहोस्" : "Open navigation menu");
  document.querySelector("#langSwitch").setAttribute("aria-label",uiLanguage === "ne" ? "Switch to English" : "नेपाली भाषामा परिवर्तन गर्नुहोस्");
  const labels={officeCategory:"Filter offices by category",officeProvince:"Filter offices by province",officeDistrict:"Filter office headquarters by district",officeLevel:"Filter offices by government level"};
  const nepali={officeCategory:"वर्गअनुसार फिल्टर",officeProvince:"प्रदेशअनुसार फिल्टर",officeDistrict:"जिल्लाअनुसार फिल्टर",officeLevel:"सरकारको तहअनुसार फिल्टर"};
  Object.keys(labels).forEach(id => document.getElementById(id).setAttribute("aria-label",uiLanguage === "ne" ? nepali[id] : labels[id]));
  const notice=document.querySelector("#about .notice");
  if(notice) notice.textContent=uiLanguage === "ne"
    ? "स्वतन्त्र सूचना मञ्च। AKELUWA PublicInfoHub, AKELUWA Softwarehub ले निर्माण गरेको स्वतन्त्र निर्देशिका हो। यो नेपाल सरकारद्वारा सञ्चालित, सम्बद्ध वा अनुमोदित होइन। विवरण र लिङ्क सम्बन्धित सरकारी वेबसाइटमै पुष्टि गर्नुहोस्। भौगोलिक सूची खोजीका लागि मात्र हो। कार्यालयका वेबसाइट जाँच गरिएका भए पनि सेवा प्रक्रिया, शुल्क र उपलब्धता पुष्टि गरिएको छैन।"
    : "Independent information platform. AKELUWA PublicInfoHub is developed by AKELUWA Softwarehub. It is not operated, affiliated with, or endorsed by the Government of Nepal. Details and official links should be verified on the respective government websites. The geographic index is for browsing only; government office records and application guidance require independent source checks. Government organization homepages have been separately checked, but current procedures and service coverage remain unverified.";
}
