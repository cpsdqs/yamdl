import { h, Component } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import Button from '../button';
import './style.less';

/**
 * The month dropdown at the top of some date picker versions.
 *
 * # Props
 * - year/onSetYear: year number
 * - month: month index
 * - expanded/onExpandedChange: bool
 * - onPrev: callback for when the previous month button is pressed
 * - onNext: callback for when the next month button is pressed
 * - months: an array with all month names
 * - size: size class
 * - onToday: enables the today button. callback for when the today button is pressed
 * - isToday: will dim the today button
 */
export default function MonthDropdown ({
    year,
    onSetYear,
    month,
    expanded,
    onExpandedChange,
    onPrev,
    onNext,
    months,
    size,
    isToday,
    onToday,
}) {
    return (
        <div class={`ink-date-month-dropdown p-${size}` + (expanded ? ' is-expanded' : '')}>
            <div class="p-dropdown-inner">
                <span class="p-dropdown-label">
                    {months[month]}
                    {' '}
                    <YearInput value={year} onChange={onSetYear} />
                </span>
                <Button
                    class="p-dropdown-expand-button"
                    icon
                    onClick={e => {
                        e.preventDefault();
                        onExpandedChange(!expanded);
                    }}>
                    <svg width="24" height="24">
                        <path d="M7 10h10l-5 5z" />
                    </svg>
                </Button>
            </div>
            <div class="p-month-nav">
                <Button
                    class="p-month-nav-button"
                    icon
                    onClick={e => {
                        e.preventDefault();
                        onPrev && onPrev();
                    }}>
                    <svg width="24" height="24">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                </Button>
                {onToday ? (
                    <Button
                        class={'p-month-nav-button' + (isToday ? ' p-is-today' : '')}
                        icon
                        onClick={e => {
                            e.preventDefault();
                            onToday();
                        }}>
                        <svg width="24" height="24">
                            <circle cx="12" cy="12" r="2" />
                        </svg>
                    </Button>
                ) : <span class="p-month-nav-spacer" />}
                <Button
                    class="p-month-nav-button"
                    icon
                    onClick={e => {
                        e.preventDefault();
                        onNext && onNext();
                    }}>
                    <svg width="24" height="24">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                </Button>
            </div>
        </div>
    );
}

function YearInput ({ value, onChange }) {
    const [editing, setEditing] = useState(false);
    const [editingValue, setEditingValue] = useState('');
    const input = useRef(null);

    useEffect(() => {
        input.current?.focus();
        requestAnimationFrame(() => {
            input.current?.focus();
        });
    }, [editing, input.current]);

    return (
        <span class={'p-year' + (editing ? ' is-editing' : '')} onClick={() => {
            if (!editing) {
                setEditing(true);
                setEditingValue(value.toString());
            }
        }}>
            {editing ? (
                <input
                    ref={input}
                    type="number"
                    min="1900"
                    step="1"
                    class="p-year-input"
                    value={editingValue}
                    onKeyDown={e => {
                        if (e.key === 'Escape') {
                            setEditing(false);
                        } else if (e.key === 'Enter') {
                            e.target.blur();
                        }
                    }}
                    onChange={e => {
                        setEditingValue(e.target.value);
                        const value = parseInt(e.target.value, 10);
                        if (value >= 1900) onChange(value);
                    }}
                    onBlur={e => {
                        const value = parseInt(editingValue, 10);
                        if (value >= 1900) onChange(value);
                        setEditing(false);
                    }} />
            ) : value.toString()}
        </span>
    );
}
