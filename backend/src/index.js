const express = require('express');
const cors = require('cors');
const path = require('path');

const overviewRoutes = require('./routes/overview');
const supplierRoutes = require('./routes/suppliers');
const purchaseRoutes = require('./routes/purchases');
const paymentRoutes = require('./routes/payments');
const kasRoutes = require('./routes/kas');
const operasionalRoutes = require('./routes/operasional');
const feeRoutes = require('./routes/fees');

const app = express();
const PORT = process.env.PORT || 4100;

app.use(cors());
app.use(express.json());
const publicDir = process.env.NODE_ENV === 'development'
  ? path.join(__dirname, '../../frontend')
  : path.join(__dirname, '../public');
app.use(express.static(publicDir));

app.use('/api/overview', overviewRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/kas', kasRoutes);
app.use('/api/operasional', operasionalRoutes);
app.use('/api/fees', feeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Purchasing Dashboard API running on port ${PORT}`);
});
