import { Compass } from "lucide-react";
import { ActionLink, EmptyState } from "@/components/ui/primitives";
export default function NotFound() {
  return (
    <EmptyState
      icon={<Compass />}
      title="A little off the menu."
      description="We couldn’t find this page. Let’s get you back to familiar ground."
      action={<ActionLink href="/">Back to overview</ActionLink>}
    />
  );
}
