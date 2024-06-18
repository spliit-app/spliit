-- CreateTable
CREATE TABLE "Point" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Point_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Point" ADD CONSTRAINT "Point_id_fkey" FOREIGN KEY ("id") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
