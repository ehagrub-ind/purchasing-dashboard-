-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "wilayah" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "wilayah" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "kategori" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "wilayah" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kas" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "wilayah" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "masuk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keluar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operasional" (
    "id" SERIAL NOT NULL,
    "wilayah" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operasional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fees" (
    "id" SERIAL NOT NULL,
    "partai" INTEGER NOT NULL,
    "wilayah" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "purchases_wilayah_idx" ON "purchases"("wilayah");

-- CreateIndex
CREATE INDEX "purchases_kategori_idx" ON "purchases"("kategori");

-- CreateIndex
CREATE INDEX "purchases_supplier_id_idx" ON "purchases"("supplier_id");

-- CreateIndex
CREATE INDEX "purchases_date_idx" ON "purchases"("date");

-- CreateIndex
CREATE INDEX "payments_supplier_id_idx" ON "payments"("supplier_id");

-- CreateIndex
CREATE INDEX "payments_type_idx" ON "payments"("type");

-- CreateIndex
CREATE INDEX "payments_date_idx" ON "payments"("date");

-- CreateIndex
CREATE INDEX "kas_wilayah_idx" ON "kas"("wilayah");

-- CreateIndex
CREATE INDEX "operasional_wilayah_idx" ON "operasional"("wilayah");

-- CreateIndex
CREATE INDEX "fees_partai_idx" ON "fees"("partai");

-- CreateIndex
CREATE INDEX "fees_wilayah_idx" ON "fees"("wilayah");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
