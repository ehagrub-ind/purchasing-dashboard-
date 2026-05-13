from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Index, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    wilayah: Mapped[str] = mapped_column(String)
    pic: Mapped[str] = mapped_column(String, default="")
    jalur: Mapped[str] = mapped_column(String, default="Lokal")
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    purchases: Mapped[list["Purchase"]] = relationship(back_populates="supplier")
    payments: Mapped[list["Payment"]] = relationship(back_populates="supplier")


class Petani(Base):
    __tablename__ = "petani"
    __table_args__ = (Index("ix_petani_supplier_id", "supplier_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nama: Mapped[str] = mapped_column(String)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"))
    wilayah: Mapped[str] = mapped_column(String, default="")
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    supplier: Mapped["Supplier"] = relationship()


class MasterWilayah(Base):
    __tablename__ = "master_wilayah"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kode_wilayah: Mapped[str] = mapped_column(String, unique=True)
    nama_wilayah: Mapped[str] = mapped_column(String)
    provinsi: Mapped[str] = mapped_column(String)
    pic: Mapped[str] = mapped_column(String, default="")
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MasterPIC(Base):
    __tablename__ = "master_pic"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kode_pic: Mapped[str] = mapped_column(String, unique=True)
    nama_pic: Mapped[str] = mapped_column(String)
    telepon: Mapped[str] = mapped_column(String, default="")
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserTeam(Base):
    __tablename__ = "user_team"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nama: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True)
    password_hash: Mapped[str] = mapped_column(String, default="")
    telepon: Mapped[str] = mapped_column(String, default="")
    role: Mapped[str] = mapped_column(String, default="PIC")
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MasterBahan(Base):
    __tablename__ = "master_bahan"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kode_bahan: Mapped[str] = mapped_column(String, unique=True)
    nama_bahan: Mapped[str] = mapped_column(String)
    kategori_bahan: Mapped[str] = mapped_column(String)
    ukuran_default: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    satuan: Mapped[str] = mapped_column(String, default="kg")
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    catatan: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SubBahan(Base):
    __tablename__ = "sub_bahan"
    __table_args__ = (Index("ix_sub_bahan_bahan_id", "bahan_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kode_sub: Mapped[str] = mapped_column(String, unique=True)
    nama_sub: Mapped[str] = mapped_column(String)
    bahan_id: Mapped[int] = mapped_column(Integer, ForeignKey("master_bahan.id"))
    satuan: Mapped[str] = mapped_column(String, default="kg")
    harga_standar: Mapped[float] = mapped_column(Float, default=0)
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    catatan: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    bahan: Mapped["MasterBahan"] = relationship()


class MasterUkuran(Base):
    __tablename__ = "master_ukuran"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kode_ukuran: Mapped[str] = mapped_column(String, unique=True)
    nama_ukuran: Mapped[str] = mapped_column(String)
    satuan: Mapped[str] = mapped_column(String, default="inch")
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MasterWarna(Base):
    __tablename__ = "master_warna"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kode_warna: Mapped[str] = mapped_column(String, unique=True)
    nama_warna: Mapped[str] = mapped_column(String)
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Purchase(Base):
    __tablename__ = "purchases"
    __table_args__ = (
        Index("ix_purchases_wilayah", "wilayah"),
        Index("ix_purchases_kategori", "kategori"),
        Index("ix_purchases_supplier_id", "supplier_id"),
        Index("ix_purchases_date", "date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[datetime] = mapped_column(DateTime)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"))
    wilayah: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str] = mapped_column(String, default="")
    petani: Mapped[str] = mapped_column(String, default="")
    jenis: Mapped[str] = mapped_column(String, default="")
    qty: Mapped[float] = mapped_column(Float, default=0)
    price: Mapped[float] = mapped_column(Float, default=0)
    total: Mapped[float] = mapped_column(Float, default=0)
    kategori: Mapped[str] = mapped_column(String, default="Lainnya")
    sub_bahan: Mapped[str] = mapped_column(String, default="")
    currency: Mapped[str] = mapped_column(String, default="IDR")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    supplier: Mapped["Supplier"] = relationship(back_populates="purchases")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_supplier_id", "supplier_id"),
        Index("ix_payments_type", "type"),
        Index("ix_payments_date", "date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[datetime] = mapped_column(DateTime)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"))
    wilayah: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str] = mapped_column(String, default="")
    amount: Mapped[float] = mapped_column(Float, default=0)
    type: Mapped[str] = mapped_column(String, default="IN")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    supplier: Mapped["Supplier"] = relationship(back_populates="payments")


class Kas(Base):
    __tablename__ = "kas"
    __table_args__ = (Index("ix_kas_wilayah", "wilayah"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[datetime] = mapped_column(DateTime)
    wilayah: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str] = mapped_column(String, default="")
    masuk: Mapped[float] = mapped_column(Float, default=0)
    keluar: Mapped[float] = mapped_column(Float, default=0)
    balance: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Operasional(Base):
    __tablename__ = "operasional"
    __table_args__ = (Index("ix_operasional_wilayah", "wilayah"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    wilayah: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str] = mapped_column(String, default="")
    jumlah: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Piutang(Base):
    __tablename__ = "piutang"
    __table_args__ = (
        Index("ix_piutang_status", "status"),
        Index("ix_piutang_pelanggan", "pelanggan"),
        Index("ix_piutang_jatuh_tempo", "jatuh_tempo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tanggal: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    jatuh_tempo: Mapped[datetime] = mapped_column(DateTime)
    pelanggan: Mapped[str] = mapped_column(String)
    keterangan: Mapped[str] = mapped_column(String, default="")
    jumlah: Mapped[float] = mapped_column(Float, default=0)
    terbayar: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String, default="belum_lunas")
    wilayah: Mapped[str] = mapped_column(String, default="")
    kategori: Mapped[str] = mapped_column(String, default="Lainnya")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Fee(Base):
    __tablename__ = "fees"
    __table_args__ = (
        Index("ix_fees_partai", "partai"),
        Index("ix_fees_wilayah", "wilayah"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    partai: Mapped[int] = mapped_column(Integer)
    wilayah: Mapped[str] = mapped_column(String)
    kategori: Mapped[str] = mapped_column(String)
    qty: Mapped[float] = mapped_column(Float, default=0)
    fee: Mapped[float] = mapped_column(Float, default=0)
    total: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_log"
    __table_args__ = (
        Index("ix_activity_log_user_id", "user_id"),
        Index("ix_activity_log_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    user_nama: Mapped[str] = mapped_column(String, default="")
    action: Mapped[str] = mapped_column(String)
    target: Mapped[str] = mapped_column(String, default="")
    detail: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Penjualan(Base):
    __tablename__ = "penjualan"
    __table_args__ = (
        Index("ix_penjualan_customer", "customer"),
        Index("ix_penjualan_date", "date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    customer: Mapped[str] = mapped_column(String, default="PT Indo Hair Corp")
    jenis: Mapped[str] = mapped_column(String, default="")
    kategori: Mapped[str] = mapped_column(String, default="Bahan Baku")
    qty: Mapped[float] = mapped_column(Float, default=0)
    harga_beli: Mapped[float] = mapped_column(Float, default=0)
    margin_pct: Mapped[float] = mapped_column(Float, default=5.0)
    harga_jual: Mapped[float] = mapped_column(Float, default=0)
    total: Mapped[float] = mapped_column(Float, default=0)
    terbayar: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String, default="belum_lunas")
    keterangan: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
