import { Check, Info, ScanLine, ShieldCheck } from "lucide-react";
import type { Assessment, Food } from "./domain/types";
import { foodGrade, gradeLabels } from "./score";
export function GradeScale({ grade }: { grade?: string | null }) {
  return (
    <div
      className="grade-scale"
      aria-label={
        grade
          ? `Nutrition grade ${grade.toUpperCase()}, on an A to E scale`
          : "Nutrition grade unavailable"
      }
    >
      {["a", "b", "c", "d", "e"].map((g) => (
        <span
          key={g}
          className={`grade-cell grade-${g} ${grade === g ? "selected" : ""}`}
        >
          {g.toUpperCase()}
          {grade === g && <span className="grade-marker" />}
        </span>
      ))}
    </div>
  );
}
export function ScoreCard({
  food,
  assessment,
  compact = false,
}: {
  food: Food;
  assessment: Assessment;
  compact?: boolean;
}) {
  const grade = foodGrade(food);
  return (
    <section
      className={`score-card ${compact ? "compact" : ""}`}
      aria-label="Food nutrition score"
    >
      <div className="score-topline">
        <span className="eyebrow">NUTRITION SCORE</span>
        <span className="source-pill">
          {grade
            ? food.gradeSource === "model"
              ? "Model estimate"
              : "Source grade"
            : "Not available"}
        </span>
      </div>
      <div className="score-main">
        <div className={`score-orb grade-${grade || "unknown"}`}>
          <strong>{grade?.toUpperCase() || "?"}</strong>
          <span>{grade ? "GRADE" : "UNKNOWN"}</span>
        </div>
        <div>
          <h2>{grade ? gradeLabels[grade] : "Let’s be honest."}</h2>
          <p>
            {grade
              ? "A clearer view of this food’s nutritional quality."
              : "There isn’t enough data to give this food a nutrition grade."}
          </p>
        </div>
      </div>
      <GradeScale grade={grade} />
      <div
        className={`verdict verdict-${assessment.verdict === "Avoid" ? "avoid" : assessment.verdict === "Limit" ? "limit" : assessment.verdict === "Good fit" ? "good" : "unknown"}`}
      >
        <span>
          {assessment.verdict === "Good fit" ? (
            <Check size={19} />
          ) : (
            <Info size={19} />
          )}
        </span>
        <div>
          <strong>{assessment.verdict}</strong>
          <p>{assessment.reason}</p>
        </div>
      </div>
      <div className="score-footnote">
        <ShieldCheck size={15} />
        <span>
          {assessment.personalized
            ? "Checked against your saved preferences."
            : "General nutrition information. Sign in for personal checks."}
        </span>
      </div>
      {!compact && (
        <p className="fine-print">
          Nutrition quality does not establish allergy or medical safety. Check
          the physical label for current ingredients.
        </p>
      )}
    </section>
  );
}
export function ScanPreview() {
  return (
    <div className="scan-preview">
      <div className="mini-scan-lines">
        <ScanLine size={23} />
      </div>
      <div>
        <strong>Every label has a story.</strong>
        <span>Scan a barcode to see its grade and the details behind it.</span>
      </div>
    </div>
  );
}
