import { useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const selectedPeriod = periods.find((p) => p.id === currentPeriodId);
  const selectedLabel =
    currentPeriodId === "all" ? "All sessions" : selectedPeriod?.title ?? "All sessions";

  function handleChange(value: string) {
    navigate({ to: "/admin", search: { period: value } });
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
