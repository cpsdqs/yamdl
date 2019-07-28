import { h, Component } from 'preact';
import { Spring, globalAnimator, lerp } from '../animation';
import './style';

/// A material slider.
///
/// # Props
/// - `min`: minimum value; defaults to 0
/// - `max`: maximum value; defaults to 1
/// - `transfer`: tuple of `(f, f^(-1))` with
///   `f : normalized screen space = [0, 1] -> [min, max] = value space`. Defaults to linear.
/// - `value`: either a single number or an interval
/// - `onChange`: called with a new value when it changes
/// - `discrete`: if true, will round to integers
/// - `tickDistance`: distance for tick marks. 1 by default
/// - `disabled`: disabled state
export default class Slider extends Component {
    // thumb positions in [0, 1]
    leftThumbX = new Spring(1, 0.3);
    rightThumbX = new Spring(1, 0.3);

    // true after the user has released a thumb, letting it drift from inertia
    coasting = false;

    update (dt) {
        if (this.coasting) {
            this.leftThumbX.target = this.leftThumbX.value < 0 ? 0 : null;
            this.rightThumbX.target = this.rightThumbX.value > 1 ? 1 : null;
        } else {
            this.leftThumbX.target = this.transferToScreen(
                Array.isArray(this.props.value) ? this.props.value[0] : this.props.value,
            );
            this.rightThumbX.target = this.transferToScreen(
                Array.isArray(this.props.value) ? this.props.value[1] : this.props.value,
            );
        }

        this.leftThumbX.update(dt);
        this.rightThumbX.update(dt);

        if (this.coasting) {
            this.coastingValue = Array.isArray(this.props.value) ? [
                this.transferToValue(this.leftThumbX.value),
                this.transferToValue(this.rightThumbX.value),
            ] : this.transferToValue(this.rightThumbX.value);
        } else this.coastingValue = null;

        let wantsUpdate = this.leftThumbX.wantsUpdate() || this.rightThumbX.wantsUpdate();
        if (!wantsUpdate) {
            globalAnimator.deregister(this);
        }

        this.forceUpdate();
    }

    componentDidMount () {
        this.update(0);
        this.leftThumbX.finish();
        this.rightThumbX.finish();
        this.forceUpdate();
        window.addEventListener('resize', this.onResize);
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
        window.removeEventListener('resize', this.onResize);
    }

    componentWillUpdate (newProps) {
        if (this.coasting && newProps.value !== this.coastingValue) {
            this.coasting = false;
        }
    }

    componentDidUpdate (prevProps) {
        if (prevProps.min !== this.props.min || prevProps.max !== this.props.max
            || prevProps.value !== this.props.value) {
            globalAnimator.register(this);
        }
    }

    onResize = () => this.forceUpdate();

    get min () {
        return Number.isFinite(this.props.min) ? this.props.min : 0;
    }
    get max () {
        return Number.isFinite(this.props.max) ? this.props.max : 1;
    }

    transferToValue (t) {
        if (this.props.transfer) return this.props.transfer[0](t);
        return lerp(this.min, this.max, t);
    }
    transferToScreen (x) {
        if (this.props.transfer) return this.props.transfer[1](x);
        return (x - this.min) / (this.max - this.min);
    }

    render () {
        const props = { ...this.props };

        delete props.min;
        delete props.max;
        delete props.transfer;
        delete props.value;
        delete props.onChange;
        delete props.discrete;
        delete props.tickDistance;
        delete props.disabled;

        props.class = (props.class || '') + ' ink-slider';
        if (this.props.disabled) props.class += ' is-disabled';

        props['aria-role'] = 'slider';
        props['aria-valuenow'] = this.props.value;
        props['aria-valuetext'] = Array.isArray(this.props.value)
            ? `${this.props.value[0]}–${this.props.value[1]}` : this.props.value;
        props['aria-valuemin'] = this.min;
        props['aria-valuemax'] = this.min;

        const leftThumbX = this.leftThumbX.value;
        const rightThumbX = this.rightThumbX.value;

        const ticks = [];
        if (this.props.discrete) {
            const step = Math.max(1, this.props.tickDistance | 0);
            const leftThumbValue = this.transferToValue(leftThumbX);
            const rightThumbValue = this.transferToValue(rightThumbX);

            for (let x = this.min; x <= this.max; x += step) {
                const highlight = Array.isArray(this.props.value)
                    ? (leftThumbValue <= x && x <= rightThumbValue)
                    : x <= rightThumbValue;
                ticks.push(
                    <span key={x} class={'p-tick' + (highlight ? ' p-highlight' : '')} style={{
                        left: `calc(${this.transferToScreen(x)} * calc(100% - 2px))`,
                    }} />
                );
            }
        }

        let highlightTransform;
        if (Array.isArray(this.props.value)) {
            highlightTransform = `translateX(${leftThumbX * 100}%)`
                + ` scaleX(${rightThumbX - leftThumbX})`;
        } else {
            const right = this.transferToScreen(this.props.value);
            highlightTransform = `scaleX(${rightThumbX})`;
        }

        const width = this.node ? this.node.offsetWidth - 16 : 0;

        const fxStyle = {};
        const trackStyle = {};

        const thumbDistance = Math.abs(rightThumbX - leftThumbX) * width;

        const needsFX = Array.isArray(this.props.value)
            && thumbDistance < 30 && thumbDistance !== 0;
        if (needsFX) {
            fxStyle.filter = fxStyle.webkitFilter = 'url(#ink-slider-metaball-filter)';
        }

        let leftThumbTransform = `translateX(${leftThumbX * width}px)`;
        let rightThumbTransform = `translateX(${rightThumbX * width}px)`;

        if (this.props.disabled) {
            leftThumbTransform += ' scale(0.5)';
            rightThumbTransform += ' scale(0.5)';

            let clipPath = 'polygon(0% 0%,';
            const split1 = leftThumbX * width - 8;
            const split2 = leftThumbX * width + 8;
            const split3 = leftThumbX * width - 8;
            const split4 = leftThumbX * width + 8;
            const splitTwice = split2 < split3;
            clipPath += `${split1}px 0%,${split1}px 99%,`;
            if (splitTwice) {
                clipPath += `${split2}px 99%,${split2}px 0%,${split3}px 0%,${split3}px 99%,`;
            }
            clipPath += `${split4}px 99%,${split4}px 0%,100% 0%,100% 100%,0% 100%`;
            trackStyle.clipPath = trackStyle.webkitClipPath = clipPath;
        } else if (Array.isArray(this.props.value) && thumbDistance < 30) {
            const s = 1 + Math.exp(-((thumbDistance / 5) ** 2)) * 0.3;
            leftThumbTransform += ` scale(${s})`;
            rightThumbTransform += ` scale(${s})`;
        }

        return (
            <span {...props} ref={node => this.node = node}>
                <span class="p-track" style={trackStyle}>
                    <span class="p-track-highlight" style={{
                        transform: highlightTransform,
                    }} />
                    {ticks}
                </span>
                <span class="p-thumb-fx" style={fxStyle}>
                    <span class="p-thumb" style={{
                        transform: leftThumbTransform,
                    }} />
                    <span class="p-thumb" style={{
                        transform: rightThumbTransform,
                    }} />
                </span>
                <svg style={{ display: 'none' }}>
                    <defs>
                        <filter id="ink-slider-metaball-filter" color-interpolation-filters="sRGB">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="a" />
                            <feColorMatrix in="a" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -12" result="out" />
                        </filter>
                    </defs>
                </svg>
            </span>
        );
    }
}
