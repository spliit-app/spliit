-- CreateTable
CREATE TABLE `Group` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT '$',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Participant` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grouping` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(191) NOT NULL,
    `expenseDate` DATE NOT NULL DEFAULT CURRENT_DATE,
    `title` VARCHAR(191) NOT NULL,
    `categoryId` INTEGER NOT NULL DEFAULT 0,
    `amount` INTEGER NOT NULL,
    `paidById` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `isReimbursement` BOOLEAN NOT NULL DEFAULT false,
    `splitMode` ENUM('EVENLY', 'BY_SHARES', 'BY_PERCENTAGE', 'BY_AMOUNT') NOT NULL DEFAULT 'EVENLY',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpenseDocument` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `expenseId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpensePaidFor` (
    `expenseId` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `shares` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`expenseId`, `participantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Participant` ADD CONSTRAINT `Participant_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_paidById_fkey` FOREIGN KEY (`paidById`) REFERENCES `Participant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseDocument` ADD CONSTRAINT `ExpenseDocument_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpensePaidFor` ADD CONSTRAINT `ExpensePaidFor_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpensePaidFor` ADD CONSTRAINT `ExpensePaidFor_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `Participant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert categories
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Uncategorized', 'General');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Uncategorized', 'Payment');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Entertainment', 'Entertainment');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Entertainment', 'Games');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Entertainment', 'Movies');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Entertainment', 'Music');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Entertainment', 'Sports');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Food and Drink', 'Food and Drink');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Food and Drink', 'Dining Out');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Food and Drink', 'Groceries');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Food and Drink', 'Liquor');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Home', 'Home');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Home', 'Electronics');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Home', 'Furniture');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Home', 'Household Supplies');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Home', 'Maintenance');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Home', 'Mortgage');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Home', 'Pets');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Home', 'Rent');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Home', 'Services');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Life', 'Childcare');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Life', 'Clothing');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Life', 'Education');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Life', 'Gifts');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Life', 'Insurance');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Life', 'Medical Expenses');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Life', 'Taxes');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Transportation', 'Transportation');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Transportation', 'Bicycle');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Transportation', 'Bus/Train');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Transportation', 'Car');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Transportation', 'Gas/Fuel');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Transportation', 'Hotel');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Transportation', 'Parking');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Transportation', 'Plane');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Transportation', 'Taxi');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Utilities', 'Utilities');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Utilities', 'Cleaning');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Utilities', 'Electricity');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Utilities', 'Heat/Gas');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Utilities', 'Trash');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Utilities', 'TV/Phone/Internet');
INSERT INTO `Category` (`grouping`, `name`) VALUES ('Utilities', 'Water');
