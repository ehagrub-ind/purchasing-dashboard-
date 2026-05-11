import asyncio
import json
import os
import re
from datetime import datetime

from sqlalchemy import select, func
from .database import engine, SessionLocal
from .models import Base, Supplier, Purchase, Payment, Kas, Operasional, Fee, MasterBahan, MasterWilayah, MasterPIC, MasterUkuran, MasterWarna, Petani, UserTeam

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
        ut_count = (await db.execute(select(func.count(UserTeam.id)))).scalar()
        if not ut_count or ut_count == 0:
            user_data = [
                {"nama": "David", "email": "david@indohaircorp.co.id", "telepon": "0812-3456-7890", "role": "Owner"},
                {"nama": "Dian", "email": "dian@indohaircorp.co.id", "telepon": "", "role": "Admin"},
                {"nama": "Rigen", "email": "rigen@indohaircorp.co.id", "telepon": "", "role": "PIC"},
            ]
            for item in user_data:
                db.add(UserTeam(**item))
            await db.commit()
            print(f"  Created {len(user_data)} user team entries")

        mb_count = (await db.execute(select(func.count(MasterBahan.id)))).scalar()
        if not mb_count or mb_count == 0:
            master_bahan_data = [
                {"kode_bahan": "RMS", "nama_bahan": "Remy Super", "kategori_bahan": "Bahan Baku", "satuan": "kg"},
                {"kode_bahan": "RMB", "nama_bahan": "Remy Biasa", "kategori_bahan": "Bahan Baku", "satuan": "kg"},
                {"kode_bahan": "RMA", "nama_bahan": "Remy Anak", "kategori_bahan": "Bahan Baku", "satuan": "kg"},
                {"kode_bahan": "LSP", "nama_bahan": "Lus Panjang", "kategori_bahan": "Bahan Proses", "satuan": "kg"},
                {"kode_bahan": "LSK", "nama_bahan": "Lus Pendek", "kategori_bahan": "Bahan Proses", "satuan": "kg"},
                {"kode_bahan": "BRK", "nama_bahan": "Brangkas", "kategori_bahan": "Bahan Baku", "satuan": "kg"},
                {"kode_bahan": "KRB", "nama_bahan": "Kribo/Ombak", "kategori_bahan": "Bahan Proses", "satuan": "kg"},
                {"kode_bahan": "UBN", "nama_bahan": "Uban", "kategori_bahan": "Recycle/WIP", "satuan": "kg"},
                {"kode_bahan": "GMB", "nama_bahan": "Gimbal", "kategori_bahan": "Recycle/WIP", "satuan": "kg"},
                {"kode_bahan": "LMB", "nama_bahan": "Limbah Rambut", "kategori_bahan": "Recycle/WIP", "satuan": "kg"},
            ]
            for item in master_bahan_data:
                db.add(MasterBahan(**item))
            await db.commit()
            print(f"  Created {len(master_bahan_data)} master bahan entries")

        pic_count = (await db.execute(select(func.count(MasterPIC.id)))).scalar()
        if not pic_count or pic_count == 0:
            pic_data = [
                {"kode_pic": "RIGEN", "nama_pic": "Rigen", "telepon": ""},
                {"kode_pic": "PAKDE", "nama_pic": "Pakde", "telepon": ""},
                {"kode_pic": "IMPOR", "nama_pic": "Impor", "telepon": ""},
            ]
            for item in pic_data:
                db.add(MasterPIC(**item))
            await db.commit()
            print(f"  Created {len(pic_data)} master PIC entries")

        wil_count = (await db.execute(select(func.count(MasterWilayah.id)))).scalar()
        if not wil_count or wil_count == 0:
            wilayah_data = [
                {"kode_wilayah": "WIL-01", "nama_wilayah": "Purbalingga", "provinsi": "JATENG", "pic": "RIGEN"},
                {"kode_wilayah": "WIL-02", "nama_wilayah": "Banjarnegara", "provinsi": "JATENG", "pic": "RIGEN"},
                {"kode_wilayah": "WIL-03", "nama_wilayah": "Wonosobo", "provinsi": "JATENG", "pic": "RIGEN"},
                {"kode_wilayah": "WIL-04", "nama_wilayah": "Pemalang", "provinsi": "JATENG", "pic": "PAKDE"},
                {"kode_wilayah": "WIL-05", "nama_wilayah": "Tegal", "provinsi": "JATENG", "pic": "PAKDE"},
                {"kode_wilayah": "WIL-06", "nama_wilayah": "Brebes", "provinsi": "JATENG", "pic": "PAKDE"},
                {"kode_wilayah": "WIL-07", "nama_wilayah": "Cilacap", "provinsi": "JATENG", "pic": "RIGEN"},
                {"kode_wilayah": "WIL-08", "nama_wilayah": "Kebumen", "provinsi": "JATENG", "pic": "PAKDE"},
                {"kode_wilayah": "WIL-09", "nama_wilayah": "Surabaya", "provinsi": "JATIM", "pic": "RIGEN"},
                {"kode_wilayah": "WIL-10", "nama_wilayah": "Malang", "provinsi": "JATIM", "pic": "RIGEN"},
                {"kode_wilayah": "WIL-11", "nama_wilayah": "Kediri", "provinsi": "JATIM", "pic": "PAKDE"},
                {"kode_wilayah": "WIL-12", "nama_wilayah": "Jember", "provinsi": "JATIM", "pic": "PAKDE"},
                {"kode_wilayah": "WIL-13", "nama_wilayah": "Madiun", "provinsi": "JATIM", "pic": "RIGEN"},
                {"kode_wilayah": "WIL-14", "nama_wilayah": "Ponorogo", "provinsi": "JATIM", "pic": "PAKDE"},
                {"kode_wilayah": "WIL-15", "nama_wilayah": "Bandung", "provinsi": "JABAR", "pic": "RIGEN"},
                {"kode_wilayah": "WIL-16", "nama_wilayah": "Bekasi", "provinsi": "JABAR", "pic": "PAKDE"},
                {"kode_wilayah": "WIL-17", "nama_wilayah": "Bogor", "provinsi": "JABAR", "pic": "RIGEN"},
                {"kode_wilayah": "WIL-18", "nama_wilayah": "Garut", "provinsi": "JABAR", "pic": "PAKDE"},
                {"kode_wilayah": "WIL-19", "nama_wilayah": "Tasikmalaya", "provinsi": "JABAR", "pic": "RIGEN"},
                {"kode_wilayah": "WIL-20", "nama_wilayah": "Ciamis", "provinsi": "JABAR", "pic": "PAKDE"},
            ]
            for item in wilayah_data:
                db.add(MasterWilayah(**item))
            await db.commit()
            print(f"  Created {len(wilayah_data)} master wilayah entries")

        uk_count = (await db.execute(select(func.count(MasterUkuran.id)))).scalar()
        if not uk_count or uk_count == 0:
            ukuran_data = [
                {"kode_ukuran": "10", "nama_ukuran": '10"', "satuan": "inch"},
                {"kode_ukuran": "12", "nama_ukuran": '12"', "satuan": "inch"},
                {"kode_ukuran": "14", "nama_ukuran": '14"', "satuan": "inch"},
                {"kode_ukuran": "16", "nama_ukuran": '16"', "satuan": "inch"},
                {"kode_ukuran": "17", "nama_ukuran": '17"', "satuan": "inch"},
                {"kode_ukuran": "18", "nama_ukuran": '18"', "satuan": "inch"},
                {"kode_ukuran": "19", "nama_ukuran": '19"', "satuan": "inch"},
                {"kode_ukuran": "20", "nama_ukuran": '20"', "satuan": "inch"},
                {"kode_ukuran": "21", "nama_ukuran": '21"', "satuan": "inch"},
                {"kode_ukuran": "22", "nama_ukuran": '22"', "satuan": "inch"},
                {"kode_ukuran": "23", "nama_ukuran": '23"', "satuan": "inch"},
                {"kode_ukuran": "24", "nama_ukuran": '24"', "satuan": "inch"},
                {"kode_ukuran": "25", "nama_ukuran": '25"', "satuan": "inch"},
                {"kode_ukuran": "26", "nama_ukuran": '26"', "satuan": "inch"},
                {"kode_ukuran": "27", "nama_ukuran": '27"', "satuan": "inch"},
            ]
            for item in ukuran_data:
                db.add(MasterUkuran(**item))
            await db.commit()
            print(f"  Created {len(ukuran_data)} master ukuran entries")

        wr_count = (await db.execute(select(func.count(MasterWarna.id)))).scalar()
        if not wr_count or wr_count == 0:
            warna_data = [
                {"kode_warna": "HT", "nama_warna": "Hitam"},
                {"kode_warna": "UB", "nama_warna": "Uban"},
                {"kode_warna": "CK", "nama_warna": "Coklat"},
                {"kode_warna": "PR", "nama_warna": "Pirang"},
                {"kode_warna": "MX", "nama_warna": "Mix/Campuran"},
            ]
            for item in warna_data:
                db.add(MasterWarna(**item))
            await db.commit()
            print(f"  Created {len(warna_data)} master warna entries")

        count = (await db.execute(select(func.count(Supplier.id)))).scalar()
        if count and count > 0:
            print("Database already seeded, skipping.")
            return

        print("Seeding database...")

        purchase_data = load_json("purchase_data.json")
        kas_data = load_json("kas_data.json")
        op_data = load_json("operasional_data.json")
        fee_data = load_json("fee_data.json")

        pic_map = {
            "Regen": "RIGEN", "Dani": "RIGEN", "Gandi": "PAKDE", "Topik": "PAKDE",
            "Feri": "RIGEN", "Indra": "PAKDE", "Solihin": "RIGEN",
            "Kosim": "PAKDE", "Uyi": "RIGEN",
        }

        supplier_map = {}
        unique_suppliers = {}
        for p in purchase_data["purchases"]:
            if p["supplier"] not in unique_suppliers:
                unique_suppliers[p["supplier"]] = p["wilayah"]
        for p in purchase_data["payments"]:
            if p["supplier"] not in unique_suppliers:
                unique_suppliers[p["supplier"]] = p["wilayah"]

        for name, wilayah in unique_suppliers.items():
            s = Supplier(name=name, wilayah=wilayah, pic=pic_map.get(name, "RIGEN"), jalur="Lokal")
            db.add(s)
            await db.flush()
            supplier_map[name] = s.id

        import_suppliers = [
            {"name": "Mr Islam", "wilayah": "Impor", "pic": "IMPOR", "jalur": "Impor"},
            {"name": "Pak Ucup", "wilayah": "Impor", "pic": "IMPOR", "jalur": "Impor"},
        ]
        for imp in import_suppliers:
            s = Supplier(**imp)
            db.add(s)
            await db.flush()
            supplier_map[imp["name"]] = s.id
        print(f"  Created {len(unique_suppliers) + len(import_suppliers)} suppliers (incl. import)")

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
