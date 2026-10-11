import type { Food } from "./domain/types";
export const gradeLabels: Record<string, string> = {
  a: "Most favorable",
  b: "Favorable",
  c: "Moderate",
  d: "Less favorable",
  e: "Least favorable",
};
export function foodGrade(food: Food) {
  return food.grade && /^[a-e]$/i.test(food.grade)
    ? food.grade.toLowerCase()
    : null;
}
