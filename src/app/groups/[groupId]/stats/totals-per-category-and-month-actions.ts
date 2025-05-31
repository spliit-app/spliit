'use server'

import { getGroupExpensesForTimespand } from "@/lib/api";

export async function getTotalsPerCategoryAndMonth(groupId: string, currentDate: Date) {
  'use server'
  const end = currentDate;
  // subtract one month from the start
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return getGroupExpensesForTimespand(groupId, start, end);
}