import { h, Component } from 'preact';
import { WeekdayLabels, MonthView, MonthViewContainer } from './month';
import DynHeightDiv from './dyn-height-div';
import MonthDropdown from './month-dropdown';
import YearPicker from './year-picker';

/// Small date picker, for the desktop layout.
///
/// # Props
/// - value/onChange: date picker value
/// - weekdays: weekday label names
/// - months: month label names
/// - weekStart: week start day
/// - today: today date
/// - min: min pickable date
/// - max: max pickable date
/// - useMaxHeight: set height to max month size
/// - todayIcon: vnode
export default class SmallDatePicker extends Component {
    state = {
        expanded: false,
        year: 0,
        month: 0,
    };

    resetPosition () {
        // first, try resetting to the value
        let value = Array.isArray(this.props.value) ? this.props.value[0] : this.props.value;
        // then try the given today date
        if (!value) value = this.props.today;
        // then just try today
        if (!value) value = new Date();

        this.setState({
            year: value.getFullYear(),
            month: value.getMonth(),
        });
    }

    prevMonth () {
        let { month, year } = this.state;
        month--;
        if (month < 0) {
            if (year === this.props.min.getFullYear()) return;

            year--;
            month = 11;
        }

        year = Math.max(year, this.props.min.getFullYear());
        if (year === this.props.min.getFullYear()) {
            month = Math.max(month, this.props.min.getMonth());
        }

        this.setState({ month, year });
    }

    nextMonth () {
        let { month, year } = this.state;
        month++;
        if (month > 11) {
            if (year === this.props.max.getFullYear()) return;

            year++;
            month = 0;
        }

        year = Math.min(year, this.props.max.getFullYear());
        if (year === this.props.max.getFullYear()) {
            month = Math.min(month, this.props.max.getMonth());
        }

        this.setState({ month, year });
    }

    setYear (year) {
        let month = this.state.month;
        if (year === this.props.min.getFullYear()) {
            month = Math.max(month, this.props.min.getMonth());
        }
        if (year === this.props.max.getFullYear()) {
            month = Math.min(month, this.props.max.getMonth());
        }

        this.setState({
            year,
            month,
            expanded: false,
        });
    }

    setToday () {
        if (!this.props.today) return;
        this.setState({
            year: this.props.today.getFullYear(),
            month: this.props.today.getMonth(),
            expanded: false,
        });
    }

    componentDidMount () {
        this.resetPosition();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.value !== this.props.value) {
            this.resetPosition();
        }
    }

    render ({
        value,
        onChange,
        weekdays,
        weekStart,
        months,
        today,
        min,
        max,
        useMaxHeight,
    }, { year, month, expanded }) {
        return (
            <div class={'ink-date-small-picker' + (expanded ? ' is-expanded' : '')}>
                <MonthDropdown
                    size="small"
                    year={year}
                    onSetYear={year => this.setYear(year)}
                    month={month}
                    months={months}
                    expanded={expanded}
                    onExpandedChange={expanded => this.setState({ expanded })}
                    onPrev={() => this.prevMonth()}
                    onNext={() => this.nextMonth()}
                    isToday={year === today.getFullYear() && month === today.getMonth()}
                    onToday={() => this.setToday()} />
                <DynHeightDiv class="p-picker-container">
                    <MonthViewContainer value={value} onChange={onChange}>
                        <WeekdayLabels weekdays={weekdays} weekStart={weekStart} size="small" />
                        <MonthView
                            size="small"
                            year={year}
                            month={month}
                            weekStart={1}
                            value={value}
                            today={today}
                            min={min}
                            max={max}
                            useMaxHeight={useMaxHeight} />
                    </MonthViewContainer>
                    <YearPicker
                        size="small"
                        value={year}
                        onChange={year => this.setYear(year)}
                        min={min.getFullYear()}
                        max={max.getFullYear()}
                        visible={expanded} />
                </DynHeightDiv>
            </div>
        );
    }
}
