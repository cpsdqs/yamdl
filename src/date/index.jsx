import { h, Component } from 'preact';
import SmallPicker from './small-picker';

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const WEEKDAYS = 'SMTWTFS';

const MIN_DATE = new Date(1900, 0, 1);
// to maintainers in 2999: Y3K problem is on this line
const MAX_DATE = new Date(2999, 11, 31, 23, 59, 59);

/**
 * Date picker.
 *
 * - `value`: selected date value or null
 * - `onChange`: change callback
 * - `months`: month names
 * - `weekdays`: weekday labels (single letters)
 * - `weekStart`: the day on which the week starts (0 for Sunday, 1 for Monday, etc.)
 * - `today`: set to new Date() to circle current date
 * - `min`: min selectable date. Note: currently only affects year
 * - `max`: max selectable date. Note: ditto
 * - `useMaxHeight`: if true, will always size the picker to the max height a month could have
 */
export default class DatePicker extends Component {
    render ({
        value,
        onChange,
        months,
        weekdays,
        weekStart,
        today,
        min,
        max,
        useMaxHeight,
        ...props
    }) {
        props.class = (props.class || '') + ' paper-date-picker';

        return (
            <div {...props}>
                <SmallPicker
                    value={value}
                    onChange={onChange}
                    months={months || MONTHS}
                    weekdays={weekdays || WEEKDAYS}
                    weekStart={Number.isFinite(weekStart) ? weekStart : 1}
                    today={today}
                    min={min || MIN_DATE}
                    max={max || MAX_DATE}
                    useMaxHeight={useMaxHeight} />
            </div>
        );
    }
}
