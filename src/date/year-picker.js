import { h, Component } from 'preact';
import { clamp } from '../animation';
import './style';

/// Renders a year picker.
///
/// # Props
/// - `size`: size class
/// - `min`: min year
/// - `max`: max year
/// - `value`: currently selected year
/// - `onChange`: onChange handler
/// - `visible`: bool. If false, will assume the user can’t see this view.
export default class YearPicker extends Component {
    scrollableNode = null;
    yearNodes = new Map();

    /// Scrolls to the currently selected year, centering it in the scroll view.
    scrollToSelected () {
        if (!this.scrollableNode || !this.yearNodes.has(this.props.value)) return;
        const scrollable = this.scrollableNode;
        const node = this.yearNodes.get(this.props.value);

        scrollable.scrollTop = clamp(
            node.offsetTop + node.offsetHeight / 2 - scrollable.offsetHeight / 2,
            0,
            scrollable.scrollHeight,
        );
    }

    componentDidMount () {
        this.scrollToSelected();
    }

    componentDidUpdate (prevProps) {
        if (!prevProps.visible && this.props.visible) {
            // just became visible
            this.scrollToSelected();
        }
    }

    render ({ size, min, max, value, onChange }) {
        const items = [];
        for (let yr = min; yr <= max; yr++) {
            const fixedYear = yr;
            const isSelected = yr === value;

            items.push(
                <button
                    class={'p-year' + (isSelected ? ' is-selected' : '')}
                    key={yr}
                    onClick={() => onChange(fixedYear)}
                    ref={node => this.yearNodes.set(yr, node)}>
                    {yr}
                </button>
            );
        }

        // delete any year nodes that aren’t valid anymore
        for (const k of this.yearNodes.keys()) {
            if (k < min || k > max) {
                this.yearNodes.delete(k);
            }
        }

        return (
            <div class={`ink-date-year-picker p-${size}`}>
                <div class="p-scrollable" ref={node => this.scrollableNode = node}>
                    {items}
                </div>
            </div>
        );
    }
}
