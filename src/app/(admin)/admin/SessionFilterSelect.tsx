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
  const selectedPeriod = periods.find((period) => period.id === currentPeriodId);
  const selectedLabel =
    currentPeriodId === "all"
      ? "All sessions"
      : selectedPeriod?.title ?? "All sessions";

  function handleChange(value: string) {
    const url = new URL(window.location.href);
    if (value === "all") {
      url.searchParams.set("period", "all");
    } else {
      url.searchParams.set("period", value);
    }
    url.searchParams.delete("page");
    router.push(url.pathname + url.search);
  }

  return (
    <Select value={currentPeriodId ?? "all"} onValueChange={handleChange}>
      <SelectTrigger className="w-60">
        <SelectValue>{selectedLabel}</SelectValue>
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
