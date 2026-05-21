import React, { useEffect, useState } from "react";
import { cn } from "../../utils/cn";

const DateInput = React.forwardRef(({
    className,
    label,
    description,
    error,
    required = false,
    id,
    value,
    onChange,
    ...props
}, ref) => {
    const inputId = id || `date-${Math.random()?.toString(36)?.substr(2, 9)}`;
    const [displayValue, setDisplayValue] = useState('');
    const calendarRef = React.useRef(null);

    // Format YYYY-MM-DD to DD-MM-YYYY for display
    function formatForDisplay(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        if (day && month && year) {
            return `${day}-${month}-${year}`;
        }
        return dateStr;
    }

    // When parent value changes, update display
    useEffect(() => {
        setDisplayValue(formatForDisplay(value));
    }, [value]);

    // Auto-format input with hyphens as user types
    // e.g., "26092005" becomes "26-09-2005"
    function autoFormatInput(input) {
        // Remove all non-digits
        const digitsOnly = input.replace(/\D/g, '');
        
        if (digitsOnly.length === 0) return '';
        if (digitsOnly.length <= 2) return digitsOnly;
        if (digitsOnly.length <= 4) return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2)}`;
        return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 4)}-${digitsOnly.slice(4, 8)}`;
    }

    // Parse DD-MM-YYYY to YYYY-MM-DD
    function parseDate(input) {
        if (!input) return '';
        
        // Remove all non-digits
        const digitsOnly = input.replace(/\D/g, '');
        
        if (digitsOnly.length !== 8) return '';
        
        let day = digitsOnly.slice(0, 2);
        let month = digitsOnly.slice(2, 4);
        let year = digitsOnly.slice(4, 8);
        
        // Validate
        const d = parseInt(day);
        const m = parseInt(month);
        const y = parseInt(year);
        
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
            return `${year}-${month}-${day}`;
        }
        return '';
    }

    const handleChange = (e) => {
        const input = e.target.value;
        // Auto-format with hyphens
        const formatted = autoFormatInput(input);
        setDisplayValue(formatted);
        
        // Parse and validate
        const parsed = parseDate(formatted);
        if (parsed) {
            // Update parent with valid date
            onChange?.({ target: { value: parsed } });
        } else if (formatted === '') {
            // Allow clearing
            onChange?.({ target: { value: '' } });
        }
    };

    const handleCalendarChange = (e) => {
        const calendarValue = e.target.value;
        if (calendarValue) {
            setDisplayValue(formatForDisplay(calendarValue));
            onChange?.({ target: { value: calendarValue } });
        }
    };

    const openCalendar = () => {
        if (calendarRef.current) {
            // Try showPicker() first (newer API), fallback to click()
            if (calendarRef.current.showPicker) {
                try {
                    calendarRef.current.showPicker();
                } catch (e) {
                    console.error('showPicker failed:', e);
                    calendarRef.current.click();
                }
            } else {
                calendarRef.current.click();
            }
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <label
                    htmlFor={inputId}
                    className={cn(
                        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                        error ? "text-destructive" : "text-foreground"
                    )}
                >
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </label>
            )}

            <div className="relative flex items-center">
                <input
                    ref={ref}
                    id={inputId}
                    type="text"
                    placeholder="dd-mm-yyyy"
                    value={displayValue}
                    onChange={handleChange}
                    maxLength="10"
                    className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10",
                        error && "border-destructive focus-visible:ring-destructive",
                        className
                    )}
                    {...props}
                />

                {/* Hidden calendar input - use sr-only instead of hidden so it's clickable */}
                <input
                    ref={calendarRef}
                    type="date"
                    value={value}
                    onChange={handleCalendarChange}
                    className="sr-only"
                    aria-hidden="true"
                />

                {/* Calendar button */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openCalendar();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                    tabIndex="-1"
                    aria-label="Open calendar picker"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                </button>
            </div>

            {description && !error && (
                <p className="text-sm text-muted-foreground">
                    {description}
                </p>
            )}
            {error && (
                <p className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
});

DateInput.displayName = "DateInput";

export default DateInput;
