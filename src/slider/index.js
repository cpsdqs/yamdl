import { h, Component } from 'preact';
import { Spring, globalAnimator, lerp, clamp } from '../animation';
import metaball from './metaball';
import './style';

const THUMB_SIZE = 16;
const MIN_DRAG_DISTANCE = 4;
const SPLIT_VELOCITY = 400;

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

    // MARK: event handling
    shouldDragBothThumbs () {
        const width = this.node.offsetWidth - 16;
        return Math.abs(this.leftThumbX.value - this.rightThumbX.value) * width < 8;
    }
    onMouseDownLeft = e => {
        if (this.props.disabled) return;
        e.preventDefault();
        this.draggingThumb = this.shouldDragBothThumbs() ? 'both' : 'left';
        this.onPointerDown(e.clientX);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
    };
    onMouseDownRight = e => {
        if (this.props.disabled) return;
        e.preventDefault();
        this.draggingThumb = this.shouldDragBothThumbs() ? 'both' : 'right';
        this.onPointerDown(e.clientX);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
    };
    onMouseMove = e => {
        e.preventDefault();
        this.onPointerMove(e.clientX);
    };
    onMouseUp = e => {
        e.preventDefault();
        this.onPointerUp();
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
    };
    onTouchStartLeft = e => {
        if (this.props.disabled) return;
        e.preventDefault();
        this.draggingThumb = this.shouldDragBothThumbs() ? 'both' : 'left';
        this.onPointerDown(e.touches[0].clientX);
    };
    onTouchStartRight = e => {
        if (this.props.disabled) return;
        e.preventDefault();
        this.draggingThumb = this.shouldDragBothThumbs() ? 'both' : 'right';
        this.onPointerDown(e.touches[0].clientX);
    };
    onTouchMove = e => {
        e.preventDefault();
        this.onPointerMove(e.touches[0].clientX);
    };
    onTouchEnd = e => {
        e.preventDefault();
        this.onPointerUp();
    };

    onPointerDown (clientX) {
        const nodeRect = this.node.getBoundingClientRect();
        this.dragFirstX = clientX;
        this.isDragging = false;
        this.dragPrevX = this.softBounds(clientX - nodeRect.left - 8, nodeRect.width - 16);
        this.dragPrevTime = Date.now();

        if (this.draggingThumb === 'both') {
            this.leftThumbX.value = this.rightThumbX.value = (this.leftThumbX.value
                + this.rightThumbX.value) / 2;
        }
        globalAnimator.register(this);
    }
    onPointerMove (clientX) {
        const nodeRect = this.node.getBoundingClientRect();
        const x = this.softBounds(clientX - nodeRect.left - 8, nodeRect.width - 16);

        if (!this.isDragging && Math.abs(clientX - this.dragFirstX) > MIN_DRAG_DISTANCE) {
            this.isDragging = true;

            this.dragOffset = (this.draggingThumb === 'left'
                    ? this.leftThumbX.value
                    : this.rightThumbX.value) - x;
        }

        if (this.isDragging) {
            this.leftThumbX.target = null;
            this.rightThumbX.target = null;
            this.leftThumbX.velocity = 0;
            this.rightThumbX.velocity = 0;

            const thumbX = x + this.dragOffset;
            if (this.draggingThumb === 'both' || this.draggingThumb === 'left') {
                this.leftThumbX.value = thumbX;
            }
            if (this.draggingThumb === 'both' || this.draggingThumb === 'right') {
                this.rightThumbX.value = thumbX;
            }

            if (this.leftThumbX.value > this.rightThumbX.value) {
                this.draggingThumb = 'both';
            }

            let newValue;
            if (Array.isArray(this.props.value)) {
                const left = this.transferToValue(this.leftThumbX.value);
                const right = this.transferToValue(this.rightThumbX.value);
                newValue = [left, right];
            } else {
                newValue = this.transferToValue(this.rightThumbX.value);
            }

            this.emitChange(newValue);

            this.dragVelocity = (x - this.dragPrevX) / Math.max(
                1e-3,
                (Date.now() - this.dragPrevTime) / 1000,
            );

            globalAnimator.register(this);
        }

        this.dragPrevX = x;
        this.dragPrevTime = Date.now();
    }
    onPointerUp () {
        if (!this.isDragging && this.draggingThumb === 'both' && Array.isArray(this.props.value)) {
            // split
            this.coasting = true;
            const width = this.node.offsetWidth - 16;
            this.leftThumbX.velocity = -SPLIT_VELOCITY / width;
            this.rightThumbX.velocity = SPLIT_VELOCITY / width;
            globalAnimator.register(this);
        } else if (this.isDragging) {
            this.coasting = true;

            if (this.draggingThumb === 'both' || this.draggingThumb === 'left') {
                this.leftThumbX.velocity = this.dragVelocity;
            }
            if (this.draggingThumb === 'both' || this.draggingThumb === 'right') {
                this.rightThumbX.velocity = this.dragVelocity;
            }

            globalAnimator.register(this);
        }

        this.isDragging = false;
    }
    softBounds (x, w) {
        const rubberBand = x => Math.sqrt(x);
        if (x < 0) return -rubberBand(-x) / w;
        else if (x > w) return (rubberBand(x - w) + w) / w;
        else return x / w;
    }

    emitChange (newValue) {
        if (Array.isArray(newValue)) {
            if (this.props.discrete) {
                newValue = [Math.round(newValue[0]), Math.round(newValue[1])];
            }
            this.props.onChange([
                clamp(newValue[0], this.min, this.max),
                clamp(newValue[1], this.min, this.max),
            ]);
        } else {
            if (this.props.discrete) newValue = Math.round(newValue);
            this.props.onChange(clamp(newValue, this.min, this.max));
        }
    }

    update (dt) {
        if (this.coasting) {
            this.leftThumbX.target = this.leftThumbX.value < 0 ? 0 : null;
            this.rightThumbX.target = this.rightThumbX.value > 1 ? 1 : null;
        } else if (!this.isDragging) {
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
            this.prevCoastingValue = this.coastingValue || this.props.value;
            this.coastingValue = Array.isArray(this.props.value) ? [
                this.transferToValue(this.leftThumbX.value),
                this.transferToValue(this.rightThumbX.value),
            ] : this.transferToValue(this.rightThumbX.value);

            this.emitChange(this.coastingValue);
        } else this.coastingValue = null;

        let wantsUpdate = this.leftThumbX.wantsUpdate() || this.rightThumbX.wantsUpdate();
        if (!wantsUpdate && !this.isDragging) {
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
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
    }

    componentWillUpdate (newProps) {
        if (this.coasting) {
            const threshold = 0.1;
            const newValueIsCloseToEqualTo = value => {
                if (Array.isArray(newProps.value) && Array.isArray(value)) {
                    return Math.abs(newProps.value[0] - value[0])
                        + Math.abs(newProps.value[1] - value[1]) < threshold * 2;
                } else return Math.abs(newProps.value - value) < threshold;
            };
            if (!newValueIsCloseToEqualTo(this.coastingValue)
                && !newValueIsCloseToEqualTo(this.prevCoastingValue)) {
                this.coasting = false;
            }
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

        const trackStyle = {};

        let leftThumbXpx = leftThumbX * width;
        let rightThumbXpx = rightThumbX * width;
        let leftThumbScale = 1;
        let rightThumbScale = 1;

        {
            // make thumbs grow when they get close
            const s = 1 + Math.exp(-((Math.abs(rightThumbXpx - leftThumbXpx) / 5) ** 2)) * 0.3;
            leftThumbScale *= s;
            rightThumbScale *= s;
        }

        {
            // scale track when thumb is out of bounds
            const left = Math.min(leftThumbXpx, rightThumbXpx, 0);
            const right = Math.max(leftThumbXpx, rightThumbXpx, width);

            const scale = (right - left) / width;
            if (scale > 1) {
                const center = (left + right) / 2 - width / 2;
                trackStyle.transform = `translateX(${center}px) scaleX(${scale})`;
            }
        }

        if (this.props.disabled) {
            leftThumbScale /= 2;
            rightThumbScale /= 2;

            // when disabled, the track looks like this: ------ o --- with a space around the
            // thumbs, so a clip path is required
            let clipPath = 'polygon(0% 0%,';
            const split1 = leftThumbXpx - THUMB_SIZE * leftThumbScale;
            const split2 = leftThumbXpx + THUMB_SIZE * leftThumbScale;
            const split3 = rightThumbXpx - THUMB_SIZE * leftThumbScale;
            const split4 = rightThumbXpx + THUMB_SIZE * leftThumbScale;
            const splitTwice = split2 < split3;
            clipPath += `${split1}px 0%,${split1}px 99%,`;
            if (splitTwice) {
                clipPath += `${split2}px 99%,${split2}px 0%,${split3}px 0%,${split3}px 99%,`;
            }
            clipPath += `${split4}px 99%,${split4}px 0%,100% 0%,100% 100%,0% 100%`;
            trackStyle.clipPath = trackStyle.webkitClipPath = clipPath;
        }

        const leftThumbCircle = {
            radius: leftThumbScale * THUMB_SIZE / 2,
            x: 8 + leftThumbXpx,
            y: 8,
        };
        const rightThumbCircle = {
            radius: rightThumbScale * THUMB_SIZE / 2,
            x: 8 + rightThumbXpx,
            y: 8,
        };
        // TODO: discrete value popouts
        const metaballJoins = [
            metaball(
                leftThumbCircle.radius,
                rightThumbCircle.radius,
                [leftThumbCircle.x, leftThumbCircle.y],
                [rightThumbCircle.x, rightThumbCircle.y],
            ),
        ].join(' ');

        return (
            <span {...props} ref={node => this.node = node}>
                <span class="p-track" style={trackStyle}>
                    <span class="p-track-highlight" style={{
                        transform: highlightTransform,
                    }} />
                    {ticks}
                </span>
                <svg class="p-thumb-fx">
                    <path class="p-thumb-join" d={metaballJoins} />
                    <circle
                        class="p-thumb"
                        cx={leftThumbCircle.x}
                        cy={leftThumbCircle.y}
                        r={leftThumbCircle.radius}
                        onMouseDown={this.onMouseDownLeft}
                        onTouchStart={this.onTouchStartLeft}
                        onTouchMove={this.onTouchMove}
                        onTouchEnd={this.onTouchEnd} />
                    <circle
                        class="p-thumb"
                        cx={rightThumbCircle.x}
                        cy={rightThumbCircle.y}
                        r={rightThumbCircle.radius}
                        onMouseDown={this.onMouseDownRight}
                        onTouchStart={this.onTouchStartRight}
                        onTouchMove={this.onTouchMove}
                        onTouchEnd={this.onTouchEnd} />
                </svg>
            </span>
        );
    }
}
