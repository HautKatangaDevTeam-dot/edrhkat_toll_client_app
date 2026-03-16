import { Input } from "@/components/ui/input";

type DateFilterFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function DateFilterField({
  value,
  onChange,
  className,
}: DateFilterFieldProps) {
  return (
    <Input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`date-field h-10 ${className ?? ""}`.trim()}
    />
  );
}
