import artifactJson from "./model-artifact.json";
type Tree = {
  left: number[];
  right: number[];
  feature: number[];
  threshold: number[];
  probabilities: number[][];
};
type Artifact = {
  status: string;
  version: string | null;
  metrics: Record<string, unknown> | null;
  classes: string[];
  features: string[];
  categories: string[];
  trees: Tree[];
  message?: string;
};
export const artifact = artifactJson as Artifact;
export function predictGrade(
  nutrients: Record<string, unknown>,
  category: string,
): { grade: string; version: string } | null {
  if (
    artifact.status !== "trained" ||
    !artifact.version ||
    !artifact.trees.length
  )
    return null;
  const values = artifact.features.map((f) => nutrients[f]);
  if (values.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0))
    return null;
  const vector = [
    ...(values as number[]),
    ...artifact.categories.map((c) => (c === category ? 1 : 0)),
  ];
  const probability = artifact.classes.map(() => 0);
  for (const tree of artifact.trees) {
    let node = 0;
    while (tree.left[node] !== -1) {
      node =
        vector[tree.feature[node]] <= tree.threshold[node]
          ? tree.left[node]
          : tree.right[node];
    }
    tree.probabilities[node].forEach(
      (p, i) => (probability[i] += p / artifact.trees.length),
    );
  }
  const idx = probability.indexOf(Math.max(...probability));
  return { grade: artifact.classes[idx], version: artifact.version };
}
