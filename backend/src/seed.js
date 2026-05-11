const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const PURCHASE_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/purchase_data.json'), 'utf-8')
);
const KAS_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/kas_data.json'), 'utf-8')
);
const OP_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/operasional_data.json'), 'utf-8')
);
const FEE_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/fee_data.json'), 'utf-8')
);

async function seed() {
  const existing = await prisma.supplier.count();
  if (existing > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  console.log('Seeding database...');

  const supplierMap = {};
  const uniqueSuppliers = new Map();

  for (const p of PURCHASE_DATA.purchases) {
    if (!uniqueSuppliers.has(p.supplier)) {
      uniqueSuppliers.set(p.supplier, p.wilayah);
    }
  }
  for (const p of PURCHASE_DATA.payments) {
    if (!uniqueSuppliers.has(p.supplier)) {
      uniqueSuppliers.set(p.supplier, p.wilayah);
    }
  }

  for (const [name, wilayah] of uniqueSuppliers) {
    const s = await prisma.supplier.create({ data: { name, wilayah } });
    supplierMap[name] = s.id;
  }
  console.log(`  Created ${uniqueSuppliers.size} suppliers`);

  const purchaseBatch = PURCHASE_DATA.purchases.map(p => ({
    date: new Date(p.date),
    supplierId: supplierMap[p.supplier],
    wilayah: p.wilayah,
    deskripsi: p.desc || '',
    jenis: p.jenis || '',
    qty: p.qty || 0,
    price: p.price || 0,
    total: p.total || 0,
    kategori: p.kategori || 'Lainnya'
  }));

  let created = 0;
  for (let i = 0; i < purchaseBatch.length; i += 100) {
    const batch = purchaseBatch.slice(i, i + 100);
    await prisma.purchase.createMany({ data: batch });
    created += batch.length;
  }
  console.log(`  Created ${created} purchases`);

  const paymentBatch = PURCHASE_DATA.payments.map(p => ({
    date: new Date(p.date),
    supplierId: supplierMap[p.supplier],
    wilayah: p.wilayah,
    deskripsi: p.desc || '',
    amount: p.amount || 0,
    type: p.type || 'IN'
  }));

  created = 0;
  for (let i = 0; i < paymentBatch.length; i += 100) {
    const batch = paymentBatch.slice(i, i + 100);
    await prisma.payment.createMany({ data: batch });
    created += batch.length;
  }
  console.log(`  Created ${created} payments`);

  if (KAS_DATA.length > 0) {
    await prisma.kas.createMany({ data: KAS_DATA });
    console.log(`  Created ${KAS_DATA.length} kas entries`);
  }

  if (OP_DATA.length > 0) {
    await prisma.operasional.createMany({ data: OP_DATA });
    console.log(`  Created ${OP_DATA.length} operasional entries`);
  }

  if (FEE_DATA.length > 0) {
    await prisma.fee.createMany({ data: FEE_DATA });
    console.log(`  Created ${FEE_DATA.length} fee entries`);
  }

  console.log('Seed complete!');
}

seed()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
