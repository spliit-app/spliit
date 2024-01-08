const { PrismaClient } = require("@prisma/client");
const { categories } = require("./data.js");

 async function load() {
     const prisma = new PrismaClient();

     try {
         await prisma.category.deleteMany();
         console.log("Deleted records in the category table");

         await prisma.$queryRaw`ALTER SEQUENCE "Category_id_seq" RESTART WITH 1`;

         await prisma.category.createMany({
             data: categories,
         });
         console.log("Added category data.");
     } catch (e) {
         console.error(e);
         process.exit(1);      
     } finally {
         await prisma.$disconnect()
     }    
 };

// Call using: npx prisma db seed
load();