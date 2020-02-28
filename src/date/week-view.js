import { h, Component } from 'preact';
import { Spring, globalAnimator, clamp } from '../animation';
import {
    DAYS_IN_A_WEEK,
    mod,
    getDaysInMonth,
    getFirstWeekdayNormalized,
    getLinesInMonth,
    dateCmp,
    isSameDayLZ,
} from './util';

/// Renders a week line.
///
/// # Props
/// - year/month: year/month number
/// - value: selection value
/// - hover: hover value
/// - unboundedSelection: bool
/// - size: size class
/// - today: today date
export default class WeekView extends Component {
    selectionStart = new Spring(1, 0.15);
    selectionStartInd = new Spring(1, 0.15);
    selectionStartOpacity = new Spring(1, 0.15);
    selectionEnd = new Spring(1, 0.15);
    selectionEndInd = new Spring(1, 0.15);
    selectionEndOpacity = new Spring(1, 0.15);
    hoverStart = new Spring(1, 0.15);
    hoverEnd = new Spring(1, 0.15);
    hoverRingOpacity = new Spring(1, 0.15);
    selectionRangeOpacity = new Spring(1, 0.15);

    selectionGhosts = [];
    wasFullRange = false;

    /// Creates a selection ghost that fades out gradually.
    makeSelectionGhost (start, end) {
        const ghost = {
            start,
            end,
            opacity: new Spring(1, 0.15, 1),
            holdOpacity: false,
        };
        ghost.opacity.target = 0;
        this.selectionGhosts.push(ghost);
        this.selectionRangeOpacity.value = 0;

        const targetStart = this.selectionStart.value;
        const targetEnd = this.selectionEnd.value;

        if (targetStart <= start && targetEnd >= end && this.wasFullRange) {
            // target contains selection ghost
            // hold ghost opacity to prevent x(1-x) flicker
            ghost.holdOpacity = true;
        } else if (start <= targetStart && end >= targetEnd) {
            // selection ghost contains target
            // target can be at full opacity already
            this.selectionRangeOpacity.value = 1;
        }
    }

    update (dt) {
        const { year, month, value, hover, unboundedSelection, size, today } = this.props;
        const { baseDate, startOffset, endOffset, firstWeekdayNormalized } = this.getParams();

        const startDate = new Date(year, month, baseDate + startOffset);
        const endDate = new Date(year, month, baseDate + endOffset);

        if (!value) {
            globalAnimator.deregister(this);
            this.forceUpdate();
            return;
        }
        let valueStart = Array.isArray(value) ? value[0] : value;
        let valueEnd = Array.isArray(value) ? value[1] : value;

        if (valueStart === null && valueEnd === null) {
            globalAnimator.deregister(this);
            this.forceUpdate();
            return;
        }
        if (valueEnd === null) valueEnd = valueStart;
        else if (valueStart === null) valueStart = valueEnd;

        let startDayOffset = dateCmp(valueStart, startDate) / 86400000;
        let endDayOffset = endOffset + dateCmp(valueEnd, endDate) / 86400000;
        if (startOffset) {
            if (startDayOffset >= 0) startDayOffset += startOffset;
            else if (startDayOffset < 0 && unboundedSelection) {
                startDayOffset = Math.min(startDayOffset, -1);
            } else if (startDayOffset < 0 && !unboundedSelection) startDayOffset = startOffset;

            if (endDayOffset < firstWeekdayNormalized) {
                endDayOffset = Math.min(-1, endDayOffset - 7);
            }
        }

        if (endOffset !== 6) {
            if (startDayOffset - endOffset > 0) {
                if (unboundedSelection) startDayOffset = Math.max(7, startDayOffset);
                else startDayOffset = endOffset + 7;
            }

            if (endDayOffset - endOffset > 0) {
                if (unboundedSelection) endDayOffset = Math.max(7, endDayOffset);
                else endDayOffset = endOffset;
            }
        }

        const startDayOffsetInWeek = startDayOffset >= 0 && startDayOffset < 7;
        const endDayOffsetInWeek = endDayOffset >= 0 && endDayOffset < 7;

        const startDayOffsetWasInWeek = this.selectionStartOpacity.target === 1;
        const endDayOffsetWasInWeek = this.selectionEndOpacity.target === 1;

        const prevStart = this.selectionStart.value;
        const prevEnd = this.selectionEnd.value;

        this.selectionStart.target = startDayOffset;
        this.selectionEnd.target = endDayOffset;

        if (startDayOffsetInWeek) {
            this.selectionStartInd.target = startDayOffset;
        }
        if (endDayOffsetInWeek) {
            this.selectionEndInd.target = endDayOffset;
        }
        let makeSelectionGhost = false;

        const isFullRange = startDayOffset <= 0 && endDayOffset >= 6;

        if (this.wasFullRange !== isFullRange) {
            this.selectionStart.value = this.selectionStart.target;
            this.selectionEnd.value = this.selectionEnd.target;
            makeSelectionGhost = true;
        }

        this.wasFullRange = isFullRange;

        if (startDayOffsetInWeek && !startDayOffsetWasInWeek) {
            // fade in
            this.selectionStart.value = this.selectionStart.target;
            this.selectionStartInd.value = this.selectionStartInd.target;
            makeSelectionGhost = true;
        }
        if (endDayOffsetInWeek && !endDayOffsetWasInWeek) {
            // fade in
            this.selectionEnd.value = this.selectionEnd.target;
            this.selectionEndInd.value = this.selectionEndInd.target;
            makeSelectionGhost = true;
        }
        if (startDayOffsetWasInWeek && !startDayOffsetInWeek) makeSelectionGhost = true;
        if (endDayOffsetWasInWeek && !endDayOffsetInWeek) makeSelectionGhost = true;

        this.selectionStartOpacity.target = startDayOffset >= 0 && startDayOffset < 7 ? 1 : 0;
        this.selectionEndOpacity.target = endDayOffset >= 0 && endDayOffset < 7 ? 1 : 0;

        this.hoverStart.target = this.selectionStart.target;
        this.hoverEnd.target = this.selectionEnd.target;

        this.selectionRangeOpacity.target = 1;

        if (makeSelectionGhost) this.makeSelectionGhost(prevStart, prevEnd);

        const springs = [
            this.selectionStart,
            this.selectionStartInd,
            this.selectionStartOpacity,
            this.selectionEnd,
            this.selectionEndInd,
            this.selectionEndOpacity,
            this.hoverStart,
            this.hoverEnd,
            this.hoverRingOpacity,
            this.selectionRangeOpacity,
        ];
        let wantsUpdate = false;
        for (const spring of springs) {
            spring.update(dt);
            if (spring.wantsUpdate()) wantsUpdate = true;
        }

        for (const ghost of this.selectionGhosts) {
            ghost.opacity.update(dt);
        }
        this.selectionGhosts = this.selectionGhosts.filter(g => g.opacity.wantsUpdate());
        if (this.selectionGhosts.length) wantsUpdate = true;

        if (!wantsUpdate) globalAnimator.deregister(this);
        this.forceUpdate();
    }

    initSelection () {
        this.update(0);
        this.selectionStart.finish();
        this.selectionEnd.finish();
        this.selectionStartInd.finish();
        this.selectionEndInd.finish();
        this.selectionStartOpacity.finish();
        this.selectionEndOpacity.finish();
        this.hoverStart.finish();
        this.hoverEnd.finish();
        this.hoverRingOpacity.finish();
        this.forceUpdate();
        globalAnimator.register(this);
    }

    componentDidMount () {
        this.initSelection();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.value !== this.props.value) {
            if (Array.isArray(prevProps.value) && Array.isArray(this.props.value)) {
                if (prevProps.value[0] !== this.props.value[0]
                    || prevProps.value[1] !== this.props.value[1]) {
                    globalAnimator.register(this);
                }
            } else if (prevProps.value !== this.props.value) {
                if (!prevProps.value) this.initSelection();
                globalAnimator.register(this);
            }
        }
        if (prevProps.today !== this.props.today) {
            globalAnimator.register(this);
        }
    }

    getParams () {
        const { year, month, week, weekStart } = this.props;

        const firstWeekdayNormalized = getFirstWeekdayNormalized(year, month, weekStart);
        const startOffset = week === 0 ? firstWeekdayNormalized : 0;
        const dayCount = getDaysInMonth(year, month);
        const lineCount = getLinesInMonth(year, month, weekStart);
        const endOffset = week === lineCount - 1
            ? mod(firstWeekdayNormalized + dayCount - 1, DAYS_IN_A_WEEK)
            : 6;

        const baseDate = 1 + week * DAYS_IN_A_WEEK - firstWeekdayNormalized;

        return { baseDate, startOffset, endOffset, firstWeekdayNormalized };
    }

    getDayAt (offset) {
        const { baseDate, startOffset, endOffset } = this.getParams();
        return offset >= startOffset && offset <= endOffset ? baseDate + offset : null;
    }

    render ({
        year, month, value, unboundedSelection, size, today, ...extra
    }) {
        const { baseDate, startOffset, endOffset } = this.getParams();

        let hasStartSelection = false;
        let hasEndSelection = false;
        let hasToday = false;
        let todayIndex = 0;
        const items = [];
        for (let i = 0; i < DAYS_IN_A_WEEK; i++) {
            if (startOffset <= i && i <= endOffset) {
                let isSelected = false;
                const date = new Date(year, month, baseDate + i);
                if (value instanceof Date) {
                    isSelected = value !== null && dateCmp(date, value) === 0;
                    hasStartSelection = hasStartSelection || isSelected;
                } else if (Array.isArray(value)) {
                    const a = value[0] !== null && dateCmp(value[0], date) === 0;
                    const b = value[1] !== null && dateCmp(value[1], date) === 0;
                    hasStartSelection = hasStartSelection || a;
                    hasEndSelection = hasEndSelection || b;
                    isSelected = a || b;
                }

                let className = 'p-day';
                if (isSelected) className += ' is-selected';
                if (isSameDayLZ(date, today)) {
                    hasToday = true;
                    className += ' is-today';
                    todayIndex = i;
                }

                items.push(
                    <div class={className} key={i}>
                        {baseDate + i}
                    </div>
                );
            } else {
                items.push(<div class="p-filler" key={i} />);
            }
        }

        const selection = [];
        const l = (a, b) => unboundedSelection
            ? clamp(a, -1, 7)
            : a > 6 ? 7 : b < 0 ? -1 : clamp(a, 0, 6);
        const r = (a, b) => unboundedSelection
            ? (1 + clamp(b, -1, 7))
            : a > 6 ? 8 : b < 0 ? -1 : (1 + clamp(b, 0, 6));
        const c = x => `${x / 7 * 100}%`;
        const y = (size === 'medium' ? 40 : size === 'small' ? 32 : 48) / 2;

        if (value && (!Array.isArray(value) || value[0] !== null || value[1] !== null)) {
            if (Array.isArray(value)) {
                const ghosts = [];

                for (const ghost of this.selectionGhosts) {
                    ghosts.push(
                        <line
                            key="selection"
                            class="p-selection p-selection-ghost"
                            style={{ opacity: ghost.holdOpacity ? 1 : ghost.opacity.value }}
                            x1={c(l(ghost.start, ghost.end) + 0.5)}
                            x2={c(r(ghost.start, ghost.end) - 0.5)}
                            y1={y}
                            y2={y} />
                    );
                }

                selection.push(
                    <g class="p-range-container">
                        <line
                            key="hover"
                            class="p-hover"
                            x1={c(l(this.hoverStart.value, this.hoverEnd.value) + 0.5)}
                            x2={c(r(this.hoverStart.value, this.hoverEnd.value) - 0.5)}
                            y1={y}
                            y2={y} />
                        <line
                            key="selection"
                            class="p-selection"
                            style={{ opacity: this.selectionRangeOpacity.value }}
                            x1={c(l(this.selectionStart.value, this.selectionEnd.value) + 0.5)}
                            x2={c(r(this.selectionStart.value, this.selectionEnd.value) - 0.5)}
                            y1={y}
                            y2={y} />
                        {ghosts}
                    </g>
                );
            }

            if (hasStartSelection) selection.push(
                <circle
                    key="selection-a"
                    class="p-selection-circle"
                    cx={c(l(this.selectionStartInd.value, this.selectionEndInd.value) + 0.5)}
                    style={{ opacity: this.selectionStartOpacity.value }}
                    cy={y} />,
            );
            if (hasEndSelection) selection.push(
                <circle
                    key="selection-b"
                    class="p-selection-circle"
                    cx={c(r(this.selectionStartInd.value, this.selectionEndInd.value) - 0.5)}
                    style={{ opacity: this.selectionEndOpacity.value }}
                    cy={y} />,
            );
        }

        if (hasToday) selection.push(
            <circle
                key="today"
                class="p-today-circle"
                cx={c(todayIndex + 0.5)}
                cy={y} />,
        );

        let className = size === 'medium' ? ' p-medium' : size === 'small' ? ' p-small' : ' ';
        className += extra.class || '';

        return (
            <div {...extra} class={'ink-date-week ' + className} ref={node => this.node = node}>
                <svg class="p-selection-container">
                    {selection}
                </svg>
                {items}
            </div>
        );
    }
}
