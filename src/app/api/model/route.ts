import { artifact } from "@/features/nutrition/domain/model";
import { json } from "@/server/http/response";
import { recommendationModel } from "@/features/nutrition/domain/recommendation-model";
export async function GET() {
  return json({
    status: artifact.status,
    version: artifact.version,
    metrics: artifact.metrics,
    recommendations: {
      version: recommendationModel.version,
      algorithm: recommendationModel.algorithm,
      documents: recommendationModel.documents,
      evaluation: recommendationModel.evaluation,
    },
  });
}
