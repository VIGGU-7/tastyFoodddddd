import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Database,
  FlaskConical,
  GitBranch,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { PageHeading, SectionTitle } from "@/components/ui/primitives";
import metrics from "../../../ml/metrics.json";
import { recommendationModel } from "./domain/recommendation-model";

export function ModelTransparency() {
  const grades = ["a", "b", "c", "d", "e"] as const;
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="GOOD INFORMATION. HONEST LIMITS."
        title="Nothing behind the curtain."
        description="Know where your food information comes from, what our model measures, and what it can’t tell you."
        action={
          <span className="soft-badge">
            <FlaskConical size={15} />
            Preliminary model
          </span>
        }
      />
      <section className="model-hero">
        <div>
          <span className="eyebrow">MEASURED, NOT MADE UP</span>
          <h2>
            A model with a score.
            <br />
            <em>And a little perspective.</em>
          </h2>
          <p>
            Our random forest estimates A–E nutrition grades when a product has
            complete inputs but no source grade. Source grades always come
            first.
          </p>
          <span className="model-version">
            <GitBranch size={14} />
            off-2023-70ec4bcc7c7f
          </span>
        </div>
        <div className="model-accuracy">
          <span className="accuracy-ring">
            <strong>
              {(metrics.accuracy * 100).toFixed(0)}
              <small>%</small>
            </strong>
          </span>
          <span>Held-out nutrition-grade accuracy</span>
          <p>
            {metrics.samples.test} test products · not a medical safety score
          </p>
        </div>
      </section>
      <div className="model-stat-grid">
        {[
          {
            value: metrics.macroF1.toFixed(3),
            label: "Macro F1",
            note: "Equal weight across all grades",
          },
          {
            value: `${(metrics.baselineAccuracy * 100).toFixed(1)}%`,
            label: "Majority baseline",
            note: "A simple comparison point",
          },
          {
            value: metrics.samples.total.toLocaleString("en-US"),
            label: "Eligible real products",
            note: "Open Food Facts · 2023 labels",
          },
        ].map((item) => (
          <div className="panel model-stat" key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
            <p>{item.note}</p>
          </div>
        ))}
      </div>
      <section className="model-grid">
        <div className="panel">
          <SectionTitle number="01" title="The evaluation, plainly." />
          <p>
            Brand/category groups stay separate between training, validation,
            and test sets. Model depth was selected on validation; the final
            test set was held out.
          </p>
          <div className="dataset-split">
            <span style={{ flex: metrics.samples.train }}>
              Train<strong>{metrics.samples.train}</strong>
            </span>
            <span style={{ flex: metrics.samples.validation }}>
              Validation<strong>{metrics.samples.validation}</strong>
            </span>
            <span style={{ flex: metrics.samples.test }}>
              Test<strong>{metrics.samples.test}</strong>
            </span>
          </div>
          <div className="table-scroll">
            <table className="metrics-table">
              <caption>Held-out results by nutrition grade</caption>
              <thead>
                <tr>
                  <th scope="col">Grade</th>
                  <th scope="col">Precision</th>
                  <th scope="col">Recall</th>
                  <th scope="col">F1</th>
                  <th scope="col">Products</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => {
                  const row = metrics.perGrade[grade];
                  return (
                    <tr key={grade}>
                      <th scope="row">
                        <span className={`table-grade grade-${grade}`}>
                          {grade.toUpperCase()}
                        </span>
                      </th>
                      <td>{row.precision.toFixed(3)}</td>
                      <td>{row.recall.toFixed(3)}</td>
                      <td>{row["f1-score"].toFixed(3)}</td>
                      <td>{row.support}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="model-limit-note">
            <FlaskConical size={18} />
            <p>
              <strong>A small, biased sample.</strong> These 1,479 products come
              from the beginning of a public export, not a representative global
              sample. Grade B performs poorly on just 11 test examples. Results
              apply to this held-out sample, not every food or population.
            </p>
          </div>
        </div>
        <div className="model-side-panels">
          <section className="panel">
            <span className="panel-icon">
              <Database size={22} />
            </span>
            <h2>Where the data comes from</h2>
            <p>
              Barcode nutrition, ingredients, and source grades come from Open
              Food Facts. Recipe and restaurant entries link to their primary
              sources.
            </p>
            <a
              href="https://world.openfoodfacts.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Open Food Facts <ArrowUpRight size={15} />
            </a>
            <p className="fine-print">
              Database: ODbL 1.0. Product images retain their own licenses. Food
              photography elsewhere is illustrative.
            </p>
          </section>
          <section className="panel">
            <span className="panel-icon">
              <ShieldCheck size={22} />
            </span>
            <h2>What a grade can’t do</h2>
            <p>
              A nutrition grade cannot establish allergy safety, predict blood
              glucose, diagnose a condition, or prescribe a treatment.
            </p>
            <ul className="check-list">
              <li>
                <Check size={15} />
                Known conflicts take priority.
              </li>
              <li>
                <Check size={15} />
                Missing information stays unknown.
              </li>
              <li>
                <Check size={15} />
                Model estimates are labeled.
              </li>
            </ul>
          </section>
        </div>
      </section>
      <section className="panel alternatives-panel">
        <span className="eyebrow">A SEPARATE MODEL FOR YOUR TASTES</span>
        <h2>How your picks and alternatives work</h2>
        <p>
          The recommendation model learns word importance from{" "}
          {recommendationModel.documents} public food descriptions. It compares
          foods with your saved tastes and tried-food ratings, after checking
          recorded restrictions and nutrient limits. Your own scanned products
          can also become candidates. It never changes the nutrition-grade
          model.
        </p>
        <p>
          Alternatives need a similar category or main ingredient, sufficient
          label data, and an explained improvement. Nutrient comparisons use 100
          g quantities. The small catalog means a suitable swap may be
          unavailable. Preference accuracy has not been measured on held-out
          user ratings.
        </p>
        <span className="model-version">
          <GitBranch size={14} />
          {recommendationModel.version}
        </span>
      </section>
      <section className="panel privacy-panel">
        <div>
          <span className="panel-icon">
            <LockKeyhole size={23} />
          </span>
          <h2>Your data belongs in your space.</h2>
          <p>
            Health details are optional. Guest scans don’t create personal
            records. Signed-in profiles, ratings, scans, and glucose readings
            are scoped to your account. You can permanently delete your account
            and its data in preferences.
          </p>
        </div>
        <Link href="/profile" className="button button-secondary">
          Your preferences <ArrowUpRight size={17} />
        </Link>
      </section>
    </div>
  );
}
