import asyncio
import json
import os
import re
from datetime import datetime

from sqlalchemy import select, func
from .database import engine, SessionLocal
from .models import Base, Supplier, Purchase, Payment, Kas, Operasional, Fee

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def parse_date(val: str) -> datetime:
    if not val:
        return datetime(2025, 1, 1)
    s = val.strip()
    if "T" in s:
        s = s.split("T")[0]
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        y, m, d = int(s[:4]), int(s[5:7]), int(s[8:10])
        if y > 2100:
            y = y - 900
        return datetime(y, m, d)
    m = re.match(r"^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$", s)
    if m:
        day, mon, year = int(m.group(1)), MONTHS.get(m.group(2).lower()[:3], 1), int(m.group(3))
        return datetime(year, mon, day)
    return datetime(2025, 1, 1)


def load_json(name):
    with open(os.path.join(DATA_DIR, name), "r") as f:
        return json.load(f)


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        count = (await db.execute(select(func.count(Supplier.id)))).scalar()
        if count and count > 0:
            print("Database already seeded, skipping.")
            return

        print("Seeding database...")

        purchase_data = load_json("purchase_data.json")
        kas_data = load_json("kas_data.json")
        op_data = load_json("operasional_data.json")
        fee_data = load_json("fee_data.json")

        supplier_map = {}
        unique_suppliers = {}
        for p in purchase_data["purchases"]:
            if p["supplier"] not in unique_suppliers:
                unique_suppliers[p["supplier"]] = p["wilayah"]
        for p in purchase_data["payments"]:
            if p["supplier"] not in unique_suppliers:
                unique_suppliers[p["supplier"]] = p["wilayah"]

        for name, wilayah in unique_suppliers.items():
            s = Supplier(name=name, wilayah=wilayah)
            db.add(s)
            await db.flush()
            supplier_map[name] = s.id
        print(f"  Created {len(unique_suppliers)} suppliers")

        for p in purchase_data["purchases"]:
            db.add(Purchase(
                date=parse_date(p["date"]),
                supplier_id=supplier_map[p["supplier"]],
                wilayah=p["wilayah"],
                deskripsi=p.get("desc", ""),
                jenis=p.get("jenis", ""),
                qty=p.get("qty", 0),
                price=p.get("price", 0),
                total=p.get("total", 0),
                kategori=p.get("kategori", "Lainnya"),
            ))
        print(f"  Created {len(purchase_data['purchases'])} purchases")

        for p in purchase_data["payments"]:
            db.add(Payment(
                date=parse_date(p["date"]),
                supplier_id=supplier_map[p["supplier"]],
                wilayah=p["wilayah"],
                deskripsi=p.get("desc", ""),
                amount=p.get("amount", 0),
                type=p.get("type", "IN"),
            ))
        print(f"  Created {len(purchase_data['payments'])} payments")

        for k in kas_data:
            db.add(Kas(
                date=parse_date(k["date"]),
                wilayah=k["wilayah"],
                deskripsi=k.get("deskripsi", ""),
                masuk=k.get("masuk", 0),
                keluar=k.get("keluar", 0),
                balance=k.get("balance", 0),
            ))
        print(f"  Created {len(kas_data)} kas entries")

        for o in op_data:
            db.add(Operasional(
                wilayah=o["wilayah"],
                deskripsi=o.get("deskripsi", ""),
                jumlah=o.get("jumlah", 0),
            ))
        print(f"  Created {len(op_data)} operasional entries")

        for f_item in fee_data:
            db.add(Fee(
                partai=f_item["partai"],
                wilayah=f_item["wilayah"],
                kategori=f_item.get("kategori", ""),
                qty=f_item.get("qty", 0),
                fee=f_item.get("fee", 0),
                total=f_item.get("total", 0),
            ))
        print(f"  Created {len(fee_data)} fee entries")

        await db.commit()
        print("Seed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
