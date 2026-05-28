import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface Props {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: Props) {
  return (
    <Empty className="mx-auto max-w-xl py-16 sm:py-24">
      <EmptyHeader>
        <EmptyMedia className="bg-transparent">
          <Image
            src="/Illustrations.png"
            alt=""
            width={200}
            height={200}
            className="h-40 w-auto"
            aria-hidden
          />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          {description ??
            "This module is on the roadmap. In the meantime, you can keep building your assignments."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          size="lg"
          nativeButton={false}
          className="h-11 gap-2 rounded-full px-5"
          render={<Link href="/assignments" />}
        >
          Go to Assignments
        </Button>
      </EmptyContent>
    </Empty>
  );
}
