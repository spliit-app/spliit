/*
  Warnings:

  - Added the required column `categoryId` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "categoryId" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "grouping" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- Insert categories
INSERT INTO "Category" ("id", "grouping", "name") VALUES (0, 'Uncategorized', 'General');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (1, 'Uncategorized', 'Payment');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (2, 'Entertainment', 'Entertainment');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (3, 'Entertainment', 'Games');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (4, 'Entertainment', 'Movies');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (5, 'Entertainment', 'Music');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (6, 'Entertainment', 'Sports');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (7, 'Food and Drink', 'Food and Drink');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (8, 'Food and Drink', 'Dining Out');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (9, 'Food and Drink', 'Groceries');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (10, 'Food and Drink', 'Liquor');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (11, 'Home', 'Home');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (12, 'Home', 'Electronics');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (13, 'Home', 'Furniture');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (14, 'Home', 'Household Supplies');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (15, 'Home', 'Maintenance');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (16, 'Home', 'Mortgage');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (17, 'Home', 'Pets');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (18, 'Home', 'Rent');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (19, 'Home', 'Services');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (20, 'Life', 'Childcare');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (21, 'Life', 'Clothing');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (22, 'Life', 'Education');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (23, 'Life', 'Gifts');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (24, 'Life', 'Insurance');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (25, 'Life', 'Medical Expenses');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (26, 'Life', 'Taxes');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (27, 'Transportation', 'Transportation');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (28, 'Transportation', 'Bicycle');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (29, 'Transportation', 'Bus/Train');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (30, 'Transportation', 'Car');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (31, 'Transportation', 'Gas/Fuel');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (32, 'Transportation', 'Hotel');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (33, 'Transportation', 'Parking');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (34, 'Transportation', 'Plane');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (35, 'Transportation', 'Taxi');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (36, 'Utilities', 'Utilities');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (37, 'Utilities', 'Cleaning');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (38, 'Utilities', 'Electricity');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (39, 'Utilities', 'Heat/Gas');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (40, 'Utilities', 'Trash');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (41, 'Utilities', 'TV/Phone/Internet');
INSERT INTO "Category" ("id", "grouping", "name") VALUES (42, 'Utilities', 'Water');

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
