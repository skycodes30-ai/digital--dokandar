const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'ledger.json');
const DATA_VERSION = 2;

function createId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function createEmptyData() {
  return {
    version: DATA_VERSION,
    customers: [],
    transactions: [],
    selectedCustomerId: null,
  };
}

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(createEmptyData(), null, 2), 'utf8');
  }
}

function readData() {
  ensureStorage();
  const raw = fs.readFileSync(dataFile, 'utf8');
  try {
    const data = JSON.parse(raw);
    if (data.version !== DATA_VERSION) {
      const fresh = createEmptyData();
      fs.writeFileSync(dataFile, JSON.stringify(fresh, null, 2), 'utf8');
      return fresh;
    }
    return data;
  } catch (error) {
    const fresh = createEmptyData();
    fs.writeFileSync(dataFile, JSON.stringify(fresh, null, 2), 'utf8');
    return fresh;
  }
}

function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

function clampText(value) {
  return String(value || '').trim();
}

function computeBalance(customerId, transactions) {
  return transactions
    .filter((transaction) => transaction.customerId === customerId)
    .reduce((sum, transaction) => sum + (transaction.type === 'credit' ? transaction.amount : -transaction.amount), 0);
}

function buildSummary(data) {
  const totalCustomers = data.customers.length;
  const totalDue = data.customers.reduce((sum, customer) => sum + computeBalance(customer.id, data.transactions), 0);
  const pendingCustomers = data.customers.filter((customer) => computeBalance(customer.id, data.transactions) > 0).length;
  const today = new Date();
  const todayIncome = data.transactions
    .filter((transaction) => transaction.type === 'payment' && new Date(transaction.createdAt).toDateString() === today.toDateString())
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    totalCustomers,
    totalDue,
    pendingCustomers,
    todayIncome,
  };
}

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Shop ledger API ready' });
});

app.get('/api/customers', (req, res) => {
  const data = readData();
  res.json(data.customers);
});

app.get('/api/customers/:id', (req, res) => {
  const data = readData();
  const customer = data.customers.find((item) => item.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json({ ...customer, balance: computeBalance(customer.id, data.transactions) });
});

app.post('/api/customers', (req, res) => {
  const { name, phone, note } = req.body || {};
  const cleanedName = clampText(name);
  const cleanedPhone = clampText(phone).replace(/\D/g, '');

  if (!cleanedName || !cleanedPhone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  const data = readData();
  const customer = {
    id: createId('customer'),
    name: cleanedName,
    phone: cleanedPhone,
    note: clampText(note) || '—',
    createdAt: new Date().toISOString(),
  };

  data.customers.unshift(customer);
  data.selectedCustomerId = customer.id;
  writeData(data);
  res.status(201).json(customer);
});

app.get('/api/transactions', (req, res) => {
  const data = readData();
  const customerId = req.query.customerId;
  const transactions = customerId
    ? data.transactions.filter((tx) => tx.customerId === customerId)
    : data.transactions;

  res.json(transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20));
});

app.post('/api/transactions', (req, res) => {
  const { customerId, type, amount, note } = req.body || {};
  const numericAmount = Number(amount);

  if (!customerId || !type || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Valid customer, type and amount are required' });
  }

  const data = readData();
  const customer = data.customers.find((item) => item.id === customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const transaction = {
    id: createId('txn'),
    customerId,
    amount: Math.round(numericAmount),
    type,
    note: clampText(note) || 'সাধারণ লেনদেন',
    createdAt: new Date().toISOString(),
  };

  data.transactions.unshift(transaction);
  data.selectedCustomerId = customerId;
  writeData(data);
  res.status(201).json(transaction);
});

app.get('/api/summary', (req, res) => {
  const data = readData();
  res.json({
    ...buildSummary(data),
    selectedCustomerId: data.selectedCustomerId || data.customers[0]?.id || null,
    customers: data.customers.length,
  });
});

app.post('/api/reset', (req, res) => {
  const fresh = createEmptyData();
  writeData(fresh);
  res.json({ ok: true, message: 'Data reset successfully' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Shop ledger app running on port ${PORT}`);
});
