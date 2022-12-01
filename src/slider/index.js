import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Spring, globalAnimator, lerp, clamp } from '../animation';
import metaball from './metaball';
import './style';

// horizontal padding on either side
const PAD_X = 8;
// vertical size of the slider element
const SIZE_Y = 16;
// size of a single thumb
const THUMB_SIZE = 12;
// scale of the thumb hitbox
const THUMB_HITBOX_SCALE = 2;
// distance below which both thumbs will be dragged simultaneously
const DRAG_BOTH_DIST = 8;
// minimum distance the pointer has to move to begin dragging
const MIN_DRAG_DISTANCE = 4;
// velocity (in pixels per second) at which thumbs will split
const SPLIT_VELOCITY = 435;
// popout text padding
const PAD_TEXT = 8;
// base distance of popouts
const POPOUT_DISTANCE = 36;
// extra popout distance quotient
const THUMB_DISTANCE_EXTRA_QUOTIENT = 16;
// minimum vertical distance at which slow scrubbing begins
const MIN_SLOW_SCRUBBING_DY = 64;
// slow scrubbing y scale
const SLOW_SCRUBBING_SCALE = 32;

const measureTextCanvas = document.createElement('canvas');
const measureTextCtx = measureTextCanvas.getContext('2d');
const measureTextWidth = (font, text) => {
    measureTextCtx.font = font;
    return measureTextCtx.measureText(text).width;
};

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
/// - `popout`: if true, will show popout with rounded values despite not being discrete
/// - `disabled`: disabled state
export default class Slider extends PureComponent {
    // thumb positions in [0, 1]
    leftThumbX = new Spring(1, 0.3);
    rightThumbX = new Spring(1, 0.3);

    leftPopoutAngle = new Spring(0.7, 0.5);
    rightPopoutAngle = new Spring(0.7, 0.5);
    leftPopoutScale = new Spring(1, 0.5);
    rightPopoutScale = new Spring(1, 0.5);

    leftThumbScale = new Spring(1, 0.3);
    rightThumbScale = new Spring(1, 0.3);

    // true after the user has released a thumb, letting it drift from inertia
    coasting = false;

    // MARK: event handling
    shouldDragBothThumbs () {
        const width = this.node.offsetWidth - PAD_X * 2;
        return Math.abs(this.leftThumbX.value - this.rightThumbX.value) * width < DRAG_BOTH_DIST;
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
        this.onPointerMove(e.clientX, e.clientY);
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
        this.onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    onTouchEnd = e => {
        e.preventDefault();
        this.onPointerUp();
    };

    onPointerDown (clientX) {
        const nodeRect = this.node.getBoundingClientRect();
        this.updateFont();
        this.dragFirstX = clientX;
        this.dragPrevX = clientX - nodeRect.left - PAD_X;
        this.isDragging = false;
        this.dragPrevTime = Date.now();

        if (this.draggingThumb === 'both') {
            this.leftThumbX.value = this.rightThumbX.value = (this.leftThumbX.value
                + this.rightThumbX.value) / 2;
            this.leftThumbScale.target = 1;
            this.leftThumbX.locked = this.rightThumbX.locked = true;
        } else if (this.draggingThumb === 'left') {
            this.leftThumbScale.target = 1;
            this.leftThumbX.locked = true;
        } else if (this.draggingThumb === 'right') {
            this.rightThumbScale.target = 1;
            this.rightThumbX.locked = true;
        }

        if (!this.leftPopoutAngle.wantsUpdate()) this.leftPopoutAngle.value = 0;
        if (!this.rightPopoutAngle.wantsUpdate()) this.rightPopoutAngle.value = 0;

        globalAnimator.register(this);
    }
    onPointerMove (clientX, clientY) {
        const nodeRect = this.node.getBoundingClientRect();
        const x = clientX - nodeRect.left - PAD_X;
        const width = nodeRect.width - PAD_X * 2;

        if (!this.isDragging && Math.abs(clientX - this.dragFirstX) > MIN_DRAG_DISTANCE) {
            this.isDragging = true;

            this.dragPos = this.dragPrevPos = this.draggingThumb === 'left'
                ? this.leftThumbX.value
                : this.rightThumbX.value;
        }

        if (this.isDragging) {
            this.leftThumbX.target = null;
            this.rightThumbX.target = null;
            this.leftThumbX.velocity = 0;
            this.rightThumbX.velocity = 0;

            let dragDelta = (x - this.dragPrevX) / width;

            const dy = Math.abs(clientY - nodeRect.top + nodeRect.height / 2);
            if (dy > MIN_SLOW_SCRUBBING_DY) {
                const factor = Math.exp(-(dy - MIN_SLOW_SCRUBBING_DY) / SLOW_SCRUBBING_SCALE);
                dragDelta *= factor;
            }

            this.dragPos += dragDelta;
            this.dragVelocity = (this.dragPos - this.dragPrevPos) / Math.max(
                1e-3,
                (Date.now() - this.dragPrevTime) / 1000,
            );

            if (this.draggingThumb === 'both' || this.draggingThumb === 'left') {
                this.leftThumbX.value = this.softBounds(this.dragPos, width);
                this.leftThumbX.velocity = this.dragVelocity;
            }
            if (this.draggingThumb === 'both' || this.draggingThumb === 'right') {
                this.rightThumbX.value = this.softBounds(this.dragPos, width);
                this.rightThumbX.velocity = this.dragVelocity;
            }

            if (this.leftThumbX.value > this.rightThumbX.value) {
                this.draggingThumb = 'both';
                this.leftThumbX.locked = this.rightThumbX.locked = true;
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

            globalAnimator.register(this);
        }

        this.dragPrevPos = this.dragPos;
        this.dragPrevX = x;
        this.dragPrevTime = Date.now();
    }
    onPointerUp () {
        if (!this.isDragging && this.draggingThumb === 'both' && Array.isArray(this.props.value)) {
            // split
            this.coasting = true;
            const width = this.node.offsetWidth - PAD_X * 2;
            this.leftThumbX.velocity = -SPLIT_VELOCITY / width;
            this.rightThumbX.velocity = SPLIT_VELOCITY / width;

            if (this.leftThumbX.value * width < THUMB_SIZE) {
                this.rightThumbX.velocity -= this.leftThumbX.velocity;
                this.leftThumbX.velocity = 0;
            }
            if (this.leftThumbX.value * width > width - THUMB_SIZE) {
                this.leftThumbX.velocity -= this.rightThumbX.velocity;
                this.rightThumbX.velocity = 0;
            }
        } else if (this.isDragging) {
            this.coasting = true;

            if (this.draggingThumb === 'both' || this.draggingThumb === 'left') {
                this.leftThumbX.velocity = this.dragVelocity;
            }
            if (this.draggingThumb === 'both' || this.draggingThumb === 'right') {
                this.rightThumbX.velocity = this.dragVelocity;
            }
        }

        this.leftThumbX.locked = this.rightThumbX.locked = false;
        this.leftThumbScale.target = this.rightThumbScale.target = 0;
        this.isDragging = false;
        globalAnimator.register(this);
    }
    softBounds (x, w) {
        const rubberBand = x => Math.sqrt(x);
        x *= w;
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

    font = null;

    updateFont () {
        const computedStyle = this.node ? getComputedStyle(this.node) : null;
        this.font = computedStyle && computedStyle.font;
        if (computedStyle && !this.font) {
            // Firefox is a bit weird here; computed style does not seem to contain the font
            // property
            this.font = [
                computedStyle.fontStyle,
                computedStyle.fontWeight,
                computedStyle.fontSize,
                computedStyle.fontFamily,
            ].join(' ');
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

        const handlePopout = (popout, thumb, scale, pscale) => {
            const v = thumb.velocity;
            const popoutY = Math.max(0, -Math.sin(popout.value - Math.PI / 2) * scale.value);

            popout.velocity -= 9 * Math.sqrt(popoutY) * v * dt;

            if (this.font) {
                const value = clamp(
                    Math.round(this.transferToValue(thumb.value)), this.min, this.max,
                );
                const id = `${this.font}$${value}`;
                if (pscale._prevMeasured !== id) {
                    // measureText seems to be expensive in some browsers, so only do it when
                    // necessary
                    const valueWidth = measureTextWidth(this.font, value);
                    pscale.target = Math.max(THUMB_SIZE * 1.1, valueWidth / 2 + PAD_TEXT);
                    pscale._prevMeasured = id;
                }

                if (scale.value < 0.1) pscale.value = pscale.target;
            }
        };

        handlePopout(
            this.leftPopoutAngle, this.leftThumbX, this.leftThumbScale, this.leftPopoutScale,
        );
        handlePopout(
            this.rightPopoutAngle, this.rightThumbX, this.rightThumbScale, this.rightPopoutScale,
        );

        this.leftThumbX.update(dt);
        this.rightThumbX.update(dt);
        this.leftPopoutAngle.update(dt);
        this.rightPopoutAngle.update(dt);
        this.leftPopoutScale.update(dt);
        this.rightPopoutScale.update(dt);
        this.leftThumbScale.update(dt);
        this.rightThumbScale.update(dt);

        if (this.coasting) {
            if (this.leftThumbX.value > this.rightThumbX.value) {
                this.leftThumbX.value = this.rightThumbX.value = (this.leftThumbX.value
                    + this.rightThumbX.value) / 2;
                this.leftThumbX.velocity = this.rightThumbX.velocity = (this.leftThumbX.velocity
                    + this.rightThumbX.velocity) / 2;
            }

            this.prevCoastingValue = this.coastingValue || this.props.value;
            this.coastingValue = Array.isArray(this.props.value) ? [
                this.transferToValue(this.leftThumbX.value),
                this.transferToValue(this.rightThumbX.value),
            ] : this.transferToValue(this.rightThumbX.value);

            this.emitChange(this.coastingValue);
        } else this.coastingValue = null;

        const wantsUpdate = this.leftThumbX.wantsUpdate() || this.rightThumbX.wantsUpdate()
            || this.leftPopoutAngle.wantsUpdate() || this.rightPopoutAngle.wantsUpdate()
            || this.leftPopoutScale.wantsUpdate() || this.rightPopoutScale.wantsUpdate()
            || this.leftThumbScale.wantsUpdate() || this.rightThumbScale.wantsUpdate();
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
            || (Array.isArray(this.props.value) && Array.isArray(prevProps.value)
                ? prevProps.value[0] !== this.props.value[0]
                    || prevProps.value[1] !== this.props.value[1]
                : prevProps.value !== this.props.value)) {
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

        props.role = 'slider';
        props['aria-valuenow'] = this.props.value;
        props['aria-valuetext'] = Array.isArray(this.props.value)
            ? `${this.props.value[0]}–${this.props.value[1]}` : this.props.value;
        props['aria-valuemin'] = this.min;
        props['aria-valuemax'] = this.max;

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
            highlightTransform = `scaleX(${rightThumbX})`;
        }

        const width = this.node ? this.node.offsetWidth - PAD_X * 2 : 0;

        const trackStyle = {};

        const leftThumbXpx = leftThumbX * width;
        const rightThumbXpx = rightThumbX * width;
        let leftThumbScale = 1;
        let rightThumbScale = 1;

        if (Array.isArray(this.props.value)) {
            // make thumbs grow when they get close
            const s = 1 + Math.exp(-((Math.abs(rightThumbXpx - leftThumbXpx) / 5) ** 2)) * 0.3;
            leftThumbScale *= s;
            rightThumbScale *= s;
        }

        if (!this.props.discrete) {
            leftThumbScale *= 1 + this.leftThumbScale.value * 0.3;
            rightThumbScale *= 1 + this.rightThumbScale.value * 0.3;
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
            leftThumbScale *= 0.6;
            rightThumbScale *= 0.6;

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
            x: PAD_X + leftThumbXpx,
            y: SIZE_Y / 2,
        };
        const rightThumbCircle = {
            radius: rightThumbScale * THUMB_SIZE / 2,
            x: PAD_X + rightThumbXpx,
            y: SIZE_Y / 2,
        };

        let leftDiscretePopout;
        let rightDiscretePopout;

        if (this.props.discrete || this.props.popout) {
            const leftDistance = POPOUT_DISTANCE * this.leftThumbScale.value
                * Math.max(1, this.leftPopoutScale.value / THUMB_DISTANCE_EXTRA_QUOTIENT);
            const leftAngle = this.leftPopoutAngle.value - Math.PI / 2;

            leftDiscretePopout = {
                radius: this.leftPopoutScale.value * this.leftThumbScale.value,
                x: PAD_X + leftThumbXpx + Math.cos(leftAngle) * leftDistance,
                y: SIZE_Y / 2 + Math.sin(leftAngle) * leftDistance,
                text: clamp(
                    Math.round(this.transferToValue(this.leftThumbX.value)), this.min, this.max,
                ),
                textScale: this.leftThumbScale.value,
            };

            if (Array.isArray(this.props.value)) {
                const rightDistance = POPOUT_DISTANCE * this.rightThumbScale.value
                    * Math.max(1, this.rightPopoutScale.value / THUMB_DISTANCE_EXTRA_QUOTIENT);
                const rightAngle = this.rightPopoutAngle.value - Math.PI / 2;

                rightDiscretePopout = {
                    radius: this.rightPopoutScale.value * this.rightThumbScale.value,
                    x: PAD_X + rightThumbXpx + Math.cos(rightAngle) * rightDistance,
                    y: SIZE_Y / 2 + Math.sin(rightAngle) * rightDistance,
                    text: clamp(
                        Math.round(this.transferToValue(this.rightThumbX.value)),
                        this.min,
                        this.max,
                    ),
                    textScale: this.rightThumbScale.value,
                };
            }
        }

        const metaballJoins = [
            metaball(
                leftThumbCircle.radius,
                rightThumbCircle.radius,
                [leftThumbCircle.x, leftThumbCircle.y],
                [rightThumbCircle.x, rightThumbCircle.y],
            ),
            leftDiscretePopout && metaball(
                leftDiscretePopout.radius,
                leftThumbCircle.radius,
                [leftDiscretePopout.x, leftDiscretePopout.y],
                [leftThumbCircle.x, leftThumbCircle.y],
                undefined,
                0.53,
                true,
            ),
            rightDiscretePopout && metaball(
                rightDiscretePopout.radius,
                rightThumbCircle.radius,
                [rightDiscretePopout.x, rightDiscretePopout.y],
                [rightThumbCircle.x, rightThumbCircle.y],
                undefined,
                0.53,
                true,
            ),
        ].filter(x => x).join(' ');

        return (
            <span {...props} ref={node => this.node = node}>
                <span class="p-track" style={trackStyle}>
                    <span class="p-track-highlight" style={{
                        transform: highlightTransform,
                    }} />
                    {ticks}
                </span>
                <svg class="p-thumb-fx">
                    {!this.props.disabled && <path class="p-thumb-join" d={metaballJoins} />}
                    <circle
                        class="p-thumb"
                        cx={leftThumbCircle.x}
                        cy={leftThumbCircle.y}
                        r={leftThumbCircle.radius} />
                    {Array.isArray(this.props.value) ? (
                        <circle
                            class="p-thumb"
                            cx={rightThumbCircle.x}
                            cy={rightThumbCircle.y}
                            r={rightThumbCircle.radius} />
                    ) : null}
                    {leftDiscretePopout ? (
                        <circle
                            class="p-thumb-popout"
                            cx={leftDiscretePopout.x}
                            cy={leftDiscretePopout.y}
                            r={leftDiscretePopout.radius} />
                    ) : null}
                    {rightDiscretePopout ? (
                        <circle
                            class="p-thumb-popout"
                            cx={rightDiscretePopout.x}
                            cy={rightDiscretePopout.y}
                            r={rightDiscretePopout.radius} />
                    ) : null}
                    {leftDiscretePopout ? (
                        <text
                            class="p-thumb-popout-text"
                            x={0}
                            y={0}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={[
                                `translate(${leftDiscretePopout.x} ${leftDiscretePopout.y})`,
                                `scale(${leftDiscretePopout.textScale})`,
                            ].join(' ')}>
                            {leftDiscretePopout.text}
                        </text>
                    ) : null}
                    {rightDiscretePopout ? (
                        <text
                            class="p-thumb-popout-text"
                            x={0}
                            y={0}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={[
                                `translate(${rightDiscretePopout.x} ${rightDiscretePopout.y})`,
                                `scale(${rightDiscretePopout.textScale})`,
                            ].join(' ')}>
                            {rightDiscretePopout.text}
                        </text>
                    ) : null}
                    <circle
                        class="p-thumb-hitbox"
                        cx={leftThumbCircle.x}
                        cy={leftThumbCircle.y}
                        r={leftThumbCircle.radius * THUMB_HITBOX_SCALE}
                        onMouseDown={this.onMouseDownLeft}
                        onTouchStart={this.onTouchStartLeft}
                        onTouchMove={this.onTouchMove}
                        onTouchEnd={this.onTouchEnd} />
                    {Array.isArray(this.props.value) ? (
                        <circle
                            class="p-thumb-hitbox"
                            cx={rightThumbCircle.x}
                            cy={rightThumbCircle.y}
                            r={rightThumbCircle.radius * THUMB_HITBOX_SCALE}
                            onMouseDown={this.onMouseDownRight}
                            onTouchStart={this.onTouchStartRight}
                            onTouchMove={this.onTouchMove}
                            onTouchEnd={this.onTouchEnd} />
                    ) : null}
                </svg>
            </span>
        );
    }
}
