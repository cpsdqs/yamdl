import { createRef, h } from 'preact';
import { PureComponent } from 'preact/compat';
import { RtSpring, lerp } from '../animation';
import { ElementAnimationController } from '../element-animation';
import './style.less';

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
export default class TextField extends PureComponent {
    state = {
        isFocused: false,
    };

    constructor (props) {
        super(props);
    }

    /// Input ID, used for the `for` attribute on the `<label>` if `id` is not given.
    inputID = `text-field-${inputIDCounter++}`;
    labelID = this.inputID + '-label';
    errorID = this.inputID + '-error';

    node = null;

    /// The `<input>` node.
    inputNodeRef = createRef();
    /// The leading container node.
    leadingNodeRef = createRef();

    get inputNode () {
        return this.inputNodeRef.current;
    }

    get leadingNode () {
        return this.leadingNodeRef.current;
    }

    onFocus = e => {
        if (this.props.onFocus) this.props.onFocus(e);
        if (!e.defaultPrevented) this.setState({ isFocused: true });
    };

    onBlur = e => {
        if (this.props.onBlur) this.props.onBlur(e);
        if (!e.defaultPrevented) this.setState({ isFocused: false });
        this.underlineX = null;
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

    blur () {
        this.inputNode.blur();
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
                    <span class="p-leading" ref={this.leadingNodeRef}>
                        {this.props.leading}
                    </span>
                    <input
                        autoComplete="off"
                        {...props}
                        id={this.props.id || this.inputID}
                        class="p-input"
                        onFocus={this.onFocus}
                        onBlur={this.onBlur}
                        onMouseDown={this.onInputMouseDown}
                        onTouchStart={this.onInputTouchStart}
                        ref={this.inputNodeRef}
                        value={this.props.value}
                        placeholder={this.props.placeholder}
                        disabled={this.props.disabled}
                        aria-labelledby={this.labelID}
                        aria-invalid={!!this.props.error}
                        aria-errormessage={this.props.error && this.errorID}
                        onInput={e => this.props.onChange
                            && this.props.onChange(e.target.value, e)} />
                    <span class="p-trailing">
                        {this.props.trailing}
                    </span>
                </span>
                <TextFieldDecoration
                    floating={this.state.isFocused || this.props.value}
                    id={this.props.id || this.inputID}
                    labelID={this.labelID}
                    label={this.props.label}
                    inputNode={this.inputNodeRef}
                    leadingNode={this.leadingNodeRef}
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
class TextFieldDecoration extends PureComponent {
    floatingSpring = new RtSpring({ motionThreshold: 1 / 60 });

    /// The `<label>` node.
    labelNode = createRef();
    // see render fn
    breakLeftNode = createRef();
    breakRightNode = createRef();
    animCtrl = new ElementAnimationController(({ float }) => {
        const [labelStyle, breakState] = this.getLabelStyleAndBreakStyle(float);
        const breakStyle = {
            transform: `scaleX(${breakState.scale})`,
        };
        return [labelStyle, breakStyle, breakStyle];
    }, [this.labelNode, this.breakLeftNode, this.breakRightNode]);

    /// Returns the styles for the label node and layout info for the outline break.
    getLabelStyleAndBreakStyle (float) {
        // return dummy value if refs haven’t been populated yet
        const labelNode = this.labelNode.current;
        if (!labelNode || !this.props.inputNode.current) return [{}, {}];

        const labelWidth = labelNode.offsetWidth;
        const labelHeight = labelNode.offsetHeight;
        const inputStyle = getComputedStyle(this.props.inputNode.current);

        const floatingY = this.props.outline ? -labelHeight * FLOATING_LABEL_SCALE / 2 : 0;
        const fixedY = (parseInt(inputStyle.paddingTop) + parseInt(inputStyle.paddingBottom)) / 2;

        const leadingWidth = this.props.leadingNode.current?.offsetWidth || 0;

        let x = this.props.center
            ? (this.props.inputNode.current.offsetWidth
                - lerp(labelWidth, labelWidth * FLOATING_LABEL_SCALE, float)) / 2
            : parseInt(inputStyle.paddingLeft);
        if (!this.props.outline) x += leadingWidth;
        const y = lerp(fixedY, floatingY, float);
        const scale = lerp(1, FLOATING_LABEL_SCALE, float);

        const breakX = this.props.center
            ? (this.props.inputNode.current.offsetWidth - labelWidth * FLOATING_LABEL_SCALE) / 2 - 2
            : x - 2;
        const breakWidth = labelWidth ? labelWidth * FLOATING_LABEL_SCALE + 4 : 0;

        let labelX = x;
        const easeOutSine = t => Math.sin(Math.PI / 2 * t);
        if (this.props.outline) labelX += leadingWidth * easeOutSine(1 - float);

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
                scale: 1 - float,
            },
        ];
    }

    componentDidMount () {
        this.floatingSpring.setValue(this.floatingSpring.target); // skip any init animation
        this.animCtrl.didMount();

        // re-render for label width
        this.forceUpdate();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.center !== this.props.center
            || prevProps.outline !== this.props.outline
            || prevProps.label !== this.props.label) {
            this.animCtrl.resolve();

            // re-render for label width
            this.forceUpdate();
        }
    }

    componentWillUnmount () {
        this.animCtrl.drop();
    }

    render () {
        this.floatingSpring.setTarget(this.props.floating ? 1 : 0);
        this.animCtrl.setInputs({ float: this.floatingSpring });
        const [labelStyle, breakStyle] = this.getLabelStyleAndBreakStyle(this.floatingSpring.getValue());

        return (
            <span class="p-decoration">
                <label
                    class="p-label"
                    id={this.props.labelID}
                    for={this.props.id}
                    style={labelStyle}
                    ref={this.labelNode}>
                    {this.props.label}
                </label>
                {this.props.outline ? (
                    <div class="p-outline">
                        <div class="outline-left" style={{ width: breakStyle.x }}></div>
                        <div class="outline-break" style={{ width: breakStyle.width }}>
                            <div
                                ref={this.breakLeftNode}
                                class="break-left"
                                style={{ transform: `scaleX(${breakStyle.scale})` }} />
                            <div
                                ref={this.breakRightNode}
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
