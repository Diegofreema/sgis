"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Period = { id: string; title: string };

type Props = {
  periods: Period[];
  currentPeriodId?: string;
};

export function SessionFilterSelect({ periods, currentPeriodId }: Props) {
  const router = useRouter();

  function handleChange(value: string) {
    const url = new URL(window.location.href);
    if (value === "all") {
      url.searchParams.delete("period");
    } else {
      url.searchParams.set("period", value);
    }
    router.push(url.pathname + url.search);
  }

  return (
    <Select value={currentPeriodId ?? "all"} onValueChange={handleChange}>
      <SelectTrigger className="w-60">
        <SelectValue placeholder="All sessions" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All sessions</SelectItem>
        {periods.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
