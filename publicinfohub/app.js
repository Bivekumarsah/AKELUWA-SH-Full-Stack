const services = [
  { id: 'passport', name: 'Passport Information', category: 'Identity', icon: '🛂', desc: 'Find passport application guidance and the responsible government department.', agency: 'Department of Passports', url: 'https://nepalpassport.gov.np/', scope: 'Federal' },
  { id: 'pan', name: 'PAN Registration', category: 'Tax', icon: '🧾', desc: 'Find information about Personal and Business Permanent Account Numbers.', agency: 'Inland Revenue Department', url: 'https://ird.gov.np/', scope: 'Federal' },
  { id: 'company', name: 'Company Registration', category: 'Business', icon: '🏢', desc: 'Find official company registration information and requirements.', agency: 'Office of Company Registrar', url: 'https://ocr.gov.np/', scope: 'Federal' },
  { id: 'license', name: 'Driving License', category: 'Transport', icon: '🚗', desc: 'Find driving license information. Available offices and processes can vary by province.', agency: 'Department of Transport Management', url: 'https://dotm.gov.np/', scope: 'Provincial' },
  { id: 'nid', name: 'National Identity Card', category: 'Identity', icon: '🪪', desc: 'Find official information about national identity card services.', agency: 'Department of National ID and Civil Registration', url: 'https://donidcr.gov.np/', scope: 'Federal' },
  { id: 'birth', name: 'Birth Registration', category: 'Civil Registration', icon: '👶', desc: 'Learn where to start with civil registration through local government.', agency: 'Local Government / DONIDCR', url: 'https://donidcr.gov.np/', scope: 'Local' },
];
const provinces = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];
let query = ''; let category = 'All'; let province = '';
const $ = (id) => document.getElementById(id);

function render() {
  const categories = ['All', ...new Set(services.map((service) => service.category))];
  $('filters').innerHTML = categories.map((item) => `<button class="filter ${category === item ? 'active' : ''}" data-cat="${item}">${item}</button>`).join('');
  document.querySelectorAll('[data-cat]').forEach((button) => { button.onclick = () => { category = button.dataset.cat; render(); }; });
  const results = services.filter((service) => (category === 'All' || service.category === category) && (!query || [service.name, service.desc, service.agency, service.category].join(' ').toLowerCase().includes(query)));
  $('serviceGrid').innerHTML = results.length ? results.map((service) => `<button class="card service" data-id="${service.id}"><div class="symbol">${service.icon}</div><span class="tag">${service.category}</span><h3>${service.name}</h3><p>${service.desc}</p><footer>View service details →</footer></button>`).join('') : '<div class="empty">No matching services in this demonstration. Try a different search.</div>';
  document.querySelectorAll('[data-id]').forEach((button) => { button.onclick = () => showService(button.dataset.id); });
  $('resultCount').textContent = `${results.length} service${results.length === 1 ? '' : 's'} available in this demo`;
  $('provinces').innerHTML = provinces.map((item) => `<button class="province ${item === province ? 'active' : ''}" data-province="${item}">${item} <span>→</span></button>`).join('');
  document.querySelectorAll('[data-province]').forEach((button) => { button.onclick = () => { province = button.dataset.province; $('provinceMessage').textContent = `${province} selected. Province-specific office records will be added after source verification.`; render(); }; });
}
function showService(id) {
  const service = services.find((item) => item.id === id);
  $('detail').innerHTML = `<button class="close" id="closeDetail" aria-label="Close">✕</button><div class="symbol">${service.icon}</div><span class="tag">${service.category}</span><h2>${service.name}</h2><p class="muted">${service.desc}</p><p><strong>Responsible organization:</strong> ${service.agency}</p><p><strong>Scope:</strong> ${service.scope}</p><p><strong>Source:</strong> Official department website; verify current procedures there.</p><p><a href="${service.url}" target="_blank" rel="noopener noreferrer">Open government website ↗</a></p><p class="muted">This demo does not provide verified document lists, fees, or processing times.</p>`;
  $('modal').classList.add('show'); $('closeDetail').onclick = closeModal;
}
function closeModal() { $('modal').classList.remove('show'); }
document.addEventListener('DOMContentLoaded', () => {
  $('searchForm').onsubmit = (event) => { event.preventDefault(); query = $('searchInput').value.trim().toLowerCase(); render(); $('services').scrollIntoView({ behavior: 'smooth' }); };
  $('modal').onclick = (event) => { if (event.target.id === 'modal') closeModal(); };
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  render();
});
