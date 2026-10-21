/* AKELUWA PublicInfoHub citizen utilities. Informational, client-side and independent of government. */
(function () {
  "use strict";
  const root = document.getElementById("utilityApp");
  if (!root) return;
  const id = document.body.dataset.tool;
  const $ = name => document.getElementById(name);
  const neDigits = text => String(text).replace(/[0-9]/g, n => "०१२३४५६७८९"[Number(n)]);
  const normalizeDigits = text => String(text).replace(/[०-९]/g, n => String("०१२३४५६७८९".indexOf(n)));
  const money = amount => "NPR " + Number(amount).toLocaleString("en-NP", { maximumFractionDigits: 2 });
  const el = (tag, content, cls) => { const n = document.createElement(tag); if (content != null) n.textContent = content; if (cls) n.className = cls; return n; };
  function show(text, error = false) {
    const output = $("utilityResult");
    if (!output) return;
    output.textContent = text;
    output.classList.toggle("error", error);
    output.hidden = false;
  }
  function value(name) { return normalizeDigits($(name).value.trim()); }
  function amount(name) {
    const n = Number(value(name));
    if (!Number.isFinite(n) || n < 0 || value(name) === "") throw new Error("Enter a valid non-negative number for " + name + ".");
    return n;
  }
  const num = n => String(n).padStart(2, "0");
  function parseDate(str) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (!match) throw new Error("Please enter a date in YYYY-MM-DD format.");
    return match.slice(1).map(Number);
  }
  function validAD(str) {
    const [y, m, d] = parseDate(str);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) throw new Error("Invalid Gregorian date.");
    return date;
  }
  function validBS(str) {
    const [y, m, d] = parseDate(str);
    if (m < 1 || m > 12 || d < 1 || d > 32 || y < 1975 || y > 2099) throw new Error("BS date outside the supported range.");
    if (typeof NepaliDate !== "function") throw new Error("Nepali date converter is unavailable. Check your connection and refresh.");
    const date = new NepaliDate(y, m - 1, d);
    const formatted = date.format("YYYY-MM-DD");
    if (formatted !== [y, num(m), num(d)].join("-")) throw new Error("Invalid BS date.");
    return date;
  }
  const formatAD = date => [date.getFullYear(), num(date.getMonth() + 1), num(date.getDate())].join("-");
  function asAD(input, calendar) { return calendar === "bs" ? validBS(input).toJsDate() : validAD(input); }
  function asBS(date) {
    if (typeof NepaliDate !== "function") throw new Error("Nepali date converter is unavailable. Check your connection and refresh.");
    return new NepaliDate(date).format("YYYY-MM-DD");
  }
  function ageParts(start, end) {
    const dayNumber = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    if (dayNumber(start) > dayNumber(end)) throw new Error("Birth date must not be after the selected reference date.");
    // Clamp the monthly anniversary when the birth day does not exist in a later
    // month (for example, Jan 31 -> Feb 28), avoiding negative day components.
    const anniversary = monthsFromBirth => {
      const year = start.getFullYear() + Math.floor((start.getMonth() + monthsFromBirth) / 12);
      const month = (start.getMonth() + monthsFromBirth) % 12;
      const maxDay = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(start.getDate(), maxDay));
    };
    let completeMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    if (dayNumber(anniversary(completeMonths)) > dayNumber(end)) completeMonths--;
    const afterMonths = anniversary(completeMonths);
    return {
      years: Math.floor(completeMonths / 12),
      months: completeMonths % 12,
      days: Math.round((dayNumber(end) - dayNumber(afterMonths)) / 86400000),
      totalDays: Math.round((dayNumber(end) - dayNumber(start)) / 86400000)
    };
  }
  function startDatePage() {
    const form = $("dateForm");
    if (!form) return;
    form.addEventListener("submit", event => {
      event.preventDefault();
      try {
        const input = value("dateInput");
        const calendar = $("dateFrom").value;
        const converted = calendar === "bs" ? formatAD(validBS(input).toJsDate()) + " AD" : asBS(validAD(input)) + " BS";
        show(converted);
      } catch (error) { show(error.message, true); }
    });
    $("dateFrom").addEventListener("change", () => {
      $("dateInput").value = $("dateFrom").value === "ad" ? "2024-04-13" : "2081-01-01";
      $("dateInputLabel").textContent = $("dateFrom").value === "ad" ? "Gregorian (AD) date" : "Bikram Sambat (BS) date";
      $("utilityResult").hidden = true;
    });
  }
  function startAgePage() {
    const today = new Date();
    if (!$("ageReference").value) $("ageReference").value = formatAD(today);
    $("ageForm").addEventListener("submit", event => {
      event.preventDefault();
      try {
        const birth = asAD(value("ageBirth"), $("ageCalendar").value);
        const reference = validAD(value("ageReference"));
        const result = ageParts(birth, reference);
        show(result.years + " years, " + result.months + " months, " + result.days + " days\n" +
          result.totalDays.toLocaleString("en-NP") + " elapsed days (Gregorian dates).\nBirth date (AD): " + formatAD(birth));
      } catch(error) { show(error.message, true); }
    });
    $("ageCalendar").addEventListener("change", () => {
      $("ageBirth").value = $("ageCalendar").value === "bs" ? "2080-01-01" : "2023-04-14";
      $("utilityResult").hidden = true;
    });
  }
  function startTaxPage() {
    $("salaryForm").addEventListener("submit", event => {
      event.preventDefault();
      try {
        const gross = amount("monthlyPay");
        const basic = amount("basicPay");
        const employeeRate = amount("employeeRate");
        const employerRate = amount("employerRate");
        const tds = amount("taxWithheld");
        if (basic > gross) throw new Error("Basic salary cannot exceed total monthly gross pay.");
        if (employeeRate > 100 || employerRate > 100) throw new Error("A contribution percentage cannot exceed 100%.");
        const employee = basic * employeeRate / 100;
        const employer = basic * employerRate / 100;
        const net = gross - employee - tds;
        if (net < 0) throw new Error("Employee SSF and entered withholding exceed gross pay.");
        show("Employee SSF: " + money(employee) + "\nEmployer SSF: " + money(employer) +
          "\nTotal SSF: " + money(employee + employer) + "\nEstimated take-home (using your entered tax withholding): " +
          money(net) + "\nEmployer monthly cost (excluding other expenses): " + money(gross + employer) +
          "\n\nIncome tax is NOT automatically calculated. Verify your salary basis, eligibility, and current tax withholding with IRD or payroll.");
      } catch(error) { show(error.message, true); }
    });
  }
  const FORMS = [
    {name:"E-passport application and appointment",agency:"Department of Passports",category:"Identity",url:"https://online.nepalpassport.gov.np/",source:"https://nepalpassport.gov.np/en/process/process-40",note:"Apply or book appointments only on the official passport portal."},
    {name:"Permanent Account Number (PAN) registration information",agency:"Inland Revenue Department",category:"Tax",url:"https://ird.gov.np/",source:"https://ird.gov.np/",note:"Find the current registration route from IRD; do not submit identity details on this directory."},
    {name:"National ID and civil registration information",agency:"Department of National ID and Civil Registration",category:"Identity",url:"https://donidcr.gov.np/",source:"https://donidcr.gov.np/",note:"Start from the responsible department; verify whether pre-enrolment is available."},
    {name:"Company registration information",agency:"Office of Company Registrar",category:"Business",url:"https://ocr.gov.np/",source:"https://ocr.gov.np/",note:"Check company filing requirements on the official registrar website."},
    {name:"Driving licence services and forms",agency:"Department of Transport Management",category:"Transport",url:"https://dotm.gov.np/",source:"https://dotm.gov.np/",note:"Province-level application routes and appointments may differ."},
    {name:"Federal Lok Sewa recruitment and application",agency:"Public Service Commission",category:"Exams",url:"https://psc.gov.np/",source:"https://psc.gov.np/",note:"Check current notices before applying; account and application portals are external."},
    {name:"Government public holiday notice (2083 BS)",agency:"Ministry of Home Affairs",category:"Notices",url:"https://moha.gov.np/en/page/government-and-public-holidays-in-2083",source:"https://moha.gov.np/en/page/government-and-public-holidays-in-2083",note:"Read the official PDF notice for dates and any applicable exceptions."}
  ];
  const CHECKLISTS = [
    {name:"Passport application preparation",source:"https://nepalpassport.gov.np/en/process/process-40",items:["Read the department's current passport procedure.","Select the correct issue, renewal or replacement application type.","Check the official document requirements for your specific case.","Complete the official online form and appointment process.","Bring the official application confirmation and originals requested by the department."]},
    {name:"PAN registration preparation",source:"https://ird.gov.np/",items:["Check whether you require a personal or business PAN.","Visit the IRD portal and confirm the current registration instructions.","Prepare identification or registration details as the official application specifies.","Retain any official application reference or receipt.","Verify the completed registration with IRD."]},
    {name:"National identity card preparation",source:"https://donidcr.gov.np/",items:["Check the department's current enrollment instructions.","Confirm which local office or enrollment location serves you.","Prepare identity documents as stated by the official authority.","Check appointment, biometric and presence requirements.","Retain official confirmation or reference details."]},
    {name:"Lok Sewa application preparation",source:"https://psc.gov.np/",items:["Read the exact vacancy advertisement and eligibility requirements.","Check the advertised deadline, syllabus and application route.","Prepare certificates and photo/signature files in the requested formats.","Apply through the correct official commission portal.","Retain your application confirmation and monitor official notices."]},
    {name:"Driving licence application preparation",source:"https://dotm.gov.np/",items:["Identify the responsible province's transport office.","Read current eligibility and licensing category requirements.","Check the official online form or appointment route.","Prepare the documents requested by the responsible office.","Confirm exam and payment instructions only through official sources."]}
  ];
  function link(url, text) {
    const a = el("a", text, "utility-link");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }
  function searchCards(items, query, render) {
    const list = $("utilityList");
    list.replaceChildren();
    const matches = items.filter(item => (item.name + " " + (item.agency || "") + " " + (item.category || "") + " " + (item.province || "")).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    for (const item of matches) list.append(render(item));
    $("utilityCount").textContent = matches.length + " of " + items.length + " entries shown";
    if (!matches.length) list.append(el("p", "No matching entries. Try a broader search.", "utility-empty"));
  }
  function startFormsPage() {
    const render = item => {
      const card = el("article", null, "utility-entry");
      card.append(el("div", item.category, "utility-tag"), el("h3", item.name), el("p", item.agency), el("p", item.note, "utility-muted"), link(item.url, "Open official site ↗"));
      if (item.source !== item.url) card.append(link(item.source, "Official source ↗"));
      return card;
    };
    const update = () => searchCards(FORMS, $("utilitySearch").value, render);
    $("utilitySearch").addEventListener("input", update);
    update();
  }
  function startChecklistPage() {
    const render = item => {
      const card = el("article", null, "utility-entry");
      card.append(el("h3", item.name));
      const ul = el("ul");
      for (const step of item.items) { const li = el("li"); const label = el("label"); const input = document.createElement("input"); input.type = "checkbox"; label.append(input, document.createTextNode(" " + step)); li.append(label); ul.append(li); }
      card.append(ul, el("p", "General preparation suggestions only. Requirements are not verified for individual applicants.", "utility-muted"), link(item.source, "Check official requirements ↗"));
      return card;
    };
    searchCards(CHECKLISTS, "", render);
    $("utilityCount").textContent = "Select tasks as you prepare; selections stay in this browser tab.";
  }
  function startOfficeMapPage() {
    if (typeof GOVERNMENT_OFFICES === "undefined") { show("Office information could not be loaded.", true); return; }
    const items = GOVERNMENT_OFFICES;
    const regions = [...new Set(items.map(item => item.province))];
    for (const name of regions) { const option = el("option", name); option.value = name; $("provinceFilter").append(option); }
    const render = item => {
      const card = el("article", null, "utility-entry");
      card.append(el("div", item.province + " · " + item.district, "utility-tag"), el("h3", item.name), el("p", item.city), el("p", "Directory address is descriptive; the map search result is not a verified building pin.", "utility-muted"));
      const osm = "https://www.openstreetmap.org/search?query=" + encodeURIComponent(item.name + " " + item.city + " Nepal");
      card.append(link(osm, "Search on OpenStreetMap ↗"), link(item.website, "Official office website ↗"));
      return card;
    };
    const update = () => {
      const province = $("provinceFilter").value;
      const subset = province ? items.filter(item => item.province === province) : items;
      searchCards(subset, $("utilitySearch").value, render);
      $("utilityCount").textContent = document.querySelectorAll("#utilityList .utility-entry").length + " listed offices in the selected area (out of " + items.length + " verified homepages).";
    };
    $("utilitySearch").addEventListener("input", update);
    $("provinceFilter").addEventListener("change", update);
    update();
  }
  function startHolidayPage() {
    const now = new Date();
    let displayed = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    function render() {
      $("calendarTitle").textContent = displayed.toLocaleString("en-NP", { month: "long", year: "numeric" });
      const grid = $("calendarGrid");
      grid.replaceChildren();
      for (const day of weekdays) grid.append(el("span", day, "calendar-weekday"));
      for (let blank = 0; blank < displayed.getDay(); blank++) grid.append(el("span", "", "calendar-blank"));
      const total = new Date(displayed.getFullYear(), displayed.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= total; day++) {
        const dt = new Date(displayed.getFullYear(), displayed.getMonth(), day);
        const cell = el("span", String(day), "calendar-day");
        if (dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && day === now.getDate()) cell.classList.add("calendar-today");
        grid.append(cell);
      }
      $("calendarNote").textContent = "Gregorian calendar for reference only. Days are not marked as public holidays; consult the official 2083 BS holiday notice below.";
    }
    $("prevMonth").addEventListener("click", () => { displayed = new Date(displayed.getFullYear(), displayed.getMonth() - 1, 1); render(); });
    $("nextMonth").addEventListener("click", () => { displayed = new Date(displayed.getFullYear(), displayed.getMonth() + 1, 1); render(); });
    $("currentMonth").addEventListener("click", () => { displayed = new Date(now.getFullYear(), now.getMonth(), 1); render(); });
    render();
  }
  function startExamsPage() {
    if (typeof LOKSEWA_PORTALS === "undefined") { show("Exam portal information could not be loaded.", true); return; }
    const items = LOKSEWA_PORTALS;
    const render = item => {
      const card = el("article", null, "utility-entry");
      card.append(el("div", item.province || "Federal", "utility-tag"), el("h3", item.name), el("p", item.note, "utility-muted"),
        link(item.website, "Official commission ↗"), link(item.applyUrl, "Application portal ↗"));
      return card;
    };
    const update = () => searchCards(items, $("utilitySearch").value, render);
    $("utilitySearch").addEventListener("input", update);
    update();
  }
  const handlers = {
    "bs-ad": startDatePage, "age": startAgePage, "salary-tax-ssf": startTaxPage,
    "forms": startFormsPage, "checklists": startChecklistPage, "office-map": startOfficeMapPage,
    "holidays": startHolidayPage, "exam-portals": startExamsPage
  };
  if (handlers[id]) handlers[id]();
})();
