import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function AssignmentsEmptyState() {
  return (
    <Empty className="mx-auto max-w-xl py-16 sm:py-24">
      <EmptyHeader>
        <EmptyMedia className="bg-transparent">
          <Image
            src="/Illustrations.png"
            alt="No assignments illustration"
            width={224}
            height={224}
            priority
            className="h-44 w-auto sm:h-56"
          />
        </EmptyMedia>
        <EmptyTitle>No assignments yet</EmptyTitle>
        <EmptyDescription>
          Create your first assignment to start collecting and grading student
          submissions. You can set up rubrics, define marking criteria, and let
          AI assist with grading.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          size="lg"
          nativeButton={false}
          className="h-11 gap-2 rounded-full px-5"
          render={<Link href="/assignments/new" />}
        >
          <Plus data-icon="inline-start" />
          Create Your First Assignment
        </Button>
      </EmptyContent>
    </Empty>
  );
}
