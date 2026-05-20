import { Select } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

type DropdownSelectValue = number | string;
type DropdownSelectVariant = "light" | "play";

export interface DropdownSelectOption<Value extends DropdownSelectValue> {
  value: Value;
  label: ReactNode;
  triggerLabel?: ReactNode;
  disabled?: boolean;
}

interface DropdownSelectProps<Value extends DropdownSelectValue> {
  value: Value;
  options: ReadonlyArray<DropdownSelectOption<Value>>;
  onChange: (value: Value) => void;
  placeholder?: ReactNode;
  disabled?: boolean;
  variant?: DropdownSelectVariant;
  align?: "center" | "end" | "start";
  sideOffset?: number;
  className?: string;
  triggerClassName?: string;
  valueClassName?: string;
  iconClassName?: string;
  positionerClassName?: string;
  menuClassName?: string;
  listClassName?: string;
  optionClassName?: string;
}

const MENU_VARIANTS: Record<DropdownSelectVariant, string> = {
  light:
    "border-[#d9cdc1] bg-white shadow-[0_20px_48px_rgba(39,46,55,0.14)]",
  play:
    "border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] shadow-[0_20px_48px_rgba(15,23,42,0.2)]",
};

const OPTION_VARIANTS: Record<DropdownSelectVariant, string> = {
  light:
    "text-[#5f6368] data-[highlighted]:bg-[#f7f2eb] data-[highlighted]:text-[#272E37] data-[selected]:bg-[#272E37] data-[selected]:text-white",
  play:
    "text-[color:var(--page-theme-text-primary)] data-[highlighted]:bg-[color:var(--page-theme-surface-secondary)] data-[selected]:bg-[color:var(--page-theme-primary-action)] data-[selected]:text-[color:var(--page-theme-primary-action-text)]",
};

export function DropdownSelect<Value extends DropdownSelectValue>({
  value,
  options,
  onChange,
  placeholder = null,
  disabled = false,
  variant = "light",
  align = "start",
  sideOffset = 8,
  className,
  triggerClassName,
  valueClassName,
  iconClassName,
  positionerClassName,
  menuClassName,
  listClassName,
  optionClassName,
}: DropdownSelectProps<Value>) {
  const selectedOption =
    options.find((option) => Object.is(option.value, value)) ?? null;

  return (
    <div className={cn("min-w-0", className)}>
      <Select.Root<Value>
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue !== null) {
            onChange(nextValue as Value);
          }
        }}
        disabled={disabled}
        modal={false}
      >
        <Select.Trigger
          className={cn(
            "inline-flex w-full min-w-0 items-center justify-between gap-3 transition outline-none disabled:cursor-not-allowed disabled:opacity-60",
            triggerClassName,
          )}
        >
          <Select.Value className={cn("min-w-0 flex-1 truncate text-left", valueClassName)}>
            {() => selectedOption?.triggerLabel ?? selectedOption?.label ?? placeholder}
          </Select.Value>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 opacity-70", iconClassName)}
          />
        </Select.Trigger>

        <Select.Portal>
          <Select.Positioner
            align={align}
            alignItemWithTrigger={false}
            sideOffset={sideOffset}
            className={cn("z-[260]", positionerClassName)}
          >
            <Select.Popup
              className={cn(
                "min-w-[var(--anchor-width)] overflow-hidden rounded-2xl border p-1 outline-none",
                MENU_VARIANTS[variant],
                menuClassName,
              )}
            >
              <Select.List
                className={cn("thin-scrollbar overflow-y-auto", listClassName)}
                style={{ maxHeight: "min(280px, var(--available-height))" }}
              >
                {options.map((option) => (
                  <Select.Item
                    key={String(option.value)}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      "cursor-default select-none rounded-xl px-3 py-2.5 text-left text-sm font-semibold outline-none transition data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
                      OPTION_VARIANTS[variant],
                      optionClassName,
                    )}
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
