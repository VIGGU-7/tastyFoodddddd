import { artifact } from "@/features/nutrition/domain/model";
import { json } from "@/server/http/response";
export async function GET() {
  return json({
    status: artifact.status,
    version: artifact.version,
    metrics: artifact.metrics,
  });
}
