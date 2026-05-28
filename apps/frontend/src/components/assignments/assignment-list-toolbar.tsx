"use client";

import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useAssignmentsStore } from "@/store/assignments";

export function AssignmentListToolbar() {
  const search = useAssignmentsStore((s) => s.search);
  const setSearch = useAssignmentsStore((s) => s.setSearch);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="ghost" size="sm" className="self-start text-muted-foreground">
        <Filter data-icon="inline-start" />
        Filter By
      </Button>

      <InputGroup className="sm:max-w-xs">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search Assignment"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </InputGroup>
    </div>
  );
}
