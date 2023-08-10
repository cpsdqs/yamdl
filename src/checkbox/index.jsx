import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import Ripple from '../ripple';
import './style.less';

function isCheckboxCheckKey (key) {
    return key === ' ' || key === 'Enter';
}

const SWITCH_WIDTH = 46;
const THUMB_SIZE = 24;

/**
 * Renders a material checkbox.
 *
 * # Props
 * - `checked`: checked state
 * - `indeterminate`: indeterminate state
 * - `onChange`: change handler
 * - `disabled`: disabled state
 * - `switch`: if true, will render a switch
 */
export default class Checkbox extends PureComponent {
    /** The DOM node */
    node = null;

    /** The thumb node if this is a switch. */
    thumbNode = null;

    /** The ripple instance */
    ripple = null;

    state = {
        checked: false,
        draggingSwitch: false,
    };

    capturedPointer = null;

    onPointerDown = e => {
        if (this.props.onPointerDown) this.props.onPointerDown(e);

        if (!this.props.switch) this.ripple.onPointerDown(e);
        else if (!e.defaultPrevented) {
            const x = e.clientX - this.node.getBoundingClientRect().left;
            this.onSwitchDragStart(x);
            this.node.setPointerCapture(e.pointerId);
            this.capturedPointer = e.pointerId;
        }
    };

    onPointerMove = e => {
        if (this.state.draggingSwitch) {
            const x = e.clientX - this.node.getBoundingClientRect().left;
            this.onSwitchDragMove(x);
        }
    };

    onPointerUp = e => {
        if (this.state.draggingSwitch) {
            this.onSwitchDragEnd(false);
            this.node.releasePointerCapture(this.capturedPointer);
            this.capturedPointer = null;
        }
    };

    onPointerCancel = e => {
        if (this.state.draggingSwitch) {
            this.onSwitchDragEnd(true);
            this.node.releasePointerCapture(this.capturedPointer);
            this.capturedPointer = null;
        }
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

    onSwitchDragEnd (cancel) {
        if (!this.state.draggingSwitch) return;
        const { moved, mayDrag, checked, lastX } = this.state.draggingSwitch;
        if (!cancel) {
            if (moved && mayDrag) {
                if (this.props.onChange) this.props.onChange(checked);
                else this.setState({ checked });
            } else if (lastX >= 0 && lastX < SWITCH_WIDTH) {
                if (this.props.onChange) this.props.onChange(!this.props.checked);
                else this.setState({ checked: !this.state.checked });
            }
        }

        this.lastDragEnd = Date.now();
        this.setState({ draggingSwitch: false });
    }

    prevState = 'uninitialized';
    prevRenderState = 'uninitialized';

    componentDidMount () {
        this.forceUpdate();
    }

    render () {
        const props = { ...this.props };

        const state = this.props.indeterminate
            ? 'indeterminate'
            : ('checked' in this.props ? this.props.checked : this.state.checked)
                ? 'checked' : 'unchecked';

        if (state !== this.prevRenderState) {
            this.prevState = this.prevRenderState;
            this.prevRenderState = state;
        }

        delete props.id;
        delete props.onChange;
        delete props.switch;
        delete props.indeterminate;
        props.class = (props.class || '')
            + (this.props.switch ? ' paper-switch' : ' paper-checkbox');
        props.class += ` is-${state}`;
        props.class += ` was-${this.prevState}`;
        if (props.disabled) props.class += ' is-disabled';
        if (this.state.draggingSwitch) props.class += ' is-being-dragged';

        if (this.props.switch) {
            const thumbStyle = this.state.draggingSwitch
                ? { transform: this.state.draggingSwitch.transform } : {};

            return (
                <span
                    {...props}
                    ref={node => this.node = node}
                    onPointerDown={this.onPointerDown}
                    onPointerMove={this.onPointerMove}
                    onPointerUp={this.onPointerUp}
                    onPointerCancel={this.onPointerCancel}
                    onKeyDown={this.onKeyDown}
                    onKeyUp={this.onKeyUp}>
                    <span class="p-background"></span>
                    <input
                        class="p-input"
                        type="checkbox"
                        id={this.props.id}
                        checked={state === 'checked'}
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
                    onPointerDown={this.onPointerDown}
                    onPointerMove={this.onPointerMove}
                    onPointerUp={this.onPointerUp}
                    onPointerCancel={this.onPointerCancel}
                    onKeyDown={this.onKeyDown}
                    onKeyUp={this.onKeyUp}>
                    <input
                        class="p-input"
                        type="checkbox"
                        id={this.props.id}
                        checked={state === 'checked'}
                        indeterminate={state === 'indeterminate'}
                        onChange={e => this.props.onChange
                            ? this.props.onChange(e.target.checked)
                            : this.setState({ checked: e.target.checked })}
                        disabled={!!this.props.disabled} />
                    <span class="p-ripple-container">
                        <Ripple ref={ripple => this.ripple = ripple} circle />
                    </span>
                    <span class="p-background"></span>
                    <span class="p-check"></span>
                    <span class="p-indeterminate"></span>
                </span>
            );
        }
    }
}
