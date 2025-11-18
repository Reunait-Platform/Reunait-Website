import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
// Context to propagate behavior flags to the input component
const PhoneInputContext = React.createContext<{ countryCallingCodeEditable: boolean }>({ countryCallingCodeEditable: true });


type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void;
    autoPrefixDialCode?: boolean;
    countryCallingCodeEditable?: boolean;
  };

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
  React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
    (
      {
        className,
        onChange,
        value,
        autoPrefixDialCode = true,
        countryCallingCodeEditable = false,
        defaultCountry = "IN",
        onCountryChange: userOnCountryChange,
        ...props
      },
      ref,
    ) => {
      return (
        <PhoneInputContext.Provider value={{ countryCallingCodeEditable }}>
          <RPNInput.default
            ref={ref}
            className={cn("flex", className)}
            flagComponent={FlagComponent}
            countrySelectComponent={CountrySelect}
            inputComponent={InputComponent}
            smartCaret={true}
            value={value || undefined}
            defaultCountry={defaultCountry as RPNInput.Country}
            international
            countryCallingCodeEditable={countryCallingCodeEditable}
            onCountryChange={(country) => {
              userOnCountryChange?.(country as RPNInput.Country);
              if (autoPrefixDialCode && onChange && country) {
                const code = `+${RPNInput.getCountryCallingCode(country as RPNInput.Country)}`;
                const current = (value || "") as string;
                if (!current || !current.startsWith("+")) {
                  onChange(code as RPNInput.Value);
                }
              }
            }}
            /**
             * Handles the onChange event.
             * Coerce undefined to empty string for controlled input.
             */
            onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
            {...props}
          />
        </PhoneInputContext.Provider>
      );
    },
  );
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, onKeyDown, onBeforeInput, onPaste, value, ...props }, ref) => {
  const { countryCallingCodeEditable } = React.useContext(PhoneInputContext);

  // Determine the protected prefix length (e.g., "+91")
  const getPrefixLength = (): number => {
    const s = typeof value === "string" ? value : "";
    const m = s.match(/^\+\d+/);
    return m ? m[0].length : 0;
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (countryCallingCodeEditable) return;
    const input = e.currentTarget;
    const prefixLen = getPrefixLength();
    // Capture selection to restore accurately after library processing
    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? selStart;
    // Block typing/editing inside protected prefix
    const isNavKey = ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","Tab"].includes(e.key);
    if (isNavKey) return;
    // Prevent Backspace/Delete in prefix region
    if (
      (e.key === "Backspace" && selStart <= prefixLen) ||
      (e.key === "Delete" && selStart < prefixLen) ||
      // If selection overlaps prefix, prevent deleting prefix
      (selStart < prefixLen && selEnd > selStart)
    ) {
      e.preventDefault();
      // Move caret to immediately after prefix
      input.setSelectionRange(prefixLen, prefixLen);
      return;
    }
    // Block any character insertion inside prefix
    if ((selStart < prefixLen || (selStart < prefixLen && selEnd > selStart)) && e.key.length === 1) {
      e.preventDefault();
      // Redirect insertion to immediately after prefix
      const start = prefixLen;
      input.setSelectionRange(start, start);
      // Use modern API to insert text and move caret
      try {
        input.setRangeText(e.key, start, start, 'end');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // Keep caret after the inserted character
        const newPos = start + e.key.length;
        requestAnimationFrame(() => input.setSelectionRange(newPos, newPos));
      } catch {
        document.execCommand('insertText', false, e.key);
      }
      return;
    }
  };

  const handleFocus: React.FocusEventHandler<HTMLInputElement> = (e) => {
    if (countryCallingCodeEditable) return;
    const input = e.currentTarget;
    const prefixLen = getPrefixLength();
    // Place caret at end of current value, but never before the prefix
    setTimeout(() => {
      const currentValue = typeof value === "string" ? value : input.value || "";
      const desired = Math.max(prefixLen, currentValue.length);
      input.setSelectionRange(desired, desired);
    }, 0);
  };

  const handleBeforeInput: React.FormEventHandler<HTMLInputElement> = (e) => {
    // onBeforeInput expects InputEvent but we receive FormEvent
    // Type assertion is safe here as both events have compatible properties
    if (onBeforeInput) {
      (onBeforeInput as (e: React.FormEvent<HTMLInputElement>) => void)(e);
    }
    if (e.defaultPrevented) return;
    if (countryCallingCodeEditable) return;
    const input = e.currentTarget as HTMLInputElement;
    const prefixLen = getPrefixLength();
    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? selStart;
    if (selStart < prefixLen || (selStart < prefixLen && selEnd > selStart)) {
      e.preventDefault();
      const data = (e.nativeEvent as { data?: string })?.data ?? (e as { data?: string }).data ?? '';
      const start = prefixLen;
      input.setSelectionRange(start, start);
      try {
        input.setRangeText(data, start, start, 'end');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const newPos = start + String(data).length;
        requestAnimationFrame(() => input.setSelectionRange(newPos, newPos));
      } catch {
        document.execCommand('insertText', false, data);
      }
    }
  };

  const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    onPaste?.(e);
    if (e.defaultPrevented) return;
    if (countryCallingCodeEditable) return;
    const input = e.currentTarget;
    const prefixLen = getPrefixLength();
    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? selStart;
    if (selStart < prefixLen || (selStart < prefixLen && selEnd > selStart)) {
      e.preventDefault();
      // Redirect paste immediately after prefix
      const text = e.clipboardData.getData('text');
      const start = prefixLen;
      input.setSelectionRange(start, start);
      try {
        input.setRangeText(text, start, start, 'end');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const newPos = start + text.length;
        requestAnimationFrame(() => input.setSelectionRange(newPos, newPos));
      } catch {
        document.execCommand('insertText', false, text);
      }
    }
  };

  const handleClick: React.MouseEventHandler<HTMLInputElement> = (e) => {
    if (countryCallingCodeEditable) return;
    const input = e.currentTarget;
    const prefixLen = getPrefixLength();
    const selStart = input.selectionStart ?? 0;
    if (selStart < prefixLen) {
      // Push caret to after the prefix for any clicks inside prefix
      input.setSelectionRange(prefixLen, prefixLen);
    }
  };

  return (
    <Input
      className={cn("rounded-e-lg rounded-s-none h-10", className)}
      {...props}
      value={value ?? ""}
      onKeyDown={handleKeyDown}
      onBeforeInput={handleBeforeInput}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onClick={handleClick}
      ref={ref}
    />
  );
});
InputComponent.displayName = "InputComponent";

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) => {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover
      open={isOpen}
      modal
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setSearchValue("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="flex gap-1 rounded-e-none rounded-s-lg border-r-0 px-3 focus:z-10 h-10"
          disabled={disabled}
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry}
          />
          <ChevronsUpDown
            className={cn(
              "-mr-2 size-4 opacity-50",
              disabled ? "hidden" : "opacity-100",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  const viewportElement = scrollAreaRef.current.querySelector(
                    "[data-radix-scroll-area-viewport]",
                  );
                  if (viewportElement) {
                    viewportElement.scrollTop = 0;
                  }
                }
              }, 0);
            }}
            placeholder="Search country..."
          />
          <CommandList>
            <ScrollArea ref={scrollAreaRef} className="h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.map(({ value, label }) =>
                  value ? (
                    <CountrySelectOption
                      key={value}
                      country={value}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                      onSelectComplete={() => setIsOpen(false)}
                    />
                  ) : null,
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
  onSelectComplete: () => void;
}

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}: CountrySelectOptionProps) => {
  const handleSelect = () => {
    onChange(country);
    onSelectComplete();
  };

  return (
    <CommandItem className="gap-2" onSelect={handleSelect}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-sm text-foreground/50">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
      <CheckIcon
        className={`ml-auto size-4 ${country === selectedCountry ? "opacity-100" : "opacity-0"}`}
      />
    </CommandItem>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};

export { PhoneInput };
