"use client";
import { RotateCcw } from "lucide-react";
import { Button, EmptyState } from "@/components/ui/primitives";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      icon={<RotateCcw />}
      title="Let’s give that another try."
      description="This page couldn’t load. Your saved preferences are still yours."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
