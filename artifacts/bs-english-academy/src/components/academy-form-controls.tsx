import { CalendarDays } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import type { Matcher } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { parseLocalDate, sanitizeName, sanitizeNumbers, toLocalDateValue } from '@/lib/input-sanitizers';

type BaseControlProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
};

export function NameInput({
  onValueChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <input
      {...props}
      value={props.value}
      onChange={(event) => onValueChange(sanitizeName(event.target.value))}
      autoComplete={props.autoComplete || 'name'}
    />
  );
}

export function NumericInput({
  maxLength,
  onValueChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'inputMode'> & {
  value: string;
  onValueChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <input
      {...props}
      value={props.value}
      type="text"
      inputMode="numeric"
      maxLength={maxLength}
      onChange={(event) => onValueChange(sanitizeNumbers(event.target.value, maxLength))}
    />
  );
}

type DatePickerFieldProps = BaseControlProps & {
  label: string;
  error?: string;
  maxDate?: Date;
  minDate?: Date;
  testId?: string;
};

export function DatePickerField({
  id,
  label,
  value,
  onValueChange,
  onBlur,
  placeholder = 'Choose a date',
  error,
  maxDate,
  minDate,
  testId,
}: DatePickerFieldProps) {
  const selected = parseLocalDate(value);
  const describedBy = error ? `${id}-error` : undefined;
  const disabledDates: Matcher[] = [];
  if (minDate) disabledDates.push({ before: minDate });
  if (maxDate) disabledDates.push({ after: maxDate });

  return (
    <div>
      <label className="academy-label" htmlFor={id}>{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            variant="outline"
            className={cn('academy-input date-picker-trigger', !selected && 'date-picker-placeholder', error && 'invalid')}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            onBlur={onBlur}
            data-testid={testId}
          >
            <span>{selected ? selected.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : placeholder}</span>
            <CalendarDays size={16} aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected || maxDate || new Date()}
            onSelect={(date) => {
              if (date) onValueChange(toLocalDateValue(date));
            }}
            disabled={disabledDates}
            captionLayout="dropdown"
            fromYear={minDate?.getFullYear() || 1900}
            toYear={maxDate?.getFullYear() || new Date().getFullYear()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && <p className="academy-help" id={describedBy}>{error}</p>}
    </div>
  );
}

type FormSelectProps = BaseControlProps & {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  testId?: string;
  disabled?: boolean;
};

export function FormSelect({
  id,
  label,
  value,
  onValueChange,
  onBlur,
  placeholder = 'Select an option',
  error,
  options,
  testId,
  disabled,
}: FormSelectProps) {
  const describedBy = error ? `${id}-error` : undefined;
  const hasOptions = options && options.length > 0;
  return (
    <div>
      <label className="academy-label" htmlFor={id}>{label}</label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className={cn(
            'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring data-[state=open]:z-10 data-[state=closed]:z-0 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            error && 'invalid',
            disabled && 'disabled',
          )}
          aria-invalid={Boolean(error) || disabled}
          aria-describedby={describedBy}
          onBlur={onBlur}
          data-testid={testId}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {hasOptions ? (
            <>
              <SelectSeparator />
              {options.map((option) => (
                <SelectItem value={option.value} key={option.value}>{option.label}</SelectItem>
              ))}
              <SelectSeparator />
            </>
          ) : (
            <div className="p-2 text-sm text-muted-foreground">
              {disabled
                ? 'Selection disabled'
                : options
                ? 'No options available'
                : placeholder}
            </div>
          )}
        </SelectContent>
      </Select>
      {error && <p className="academy-help" id={describedBy}>{error}</p>}
    </div>
  );
}

type FilterSelectProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  testId?: string;
};

export function FilterSelect({ id, value, onValueChange, placeholder = 'All', options, testId }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id={id}
        className={cn(
          'h-9 min-w-[140px] items-center justify-between whitespace-nowrap rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring data-[state=open]:z-10 [&>span]:line-clamp-1',
        )}
        data-testid={testId}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length > 0 ? (
          <>
            <SelectSeparator />
            {options.map((option) => (
              <SelectItem value={option.value} key={option.value}>{option.label}</SelectItem>
            ))}
            <SelectSeparator />
          </>
        ) : (
          <div className="p-2 text-sm text-muted-foreground">No options</div>
        )}
      </SelectContent>
    </Select>
  );
}