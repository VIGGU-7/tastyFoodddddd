import type {
  Assessment,
  Food,
  Glucose,
  Profile,
  Rating,
} from "@/features/nutrition/domain/types";
export type User = { id: string; name: string; email: string };
export type RecordPayload = {
  profile: Profile;
  rating: Rating;
  glucose: Glucose;
  scan: { food: Food; assessment: Assessment };
  recommendation: { foodId: string; name: string };
};
export type SavedRecord<K extends keyof RecordPayload = keyof RecordPayload> =
  K extends keyof RecordPayload
    ? { id: string; kind: K; payload: RecordPayload[K]; createdAt: number }
    : never;
export type FoodResult = {
  food: Food;
  assessment: Assessment;
  alternatives?: Recommendation[];
};
export type Recommendation = {
  food: Food;
  assessment: Assessment;
  /** Internal ordering value; independent of the food's A–E nutrition grade. */
  score: number;
  reasons: string[];
  recommendationModelVersion: string;
};
