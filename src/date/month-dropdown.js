import { h, Component } from 'preact';
import Button from '../button';
import './style';

/// The month dropdown at the top of some date picker versions.
///
/// # Props
/// - year: year number
/// - month: month index
/// - expanded/onExpandedChange: bool
/// - onPrev: callback for when the previous month button is pressed
/// - onNext: callback for when the next month button is pressed
/// - months: an array with all month names
/// - size: size class
export default class MonthDropdown extends Component {
    render ({
        year,
        month,
        expanded,
        onExpandedChange,
        onPrev,
        onNext,
        months,
        size,
    }) {
        const dropdownLabel = `${months[month]} ${year}`;

        return (
            <div class={`ink-date-month-dropdown p-${size}` + (expanded ? ' is-expanded' : '')}>
                <div class="p-dropdown-inner">
                    <span class="p-dropdown-label">
                        {dropdownLabel}
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
                        class="p-month-nav-button p-prev-month-button"
                        icon
                        onClick={e => {
                            e.preventDefault();
                            onPrev && onPrev();
                        }}>
                        <svg width="24" height="24">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                        </svg>
                    </Button>
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
}
