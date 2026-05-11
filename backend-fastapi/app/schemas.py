from datetime import datetime
from pydantic import BaseModel


class SupplierBase(BaseModel):
    name: str
    wilayah: str


class SupplierOut(SupplierBase):
    id: int
    total_kg: float = 0
    total_nilai: float = 0
    total_transaksi: int = 0
    total_masuk: float = 0
    total_keluar: float = 0
    saldo: float = 0

    model_config = {"from_attributes": True}


class SupplierName(BaseModel):
    name: str
    model_config = {"from_attributes": True}


class PurchaseOut(BaseModel):
    id: int
    date: datetime
    supplier_id: int
    wilayah: str
    deskripsi: str
    jenis: str
    qty: float
    price: float
    total: float
    kategori: str
    supplier: SupplierName | None = None

    model_config = {"from_attributes": True}


class PurchaseCreate(BaseModel):
    date: str
    supplierId: int
    wilayah: str
    deskripsi: str = ""
    jenis: str
    qty: float
    price: float
    kategori: str


class PaymentOut(BaseModel):
    id: int
    date: datetime
    supplier_id: int
    wilayah: str
    deskripsi: str
    amount: float
    type: str
    supplier: SupplierName | None = None

    model_config = {"from_attributes": True}


class Pagination(BaseModel):
    page: int
    limit: int
    total: int
    pages: int


class PaginatedPurchases(BaseModel):
    data: list[PurchaseOut]
    pagination: Pagination


class PaginatedPayments(BaseModel):
    data: list[PaymentOut]
    pagination: Pagination


class KasOut(BaseModel):
    id: int
    date: datetime
    wilayah: str
    deskripsi: str
    masuk: float
    keluar: float
    balance: float

    model_config = {"from_attributes": True}


class FeeOut(BaseModel):
    id: int
    partai: int
    wilayah: str
    kategori: str
    qty: float
    fee: float
    total: float

    model_config = {"from_attributes": True}


class OperasionalOut(BaseModel):
    id: int
    wilayah: str
    deskripsi: str
    jumlah: float

    model_config = {"from_attributes": True}
