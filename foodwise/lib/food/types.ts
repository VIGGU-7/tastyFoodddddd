export type Profile = {
  name: string;
  allergies: string[];
  diet: string;
  conditions: string[];
  cuisines: string[];
  favorites: string[];
  dislikes: string[];
  goal: string;
  limits: {
    sugar?: number;
    carbs?: number;
    sodium?: number;
    saturatedFat?: number;
  };
};
export type Food = {
  id: string;
  name: string;
  kind: "meal" | "product" | "restaurant";
  category: string;
  cuisine: string;
  ingredients: string[];
  allergens: string[];
  ingredientsComplete: boolean;
  diet: string[];
  dietVerified?: boolean;
  serving: string;
  grams?: number;
  nutrients: {
    energy?: number;
    sugar?: number;
    carbs?: number;
    sodium?: number;
    saturatedFat?: number;
    protein?: number;
    fiber?: number;
  };
  grade?: string;
  gradeSource?: "source" | "model";
  modelVersion?: string;
  image?: string;
  source: string;
  sourceUrl: string;
  city?: string;
  restaurant?: string;
  estimated: boolean;
  verified?: string;
};
export type Rating = {
  foodId: string;
  rating: number;
  tried: boolean;
  createdAt: number;
};
export type Glucose = {
  value: number;
  unit: "mg/dL" | "mmol/L";
  timing: "fasting" | "before-meal" | "after-meal";
  timestamp: string;
};
export type Assessment = {
  verdict: "Good fit" | "Limit" | "Avoid" | "Not enough information";
  reason: string;
  details: string[];
  personalized: boolean;
  modelVersion?: string;
};
export const emptyProfile: Profile = {
  name: "",
  allergies: [],
  diet: "Any",
  conditions: [],
  cuisines: [],
  favorites: [],
  dislikes: [],
  goal: "Balanced eating",
  limits: {},
};
