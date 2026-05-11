import json
import os
from fastapi import APIRouter

router = APIRouter()

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "import_data.json")


def _load():
    with open(DATA_PATH, "r") as f:
        return json.load(f)


@router.get("/")
async def get_import():
    return _load()


@router.get("/summary")
async def get_import_summary():
    data = _load()
    rm = data["raw_materials"]
    total_kg = sum(r["kg"] for r in rm)
    total_usd = sum(r["usd"] for r in rm)

    ucup = [p for p in data["payments"] if "ucup" in p["desc"].lower()]
    ucup_idr = sum(p["idr"] for p in ucup)
    ucup_usd = sum(p["usd"] for p in ucup)

    return {
        "account": data["account"],
        "raw_material_summary": {
            "total_kg": round(total_kg, 3),
            "total_usd": round(total_usd, 2),
            "avg_price_per_kg": round(total_usd / total_kg, 2) if total_kg else 0,
            "shipments": len(rm),
        },
        "pak_ucup_summary": {
            "total_idr": ucup_idr,
            "total_usd": round(ucup_usd, 2),
            "transactions": len(ucup),
            "avg_kurs": round(ucup_idr / ucup_usd) if ucup_usd else 0,
        },
        "balance": data["balance_timeline"][-1] if data["balance_timeline"] else None,
    }
