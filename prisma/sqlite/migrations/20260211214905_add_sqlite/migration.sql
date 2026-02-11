-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "information" TEXT,
    "currency" TEXT NOT NULL DEFAULT '$',
    "currencyCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    CONSTRAINT "Participant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "grouping" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "originalAmount" INTEGER,
    "originalCurrency" TEXT,
    "conversionRate" DECIMAL,
    "paidById" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "isReimbursement" BOOLEAN NOT NULL DEFAULT false,
    "splitMode" TEXT NOT NULL DEFAULT 'EVENLY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recurrenceRule" TEXT DEFAULT 'NONE',
    "recurringExpenseLinkId" TEXT,
    CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "expenseId" TEXT,
    CONSTRAINT "ExpenseDocument_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringExpenseLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "currentFrameExpenseId" TEXT NOT NULL,
    "nextExpenseCreatedAt" DATETIME,
    "nextExpenseDate" DATETIME NOT NULL,
    CONSTRAINT "RecurringExpenseLink_currentFrameExpenseId_fkey" FOREIGN KEY ("currentFrameExpenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpensePaidFor" (
    "expenseId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "shares" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("expenseId", "participantId"),
    CONSTRAINT "ExpensePaidFor_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpensePaidFor_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activityType" TEXT NOT NULL,
    "participantId" TEXT,
    "expenseId" TEXT,
    "data" TEXT,
    CONSTRAINT "Activity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringExpenseLink_currentFrameExpenseId_key" ON "RecurringExpenseLink"("currentFrameExpenseId");

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
INSERT INTO "Category" ("id", "grouping", "name") VALUES (43, 'Life', 'Donation');
