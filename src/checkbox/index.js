import { h, Component } from 'preact';
import Ripple from '../ripple';
import './style';

function isCheckboxCheckKey (key) {
    return key === ' ' || key === 'Enter';
}

const SWITCH_WIDTH = 46;
const THUMB_SIZE = 24;

/// Renders a material checkbox.
///
/// # Props
/// - `checked`: checked state
/// - `onChange`: change handler
/// - `disabled`: disabled state
/// - `switch`: if true, will render a switch
export default class Checkbox extends Component {
    /// The DOM node
    node = null;

    /// The thumb node if this is a switch.
    thumbNode = null;

    /// The ripple instance
    ripple = null;

    state = {
        checked: false,
        draggingSwitch: false,
    };

    ignoreMouse = 0;

    onMouseDown = e => {
        if (this.props.onMouseDown) this.props.onMouseDown(e);
        if (this.ignoreMouse < Date.now() - 400) {
            if (!this.props.switch) this.ripple.onMouseDown(e);
            else if (!e.defaultPrevented) {
                const x = e.clientX - this.node.getBoundingClientRect().left;
                this.onSwitchDragStart(x);
                window.addEventListener('mousemove', this.onWindowMouseMove);
                window.addEventListener('mouseup', this.onWindowMouseUp);
            }
        }
    };

    onWindowMouseMove = e => {
        if (this.state.draggingSwitch && this.ignoreMouse < Date.now() - 400) {
            const x = e.clientX - this.node.getBoundingClientRect().left;
            this.onSwitchDragMove(x);
        }
    };

    onWindowMouseUp = e => {
        if (this.state.draggingSwitch && this.ignoreMouse < Date.now() - 400) {
            this.onSwitchDragEnd();
        }
        window.removeEventListener('mousemove', this.onWindowMouseMove);
        window.removeEventListener('mouseup', this.onWindowMouseUp);
    };

    onTouchStart = e => {
        if (this.props.onTouchStart) this.props.onTouchStart(e);
        if (!this.props.switch) this.ripple.onTouchStart(e);
        else if (!e.defaultPrevented) {
            const x = e.touches[0].clientX - this.node.getBoundingClientRect().left;
            this.onSwitchDragStart(x);
        }
        this.ignoreMouse = Date.now();
    };

    onTouchMove = e => {
        if (this.props.onTouchMove) this.props.onTouchMove(e);
        if (this.state.draggingSwitch) {
            const x = e.touches[0].clientX - this.node.getBoundingClientRect().left;
            this.onSwitchDragMove(x);
        }
        this.ignoreMouse = Date.now();
    };

    onTouchEnd = e => {
        if (this.props.onTouchEnd) this.props.onTouchEnd(e);
        if (this.state.draggingSwitch) this.onSwitchDragEnd();
        this.ignoreMouse = Date.now();
    };

    onKeyDown = e => {
        if (this.props.onKeyDown) this.props.onKeyDown(e);
        if (!e.defaultPrevented && isCheckboxCheckKey(e.key) && !this.props.switch) {
            this.ripple.onAnonymousDown();
        }
    };

    onKeyUp = e => {
        if (this.props.onKeyUp) this.props.onKeyUp(e);
        if (!e.defaultPrevented && !this.props.switch) this.ripple.onAnonymousUp();
    };

    onSwitchDragStart (x) {
        const checked = this.props.onChange ? this.props.checked : this.state.checked;
        const thumbX = checked ? SWITCH_WIDTH - THUMB_SIZE : 0;
        const thumbMax = thumbX + THUMB_SIZE;

        const mayDrag = thumbX <= x && x < thumbMax;

        this.setState({
            draggingSwitch: {
                startX: x,
                lastX: x,
                moved: false,
                mayDrag,
                lastTime: Date.now(),
                offset: thumbX - x,
                checked,
                transform: '',
            },
        });
    }

    onSwitchDragMove (x) {
        const { startX, moved, lastX, mayDrag, lastTime, offset } = this.state.draggingSwitch;

        const max = SWITCH_WIDTH - THUMB_SIZE;
        let pos = x + offset;
        if (pos < 0) pos = -((-pos) ** 0.4);
        if (pos > max) pos = max + ((pos - max) ** 0.4);

        const thumbCenter = x + offset + THUMB_SIZE / 2;
        const dt = Math.max(Date.now() - lastTime, 3) / 1000;
        const velocity = (x - lastX) / dt;

        const checked = thumbCenter + velocity / 2 >= SWITCH_WIDTH / 2;

        this.setState({
            draggingSwitch: {
                startX,
                lastX: x,
                lastTime: Date.now(),
                moved: moved || Math.abs(x - startX) > 4,
                mayDrag,
                offset,
                checked,
                transform: mayDrag ? `translateX(${pos}px)` : '',
            },
        });
    }

    onSwitchDragEnd () {
        if (!this.state.draggingSwitch) return;
        const { moved, mayDrag, checked, lastX } = this.state.draggingSwitch;
        if (moved && mayDrag) {
            if (this.props.onChange) this.props.onChange(checked);
            else this.setState({ checked });
        } else if (lastX >= 0 && lastX < SWITCH_WIDTH) {
            if (this.props.onChange) this.props.onChange(!this.props.checked);
            else this.setState({ checked: !this.state.checked });
        }

        this.lastDragEnd = Date.now();
        this.setState({ draggingSwitch: false });
    }

    render () {
        const props = { ...this.props };

        const checked = this.props.checked || this.state.checked;

        delete props.id;
        delete props.onChange;
        delete props.switch;
        props.class = (props.class || '')
            + (this.props.switch ? ' paper-switch' : ' paper-checkbox');
        if (checked) props.class += ' is-checked';
        if (props.disabled) props.class += ' is-disabled';
        if (this.state.draggingSwitch) props.class += ' is-being-dragged';

        if (this.props.switch) {
            const thumbStyle = this.state.draggingSwitch
                ? { transform: this.state.draggingSwitch.transform } : {};

            return (
                <span
                    {...props}
                    ref={node => this.node = node}
                    onMouseDown={this.onMouseDown}
                    onTouchStart={this.onTouchStart}
                    onTouchMove={this.onTouchMove}
                    onTouchEnd={this.onTouchEnd}
                    onKeyDown={this.onKeyDown}
                    onKeyUp={this.onKeyUp}>
                    <span class="p-background"></span>
                    <input
                        class="p-input"
                        type="checkbox"
                        id={this.props.id}
                        checked={checked}
                        onChange={e => this.props.onChange
                            ? this.props.onChange(e.target.checked)
                            : this.setState({ checked: e.target.checked })}
                        onClick={e => {
                            if (this.lastDragEnd > Date.now() - 400) {
                                e.preventDefault();
                            }
                        }}
                        disabled={!!this.props.disabled} />
                    <span
                        class="p-thumb"
                        style={thumbStyle}
                        ref={node => this.thumbNode = node}>
                        <span class="p-thumb-highlight" />
                    </span>
                </span>
            );
        } else {
            return (
                <span
                    {...props}
                    ref={node => this.node = node}
                    onMouseDown={this.onMouseDown}
                    onTouchStart={this.onTouchStart}
                    onTouchEnd={this.onTouchEnd}
                    onKeyDown={this.onKeyDown}
                    onKeyUp={this.onKeyUp}>
                    <input
                        class="p-input"
                        type="checkbox"
                        id={this.props.id}
                        checked={checked}
                        onChange={e => this.props.onChange
                            ? this.props.onChange(e.target.checked)
                            : this.setState({ checked: e.target.checked })}
                        disabled={!!this.props.disabled} />
                    <span class="p-ripple-container">
                        <Ripple ref={ripple => this.ripple = ripple} circle />
                    </span>
                    <span class="p-background"></span>
                    <span class="p-check"></span>
                </span>
            );
        }
    }
}
