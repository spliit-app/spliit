'use server'

import { getCategories } from "@/lib/api";

export async function extractCategoryFromTitleStatic(description: string) {

    const cleanedDescription = description.toLowerCase().trim()
    var guessedCategoryId = 0;
    if (
        cleanedDescription.includes("restaurant") ||
        cleanedDescription.includes("cafe") ||
        cleanedDescription.includes("bar")) {
        guessedCategoryId = 8
    } else if (
        cleanedDescription.includes("aldi") ||
        cleanedDescription.includes("lidl") ||
        cleanedDescription.includes("edeka") ||
        cleanedDescription.includes("kaufland") ||
        cleanedDescription.includes("netto") ||
        cleanedDescription.includes("penny") ||
        cleanedDescription.includes("baecker") ||
        cleanedDescription.includes("baeckerei") ||
        cleanedDescription.includes("bäcker") ||
        cleanedDescription.includes("bäckerei") ||
        cleanedDescription.includes("nobis") ||
        cleanedDescription.includes("moss") ||
        cleanedDescription.includes("büsch") ||
        cleanedDescription.includes("buesch") ||
        cleanedDescription.includes("bäckerei")
    ) {
        guessedCategoryId = 9
    } else if(
        cleanedDescription.includes("baur") ||
        cleanedDescription.includes("intersport") ||
        cleanedDescription.includes("schuhe") ||
        cleanedDescription.includes("lowa") ||
        cleanedDescription.includes("sketchers") 
    ) {
        guessedCategoryId = 21
    } else if(
        cleanedDescription.includes("zahnreinigung") ||
        cleanedDescription.includes("apotheke") ||
        cleanedDescription.includes("arzt") ||
        cleanedDescription.includes("vorsorge") 
    ) {
        guessedCategoryId = 25
    } else if(
        cleanedDescription.includes("geschenk")
    ) {
        guessedCategoryId = 23
    } else if(
        cleanedDescription.includes("vergnügen a")
    ) {
        guessedCategoryId = 43
    } else if(
        cleanedDescription.includes("vergnügen m")
    ) {
        guessedCategoryId = 44
    } else if(
        cleanedDescription.includes("bus") || 
        cleanedDescription.includes("train") || 
        cleanedDescription.includes("eezy")
    ) {
        guessedCategoryId = 27
    } else if(
        cleanedDescription.includes("tanken") || 
        cleanedDescription.includes("werkstatt") || 
        cleanedDescription.includes("parken")
    ) {
        guessedCategoryId = 30
    } else if(
        cleanedDescription.includes("hotel") || 
        cleanedDescription.includes("airbnb") || 
        cleanedDescription.includes("hostel") || 
        cleanedDescription.includes("pension")
    ) {
        guessedCategoryId = 32
    }
    return { categoryId: guessedCategoryId }
}
