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
export default class SmallDatePicker extends Component {
    state = {
        expanded: false,
        year: 0,
        month: 0,
    };

    resetPosition () {
        const value = Array.isArray(this.props.value) ? this.props.value[0] : this.props.value;
        if (!value) return;

        this.setState({
            year: value.getFullYear(),
            month: value.getMonth(),
        });
    }

    prevMonth () {
        let { month, year } = this.state;
        month--;
        if (month < 0) {
            year--;
            month = 11;
        }
        this.setState({ month, year });
    }

    nextMonth () {
        let { month, year } = this.state;
        month++;
        if (month > 11) {
            year++;
            month = 0;
        }
        this.setState({ month, year });
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
    }, { year, month, expanded }) {
        return (
            <div class={'ink-date-small-picker' + (expanded ? ' is-expanded' : '')}>
                <MonthDropdown
                    size="small"
                    year={year}
                    month={month}
                    months={months}
                    expanded={expanded}
                    onExpandedChange={expanded => this.setState({ expanded })}
                    onPrev={() => this.prevMonth()}
                    onNext={() => this.nextMonth()} />
                <DynHeightDiv class="p-picker-container">
                    <MonthViewContainer value={value} onChange={onChange}>
                        <WeekdayLabels weekdays={weekdays} weekStart={weekStart} size="small" />
                        <MonthView
                            size="small"
                            year={year}
                            month={month}
                            weekStart={1}
                            value={value}
                            today={today} />
                    </MonthViewContainer>
                    <YearPicker
                        size="small"
                        value={year}
                        onChange={year => this.setState({ year })}
                        min={min.getFullYear()}
                        max={max.getFullYear()}
                        visible={expanded} />
                </DynHeightDiv>
            </div>
        );
    }
}
