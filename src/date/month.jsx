import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import WeekView from './week-view';
import { DAYS_IN_A_WEEK, mod, getLinesInMonth, dateCmp } from './util';
import './style.less';

const CONTEXT_KEY = 'yamdl-month-view-events';
const MAX_MONTH_WEEK_SPAN = 6;

/**
 * Month view container; handles events.
 *
 * # Props
 * - `value`: Date | Date[2] ∈ { [a, b] : a ≤ b } - will show a selected date/date range
 * - `onChange`: (Date | Date[2] => void) - if set, will allow changing the date/date range
 */
export class MonthViewContainer extends PureComponent {
    getChildContext () {
        return {
            [CONTEXT_KEY]: {
                register: this.register,
                deregister: this.deregister,
            },
        };
    }

    monthViews = new Set();

    register = monthView => this.monthViews.add(monthView);
    deregister = monthView => this.monthViews.delete(monthView);

    getWholeDateAtPos (x, y) {
        for (const monthView of this.monthViews) {
            const date = monthView.getWholeDateAtPos(x, y);
            if (date) return date;
        }
        return null;
    }

    // TODO: hover states
    onPointerDown (x, y) {
        if (!this.props.onChange) return;
        this.downPos = [x, y];
        this.isTechnicallyDragging = this.isDragging = false;

        if (Array.isArray(this.props.value)) {
            this.originalValue = this.props.value;
        }
    }
    onPointerMove (x, y) {
        if (!this.isTechnicallyDragging
            && Math.hypot(x - this.downPos[0], y - this.downPos[1]) > 4) {
            this.isTechnicallyDragging = true;

            const date = this.getWholeDateAtPos(x, y);
            if (date && Array.isArray(this.props.value)) {
                const isA = dateCmp(date, this.props.value[0]) === 0;
                const isB = dateCmp(date, this.props.value[1]) === 0;

                this.isDragging = isA && isB ? 'ambiguous' : isA ? 'start' : isB ? 'end' : false;
            } else if (date) {
                this.isDragging = dateCmp(date, this.props.value) === 0;
            }
        }

        if (this.isDragging && Array.isArray(this.props.value)) {
            const a = this.getWholeDateAtPos(x, y);
            if (!a) return;
            let b;
            if (this.isDragging === 'ambiguous') {
                b = this.originalValue[0];
            } else if (this.isDragging === 'start') {
                b = this.originalValue[1];
            } else if (this.isDragging === 'end') {
                b = this.originalValue[0];
            }
            if (a > b) this.props.onChange([b, a]);
            else this.props.onChange([a, b]);
        } else if (this.isDragging) {
            const a = this.getWholeDateAtPos(x, y);
            if (a) this.props.onChange(a);
        }
    }
    onPointerUp () {
        const [x, y] = this.downPos;
        const date = this.getWholeDateAtPos(x, y);
        if (!this.isTechnicallyDragging && date && Array.isArray(this.props.value)) {
            const da = dateCmp(date, this.props.value[0]);
            const db = dateCmp(date, this.props.value[1]);

            const a = date;
            let b;

            if (Math.abs(da) > Math.abs(db)) {
                b = this.props.value[0];
            } else {
                b = this.props.value[1];
            }

            if (a > b) this.props.onChange([b, a]);
            else this.props.onChange([a, b]);
        } else if (!this.isTechnicallyDragging && date) {
            this.props.onChange(date);
        }
    }

    lastTouchEvent = 0;
    onMouseDown = e => {
        if (this.lastTouchEvent > Date.now() - 400) return;
        e.preventDefault();
        this.mouseDown = true;
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
        this.onPointerDown(e.clientX, e.clientY);
    };
    onMouseMove = e => {
        if (!this.mouseDown) return;
        e.preventDefault();
        this.onPointerMove(e.clientX, e.clientY);
    };
    onMouseUp = e => {
        if (!this.mouseDown) return;
        e.preventDefault();
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        this.mouseDown = false;
        this.onPointerUp();
    };
    onTouchStart = e => {
        this.lastTouchEvent = Date.now();
        this.onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    };
    onTouchMove = e => {
        this.lastTouchEvent = Date.now();
        this.onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    onTouchEnd = e => {
        this.lastTouchEvent = Date.now();
        this.onPointerUp();
    };

    componentWillUnmount () {
        if (this.mouseDown) {
            window.removeEventListener('mousemove', this.onMouseMove);
            window.removeEventListener('mouseup', this.onMouseUp);
        }
    }

    render () {
        return (
            <div class="ink-month-view-container"
                onMouseDown={this.onMouseDown}
                onTouchStart={this.onTouchStart}
                onTouchMove={this.onTouchMove}
                onTouchEnd={this.onTouchEnd}>
                {this.props.children}
            </div>
        );
    }
}

/**
 * Renders a month view.
 *
 * # Props
 * - `month`*: integer ∈ { 0, 1, …, 11 } - the month to display
 * - `year`*: integer - the year
 * - `weekStart`: integer ∈ { 0, 1, …, 6 } - the day to start weeks at; default 0 for Sunday
 * - `value`: Date | Date[2] ∈ { [a, b] : a ≤ b } - will show a selected date/date range
 * - `size`: large, medium, or small
 * - `today`: today date to mark on the calendar
 * - `min`: min date (dates beyond this point will be faded)
 * - `max`: max date (dates beyond this point will be faded)
 * - `useMaxHeight`: will always render the maximum number of weeks
 */
export class MonthView extends PureComponent {
    state = {
        hover: null,
    };

    weekRefs = [];

    getDateAtPos (x, y) {
        for (const week of this.weekRefs) {
            if (!week.node) continue;
            const weekRect = week.node.getBoundingClientRect();
            if (weekRect.left <= x && weekRect.top <= y
                && weekRect.right >= x && weekRect.bottom >= y) {
                const offset = Math.floor((x - weekRect.left) / weekRect.width * 7);
                return week.getDayAt(offset);
            }
        }
        return null;
    }
    getWholeDateAtPos (x, y) {
        const date = this.getDateAtPos(x, y);
        if (date) return new Date(this.props.year, this.props.month, date);
        return null;
    }

    componentDidMount () {
        if (this.context[CONTEXT_KEY]) this.context[CONTEXT_KEY].register(this);
    }

    componentWillUnmount () {
        if (this.context[CONTEXT_KEY]) this.context[CONTEXT_KEY].deregister(this);
    }

    render ({
        month, year, weekStart = 0, value, size, today, min, max, useMaxHeight,
    }) {
        const className = size === 'medium' ? 'p-medium' : size === 'small' ? 'p-small' : '';

        const lineCount = getLinesInMonth(year, month, weekStart);
        const lines = [];
        for (let i = 0; i < lineCount; i++) {
            lines.push(
                <WeekView
                    key={i}
                    ref={view => this.weekRefs[i] = view}
                    year={year}
                    month={month}
                    week={i}
                    weekStart={weekStart}
                    value={value}
                    hover={this.state.hover}
                    size={size}
                    unboundedSelection={size !== 'small'}
                    today={today}
                    min={min}
                    max={max} />
            );
        }

        if (useMaxHeight) {
            for (let i = lineCount; i < MAX_MONTH_WEEK_SPAN; i++) {
                lines.push(<div class={'ink-date-week-placeholder p-' + size} />);
            }
        }

        while (this.weekRefs.length > lineCount) this.weekRefs.pop();

        return (
            <div
                class={'ink-date-month ' + (className || '')}
                ref={node => this.node = node}>
                {lines}
            </div>
        );
    }
}

/**
 * Renders weekday labels found at the top of a month view.
 *
 * # Props
 * - `weekdays`: string[7] - weekday labels (such as “SMTWTFS”)
 * - `weekStart`: week start day
 * - `size`: size class
 */
export function WeekdayLabels ({ weekdays, weekStart, size, ...extra }) {
    const items = [];
    for (let i = 0; i < DAYS_IN_A_WEEK; i++) {
        const label = weekdays[mod(weekStart + i, DAYS_IN_A_WEEK)];
        items.push(
            <div class="p-label">
                {label}
            </div>
        );
    }

    let className = 'ink-date-weekday-labels';
    if (size) className += ` p-${size}`;
    if (extra.class) className += ' ' + extra.class;

    return <div {...extra} class={className}>{items}</div>;
}

const WeekBoundState = {
    EMPTY: 0,
    PARTIAL: 1,
    OUT: 2,
};
