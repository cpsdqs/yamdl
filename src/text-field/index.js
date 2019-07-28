import { h, Component } from 'preact';
import { Spring, lerp } from '../animation';
import './style';

/// Scaling factor that will be applied to the label when it floats.
const FLOATING_LABEL_SCALE = 0.75;

let inputIDCounter = 0;

/// A material text field.
///
/// # Props
/// - `value`: text contents
/// - `onChange`: text change handler
/// - `label`: the floating label
/// - `placeholder`: the placeholder shown when the label is floating
/// - `outline`: will use outlined style if set
/// - `disabled`: will disable the text field if set
/// - `center`: will center the input if set
/// - `error`: error label; should be falsy if no error is present
/// - `helperLabel`: helper label shown when there is no error
/// - `leading`: leading icon
/// - `trailing`: trailing icon
export default class TextField extends Component {
    state = {
        isFocused: false,
    };

    floatingSpring = new Spring(1, 0.3);

    constructor (props) {
        super(props);

        this.floatingSpring.tolerance = 1 / 60;
    }

    /// Input ID, used for the `for` attribute on the `<label>` if `id` is not given.
    inputID = `text-field-${inputIDCounter++}`;
    labelID = this.inputID + '-label';
    errorID = this.inputID + '-error';

    node = null;

    /// The `<input>` node.
    inputNode = null;

    /// The leading container node.
    leadingNode = null;

    onFocus = () => {
        this.setState({ isFocused: true });
    };

    onBlur = () => {
        this.setState({ isFocused: false });
    };

    onInputMouseDown = e => {
        if (this.props.onMouseDown) this.props.onMouseDown(e);
        if (!e.defaultPrevented && !this.state.isFocused) {
            const nodeRect = this.node.getBoundingClientRect();
            this.underlineX = (e.clientX - nodeRect.left) / nodeRect.width;
        }
    };

    onInputTouchStart = e => {
        if (this.props.onTouchStart) this.props.onTouchStart(e);
        if (!e.defaultPrevented && !this.state.isFocused) {
            const nodeRect = this.node.getBoundingClientRect();
            this.underlineX = (e.touches[0].clientX - nodeRect.left) / nodeRect.width;
        }
    };

    /// Calls `focus()` on the input node.
    focus () {
        this.inputNode.focus();
    }

    /// Sets the target of the floating spring according to the current state.
    updateFloatingSpring () {
        this.floatingSpring.target = (this.state.isFocused || this.props.value) ? 1 : 0;
        if (this.floatingSpring.wantsUpdate()) this.floatingSpring.start();
    }

    componentDidMount () {
        this.updateFloatingSpring();
        this.forceUpdate();
    }

    componentDidUpdate () {
        this.updateFloatingSpring();
    }

    render () {
        let className = (this.props.class || '') + ' paper-text-field';
        if (this.state.isFocused) className += ' is-focused';
        if (this.props.error) className += ' has-error';
        if (this.props.disabled) className += ' is-disabled';
        if (this.props.center) className += ' centered';
        if (this.state.isFocused || this.props.value) className += ' floating';
        if (!this.props.label) className += ' no-label';
        if (this.props.leading) className += ' has-leading';
        if (this.props.trailing) className += ' has-trailing';

        const props = { ...this.props };
        delete props.class;
        delete props.outline;
        delete props.label;
        delete props.value;
        delete props.leading;
        delete props.trailing;
        delete props.center;
        delete props.error;
        delete props.helperLabel;

        const outline = !!this.props.outline;

        if (!outline) className += ' filled-style';

        return (
            <span class={className} ref={node => this.node = node}>
                <span class="p-contents">
                    <span class="p-leading" ref={node => this.leadingNode = node}>
                        {this.props.leading}
                    </span>
                    <input
                        {...props}
                        id={this.props.id || this.inputID}
                        class="p-input"
                        onFocus={this.onFocus}
                        onBlur={this.onBlur}
                        onMouseDown={this.onInputMouseDown}
                        onTouchStart={this.onInputTouchStart}
                        ref={node => this.inputNode = node}
                        value={this.props.value}
                        placeholder={this.props.placeholder}
                        disabled={this.props.disabled}
                        aria-labelledby={this.labelID}
                        aria-invalid={!!this.props.error}
                        aria-errormessage={this.props.error && this.errorID}
                        onInput={e => this.props.onChange && this.props.onChange(e)} />
                    <span class="p-trailing">
                        {this.props.trailing}
                    </span>
                </span>
                <TextFieldDecoration
                    floatingSpring={this.floatingSpring}
                    id={this.props.id || this.inputID}
                    labelID={this.labelID}
                    label={this.props.label}
                    inputNode={this.inputNode}
                    leadingNode={this.leadingNode}
                    outline={outline}
                    center={this.props.center}
                    underlineX={this.underlineX} />
                <label class="p-error-label" id={this.errorID}>{this.props.error}</label>
                <label class="p-helper-label">{this.props.helperLabel}</label>
            </span>
        );
    }
}

/// Renders text field decoration.
/// This is a separate component to avoid frequent re-rendering of the main TextField component.
class TextFieldDecoration extends Component {
    state = {
        float: 0,
    };

    /// The `<label>` node.
    labelNode = null;

    /// Returns the styles for the label node and layout info for the outline break.
    getLabelStyleAndBreakStyle () {
        // return dummy value if refs haven’t been populated yet
        if (!this.labelNode) return [{}, {}];

        const labelWidth = this.labelNode.offsetWidth;
        const labelHeight = this.labelNode.offsetHeight;
        const inputStyle = getComputedStyle(this.props.inputNode);

        const floatingY = this.props.outline ? -labelHeight * FLOATING_LABEL_SCALE / 2 : 0;
        const fixedY = (parseInt(inputStyle.paddingTop) + parseInt(inputStyle.paddingBottom)) / 2;

        const leadingWidth = this.props.leadingNode.offsetWidth;

        let x = this.props.center
            ? (this.props.inputNode.offsetWidth
                - lerp(labelWidth, labelWidth * FLOATING_LABEL_SCALE, this.state.float)) / 2
            : parseInt(inputStyle.paddingLeft);
        if (!this.props.outline) x += leadingWidth;
        const y = lerp(fixedY, floatingY, this.state.float);
        const scale = lerp(1, FLOATING_LABEL_SCALE, this.state.float);

        const breakX = this.props.center
            ? (this.props.inputNode.offsetWidth - labelWidth * FLOATING_LABEL_SCALE) / 2 - 2
            : x - 2;
        const breakWidth = labelWidth * FLOATING_LABEL_SCALE + 4;

        let labelX = x;
        const easeOutSine = t => Math.sin(Math.PI / 2 * t);
        if (this.props.outline) labelX += leadingWidth * easeOutSine(1 - this.state.float);

        return [
            {
                transform: `translate(${labelX}px, ${y}px) scale(${scale})`,
            },
            {
                //           scale (of the two border lines, indicated by +++ here)
                //          v------
                // .------- ++++      ++++ --------
                // |        ·            ·
                // | left   ·   break    ·   right
                // |        ·            ·
                // '------- -------------- --------
                //          |------------|
                //          |    width
                //          x
                x: breakX,
                width: breakWidth,
                scale: 1 - this.state.float,
            },
        ];
    }

    componentDidMount () {
        this.props.floatingSpring.on('update', this.onUpdate);
    }

    componentWillUnmount () {
        this.props.floatingSpring.removeListener('update', this.onUpdate);
    }

    onUpdate = float => this.setState({ float });

    render () {
        const [labelStyle, breakStyle] = this.getLabelStyleAndBreakStyle();

        return (
            <span class="p-decoration">
                <label
                    class="p-label"
                    id={this.props.labelID}
                    for={this.props.id}
                    style={labelStyle}
                    ref={node => this.labelNode = node}>
                    {this.props.label}
                </label>
                {this.props.outline ? (
                    <div class="p-outline">
                        <div class="outline-left" style={{ width: breakStyle.x }}></div>
                        <div class="outline-break" style={{ width: breakStyle.width }}>
                            <div
                                class="break-left"
                                style={{ transform: `scaleX(${breakStyle.scale})` }} />
                            <div
                                class="break-right"
                                style={{ transform: `scaleX(${breakStyle.scale})` }} />
                            <div class="break-bottom" />
                        </div>
                        <div class="outline-right"></div>
                    </div>
                ) : (
                    <div class="p-underline">
                        <div
                            class="p-underline-inner"
                            style={{
                                transformOrigin: `${Number.isFinite(this.props.underlineX)
                                    ? (this.props.underlineX * 100)
                                    : 50}% 100%`,
                            }} />
                    </div>
                )}
            </span>
        );
    }
}
