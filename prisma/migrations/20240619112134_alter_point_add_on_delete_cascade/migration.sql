-- DropForeignKey
ALTER TABLE "Point" DROP CONSTRAINT "Point_id_fkey";

-- AddForeignKey
ALTER TABLE "Point" ADD CONSTRAINT "Point_id_fkey" FOREIGN KEY ("id") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
