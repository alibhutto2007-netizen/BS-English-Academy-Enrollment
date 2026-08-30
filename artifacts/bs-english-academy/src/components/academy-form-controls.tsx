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
}: FormSelectProps) {
  const describedBy = error ? `${id}-error` : undefined;
  return (
    <div>
      <label className="academy-label" htmlFor={id}>{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          className={cn('academy-input form-select-trigger', error && 'invalid')}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onBlur={onBlur}
          data-testid={testId}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem value={option.value} key={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="academy-help" id={describedBy}>{error}</p>}
    </div>
  );
}