const state = {
  customers: [],
  transactions: [],
  summary: null,
  selectedCustomerId: null,
};

const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.()) || window.location.protocol === 'capacitor:';
const configuredApiBaseUrl = String(window.APP_CONFIG?.apiBaseUrl || '').replace(/\/$/, '');
const API_BASE_URL = isNativeApp ? configuredApiBaseUrl : '';

const elements = {
  metricCustomers: document.querySelector('#metricCustomers'),
  metricDue: document.querySelector('#metricDue'),
  metricToday: document.querySelector('#metricToday'),
  metricPending: document.querySelector('#metricPending'),
  customerForm: document.querySelector('#customerForm'),
  customerSearch: document.querySelector('#customerSearch'),
  customerList: document.querySelector('#customerList'),
  customerDetail: document.querySelector('#customerDetail'),
  amountInput: document.querySelector('#amountInput'),
  transactionNote: document.querySelector('#transactionNote'),
  transactionHistory: document.querySelector('#transactionHistory'),
  reminderMessage: document.querySelector('#reminderMessage'),
  voiceBtn: document.querySelector('#voiceBtn'),
  voiceOutput: document.querySelector('#voiceOutput'),
  exportBtn: document.querySelector('#exportBtn'),
  resetBtn: document.querySelector('#resetBtn'),
  copyReminderBtn: document.querySelector('#copyReminderBtn'),
  smsBtn: document.querySelector('#smsBtn'),
  whatsappBtn: document.querySelector('#whatsappBtn'),
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString('bn-BD')}৳`;
const getSelectedCustomer = () => state.customers.find((customer) => customer.id === state.selectedCustomerId);

async function requestJson(url, options) {
  const response = await fetch(`${API_BASE_URL}${url}`, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'অনুরোধটি সম্পন্ন হয়নি');
  return payload;
}

async function loadData() {
  const [customers, transactions, summary] = await Promise.all([
    requestJson('/api/customers'),
    requestJson('/api/transactions'),
    requestJson('/api/summary'),
  ]);
  state.customers = customers;
  state.transactions = transactions;
  state.summary = summary;
  state.selectedCustomerId = summary.selectedCustomerId || customers[0]?.id || null;
  render();
}

function render() {
  renderSummary();
  renderCustomerList();
  renderCustomerDetail();
  renderTransactionHistory();
  renderReminder();
}

function renderSummary() {
  elements.metricCustomers.textContent = state.summary?.totalCustomers || 0;
  elements.metricDue.textContent = formatMoney(state.summary?.totalDue);
  elements.metricToday.textContent = formatMoney(state.summary?.todayIncome);
  elements.metricPending.textContent = state.summary?.pendingCustomers || 0;
}

function renderCustomerList() {
  const query = elements.customerSearch.value.trim().toLowerCase();
  const customers = state.customers.filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(query));

  elements.customerList.innerHTML = customers.length
    ? customers.map((customer) => {
        const balance = getBalance(customer.id);
        return `<li class="customer-item ${customer.id === state.selectedCustomerId ? 'active' : ''}" data-customer-id="${customer.id}">
          <div class="customer-meta"><strong>${escapeHtml(customer.name)}</strong><span>${escapeHtml(customer.phone)}</span></div>
          <div class="customer-balance"><span class="${balance > 0 ? 'due' : 'paid'}">${formatMoney(Math.abs(balance))}</span><small>${balance > 0 ? 'বাকি' : 'জমা'}</small></div>
        </li>`;
      }).join('')
    : '<li class="empty-state">কোনো কাস্টমার পাওয়া যায়নি</li>';
}

function renderCustomerDetail() {
  const customer = getSelectedCustomer();
  if (!customer) {
    elements.customerDetail.className = 'customer-detail empty-state';
    elements.customerDetail.textContent = 'কাস্টমার নির্বাচন করুন';
    return;
  }

  const balance = getBalance(customer.id);
  elements.customerDetail.className = 'customer-detail';
  elements.customerDetail.innerHTML = `<div class="detail-header"><div><h3>${escapeHtml(customer.name)}</h3><span>${escapeHtml(customer.phone)}</span></div><span class="badge ${balance > 0 ? 'negative' : 'positive'}">${balance > 0 ? 'বাকি আছে' : 'হিসাব পরিষ্কার'}</span></div>
    <div class="detail-grid"><div class="info-box"><span class="label">বর্তমান বাকি</span><strong>${formatMoney(Math.abs(balance))}</strong></div><div class="info-box"><span class="label">নোট</span><strong>${escapeHtml(customer.note || 'নেই')}</strong></div></div>`;
}

function renderTransactionHistory() {
  const customerTransactions = state.transactions.filter((transaction) => transaction.customerId === state.selectedCustomerId);
  elements.transactionHistory.innerHTML = customerTransactions.length
    ? customerTransactions.slice(0, 10).map((transaction) => `<li class="transaction-item ${transaction.type}"><div><strong>${transaction.type === 'payment' ? 'দিলো' : 'পেলো'}</strong><small>${escapeHtml(transaction.note || 'সাধারণ লেনদেন')} · ${new Date(transaction.createdAt).toLocaleDateString('bn-BD')}</small></div><span class="amount">${transaction.type === 'payment' ? '+' : '-'}${formatMoney(transaction.amount)}</span></li>`).join('')
    : '<li class="empty-state">এখনও কোনো লেনদেন নেই</li>';
}

function renderReminder() {
  const customer = getSelectedCustomer();
  if (!customer) {
    elements.reminderMessage.value = '';
    return;
  }
  const balance = getBalance(customer.id);
  elements.reminderMessage.value = `${customer.name}, আপনার কাছে ${formatMoney(Math.max(balance, 0))} বাকি আছে। সুবিধামতো পরিশোধ করার অনুরোধ রইল। - ডিজিটাল দোকানদার`;
}

function getBalance(customerId) {
  return state.transactions.filter((transaction) => transaction.customerId === customerId).reduce((total, transaction) => total + (transaction.type === 'credit' ? transaction.amount : -transaction.amount), 0);
}

async function addTransaction(type) {
  const customer = getSelectedCustomer();
  const amount = Number(elements.amountInput.value);
  if (!customer) return alert('আগে একজন কাস্টমার নির্বাচন করুন।');
  if (!Number.isFinite(amount) || amount <= 0) return alert('সঠিক টাকার পরিমাণ লিখুন।');

  await requestJson('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: customer.id, type, amount, note: elements.transactionNote.value }) });
  elements.transactionNote.value = '';
  await loadData();
}

async function handleCustomerSubmit(event) {
  event.preventDefault();
  const form = event.target instanceof HTMLFormElement ? event.target : event.currentTarget;
  if (!form) return;
  const formData = new FormData(form);
  try {
    await requestJson('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(formData)) });
    form.reset();
    await loadData();
  } catch (error) {
    showError(error);
  }
}

function exportCsv() {
  const rows = [['নাম', 'ফোন', 'ব্যালেন্স'], ...state.customers.map((customer) => [customer.name, customer.phone, getBalance(customer.id)])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
  link.download = 'dokan-hisab.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function startVoiceCapture() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return alert('এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়।');
  const recognition = new Recognition();
  recognition.lang = 'bn-BD';
  recognition.onresult = (event) => { elements.voiceOutput.value = event.results[0][0].transcript; elements.transactionNote.value = event.results[0][0].transcript; };
  recognition.start();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function showError(error) { alert(error.message || 'একটি সমস্যা হয়েছে।'); }

elements.customerForm.addEventListener('submit', handleCustomerSubmit);
elements.customerSearch.addEventListener('input', renderCustomerList);
elements.customerList.addEventListener('click', (event) => { const item = event.target.closest('[data-customer-id]'); if (item) { state.selectedCustomerId = item.dataset.customerId; render(); } });
document.querySelectorAll('[data-transaction]').forEach((button) => button.addEventListener('click', () => addTransaction(button.dataset.transaction).catch(showError)));
elements.voiceBtn.addEventListener('click', startVoiceCapture);
elements.exportBtn.addEventListener('click', exportCsv);
elements.copyReminderBtn.addEventListener('click', () => navigator.clipboard?.writeText(elements.reminderMessage.value));
elements.smsBtn.addEventListener('click', () => { const customer = getSelectedCustomer(); if (customer) window.location.href = `sms:${customer.phone}?body=${encodeURIComponent(elements.reminderMessage.value)}`; });
elements.whatsappBtn.addEventListener('click', () => { const customer = getSelectedCustomer(); if (customer) window.open(`https://wa.me/${customer.phone}?text=${encodeURIComponent(elements.reminderMessage.value)}`, '_blank'); });
elements.resetBtn.addEventListener('click', () => { if (confirm('সব ডেটা রিসেট করবেন?')) requestJson('/api/reset', { method: 'POST' }).then(loadData).catch(showError); });

loadData().catch(showError);
