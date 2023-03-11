import { createRef, h } from 'preact';
import { PureComponent } from 'preact/compat';
import { getNow, Spring } from '../animation';
import './style.less';

/// Duration of a single ripple effect.
const RIPPLE_DURATION = 0.5;

/// Duration of a single ripple effect while the pointer is held down.
const RIPPLE_HOLD_DURATION = 3;

/// Duration of a single ripple effect fading in (required when its starting size is not 0)
const RIPPLE_FADE_IN_DURATION = 0.4;

const TOUCH_RIPPLE_SIZE = 20;

///
/// Draws a material ripple in the parent container.
///
/// Methods `onMouseDown`, `onTouchStart`, `onAnonymousDown`, `onAnonymousUp`, `onFocus`, `onBlur`
/// should be called by the enclosing component when appropriate.
///
/// # Props
/// - `circle`: will use radius instead of bounding box diagonal for ripple size if true
export default class Ripple extends PureComponent {
    state = {
        /// List of current ripples.
        ripples: [],

        /// The ID of the current ripple. Used to identify which ripple to modify when the
        /// pointer is released.
        currentRippleID: null,
    };

    resizeObserver = new ResizeObserver(() => {
        this.updateParameters();
    });

    focusSpring = new Spring(1, 0.3);

    /// The DOM node.
    node = createRef();

    componentDidMount () {
        this.resizeObserver.observe(this.node.current);
    }

    onPointerDown = e => {
        if (e.defaultPrevented) return;
        if (e.button) return;
        this.onDown(e.clientX, e.clientY, e.pointerType === 'touch' ? TOUCH_RIPPLE_SIZE : 0);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerCancel);
    };

    /// Will be bound automatically---should not be called directly.
    onPointerUp = () => {
        this.onUp();
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerCancel);
    };

    /// Will be bound automatically---should not be called directly.
    onPointerCancel = () => {
        this.onPointerUp();
    };

    onFocus = () => {
        this.focusSpring.target = 1;
        this.lastRender = getNow();
        this.forceUpdate();
    };

    onBlur = () => {
        this.focusSpring.target = 0;
        this.lastRender = getNow();
        this.forceUpdate();
    };

    anonDown = false;

    /// Anonymous down event---will render a centered ripple.
    onAnonymousDown = () => {
        if (!this.anonDown) {
            this.onDown();
            this.anonDown = true;
        }
    };

    /// Anonymous up event—will stop holding the ripple previously created by an `onAnonymousDown`
    /// call.
    onAnonymousUp = () => {
        if (this.anonDown) {
            this.onUp();
            this.anonDown = false;
        }
    };

    onDown (clientX, clientY, size) {
        const nodeRect = this.node.current?.getBoundingClientRect();
        if (!nodeRect) return;
        this.updateParameters(nodeRect);

        const offsetX = clientX !== undefined ? clientX - nodeRect.left : nodeRect.width / 2;
        const offsetY = clientY !== undefined ? clientY - nodeRect.top : nodeRect.height / 2;

        const ripples = this.state.ripples.slice();
        const ripple = {
            id: Math.random().toString(36),
            x: offsetX,
            y: offsetY,
            sizeSpring: new Spring(1, RIPPLE_HOLD_DURATION),
            opacitySpring: new Spring(1, RIPPLE_HOLD_DURATION),
            fadeInSpring: new Spring(1, RIPPLE_FADE_IN_DURATION),
            lastSync: getNow(),
        };

        if (size > 1) {
            const { targetScale } = this.getParameters();
            ripple.sizeSpring.value = size / targetScale;
            ripple.fadeInSpring.value = 0;
        } else {
            ripple.fadeInSpring.value = 1;
        }

        ripple.sizeSpring.target = 1;
        ripple.opacitySpring.value = 1;
        ripple.opacitySpring.target = 0.3;
        ripple.fadeInSpring.target = 1;

        ripples.push(ripple);
        this.setState({
            currentRippleID: ripple.id,
            ripples,
        });
    }

    onUp () {
        let currentRippleIndex = this.state.ripples.findIndex(ripple => ripple.id === this.state.currentRippleID);
        if (currentRippleIndex >= 0) {
            const ripples = this.state.ripples.slice();
            const ripple = ripples[currentRippleIndex] = { ...ripples[currentRippleIndex] };

            const now = getNow();
            const elapsed = now - ripple.lastSync;
            ripple.sizeSpring.update(elapsed);
            ripple.opacitySpring.update(elapsed);
            ripple.fadeInSpring.update(elapsed);

            ripple.sizeSpring.setPeriod(RIPPLE_DURATION);
            ripple.opacitySpring.target = 0;
            ripple.opacitySpring.setPeriod(RIPPLE_DURATION);
            ripple.lastSync = now;

            this.setState({
                currentRippleID: null,
                ripples,
            });
        } else {
            this.setState({ currentRippleID: null });
        }
    }

    removeRipple (rippleId) {
        const rippleIndex = this.state.ripples.findIndex(ripple => ripple.id === rippleId);
        if (rippleIndex >= 0) {
            const ripples = this.state.ripples.slice();
            ripples.splice(rippleIndex, 1);
            this.setState({ ripples });
        }
    }

    getParameters (nodeRect = null) {
        if (!this.node.current) return null;
        if (!nodeRect) {
            nodeRect = this.node.current.getBoundingClientRect();
        }
        const centerX = nodeRect.width / 2;
        const centerY = nodeRect.height / 2;
        const targetScale = this.props.circle
                ? Math.max(nodeRect.width, nodeRect.height)
                : Math.hypot(nodeRect.width, nodeRect.height);
        return { centerX, centerY, targetScale };
    }
    memoizedParameters = null;

    updateParameters (rect = null) {
        this.memoizedParameters = this.getParameters(rect);
    }

    lastRender = null;
    render () {
        let highlight = null;
        const ripples = [];

        const now = getNow();
        if (this.lastRender) {
            const dt = now - this.lastRender;
            this.lastRender = now;
            this.focusSpring.update(dt);
        } else {
            this.lastRender = now;
        }

        if (!this.memoizedParameters) this.updateParameters();
        let centerX = this.memoizedParameters?.centerX || 0;
        let centerY = this.memoizedParameters?.centerY || 0;
        let targetScale = this.memoizedParameters?.targetScale || 0;

        let maxHighlight = this.focusSpring.value;

        for (const ripple of this.state.ripples) {
            const sizeProgress = ripple.sizeSpring.value;

            const rippleHighlight = 1 - 4 * Math.abs(sizeProgress - 0.5) ** 2;
            maxHighlight = Math.max(rippleHighlight * ripple.fadeInSpring.value, maxHighlight);

            ripples.push(
                <SingleRipple
                    key={ripple.id}
                    lastSync={ripple.lastSync}
                    size={ripple.sizeSpring}
                    opacity={ripple.opacitySpring}
                    fadeIn={ripple.fadeInSpring}
                    centerX={centerX}
                    centerY={centerY}
                    x={ripple.x}
                    y={ripple.y}
                    targetScale={targetScale}
                    onFinish={() => this.removeRipple(ripple.id)} />
            );
        }

        if (maxHighlight) {
            highlight = <RippleHighlight
                lastSync={this.lastRender}
                focus={this.focusSpring}
                ripples={this.state.ripples}
                onFinish={() => this.forceUpdate()} />
        }

        return (
            <div class="ink-ripple" ref={this.node}>
                {ripples}
                {highlight}
            </div>
        );
    }
}

class RippleHighlight extends PureComponent {
    node = createRef();

    computeStyle (focus, ripples, t) {
        let maxHighlight = focus.getValueAfter(t);

        for (const ripple of ripples) {
            const rippleHighlight = 1 - 4 * Math.abs(ripple.sizeSpring.getValueAfter(t) - 0.5) ** 2;
            const fadeIn = ripple.fadeInSpring.getValueAfter(t);
            maxHighlight = Math.max(rippleHighlight * fadeIn, maxHighlight);
        }

        return { opacity: maxHighlight };
    }

    componentDidMount () {
        this.didUpdate();
    }

    componentDidUpdate () {
        this.didUpdate();
    }

    scheduledTimeout = null;
    animation = null;
    didUpdate () {
        if (!this.node.current) return;
        clearTimeout(this.scheduledTimeout);
        const timeout = 1;
        const timeStep = 1 / 60;
        let doScheduleTimeout = true;
        let doScheduleFinish = false;

        // generate animation keyframes
        const keyframes = [];
        const startT = getNow() - this.props.lastSync;
        let dt = 0;

        for (; dt < timeout; dt += timeStep) {
            const t = startT + dt;
            const style = this.computeStyle(this.props.focus, this.props.ripples, t);
            keyframes.push(style);

            const stopFocus = Math.abs(this.props.focus.target - this.props.focus.getValueAfter(t))
                + Math.abs(this.props.focus.getVelocityAfter(t)) < this.props.focus.tolerance;

            let stopRipples = true;
            for (const ripple of this.props.ripples) {
                const stopRipple = Math.abs(ripple.sizeSpring.target - ripple.sizeSpring.getValueAfter(t))
                    + Math.abs(ripple.sizeSpring.getVelocityAfter(t)) < ripple.sizeSpring.tolerance;
                if (!stopRipple) {
                    stopRipples = false;
                    break;
                }
            }

            if (stopFocus && stopRipples) {
                doScheduleTimeout = false;
                doScheduleFinish = true;
                break;
            }
        }

        if (this.animation) {
            this.animation.cancel();
            this.animation = null;
        }
        this.animation = this.node.current.animate(keyframes, {
            duration: dt * 1000,
            easing: 'linear',
            fill: 'forwards',
        });
        this.animation.play();

        if (doScheduleTimeout) {
            this.animation.addEventListener('finish', () => {
                this.didUpdate();
            });
        } else if (doScheduleFinish) {
            this.animation.addEventListener('finish', () => {
                this.props.onFinish();
            });
        }
    }

    componentWillUnmount () {
        clearTimeout(this.scheduledTimeout);
    }

    render ({ focus, ripples }) {
        return (
            <div ref={this.node} class="ink-ripple-highlight" style={this.computeStyle(focus, ripples, 0)} />
        );
    }
}

class SingleRipple extends PureComponent {
    node = createRef();

    computeStyle (size, opacity, fadeIn) {
        const { centerX, centerY, x, y, targetScale } = this.props;

        const posX = size * (centerX - x) + x;
        const posY = size * (centerY - y) + y;
        const scale = size;
        const opacityValue = opacity * fadeIn;

        return {
            transform: `translate(${posX}px, ${posY}px) scale(${scale})`,
            opacity: opacityValue,
            width: `${targetScale}px`,
            height: `${targetScale}px`,
            marginLeft: `${-targetScale / 2}px`,
            marginTop: `${-targetScale / 2}px`,
        };
    }

    componentDidMount () {
        this.didUpdate();
    }

    componentDidUpdate () {
        this.didUpdate();
    }

    scheduledTimeout = null;
    animation = null;
    didUpdate () {
        if (!this.node.current) return;
        clearTimeout(this.scheduledTimeout);
        const timeout = 1;
        const timeStep = 1 / 60;
        let doScheduleTimeout = true;
        let doScheduleFinish = false;

        // generate animation keyframes
        const keyframes = [];
        const startT = getNow() - this.props.lastSync;
        let dt = 0;

        for (; dt < timeout; dt += timeStep) {
            const t = startT + dt;

            const size = this.props.size.getValueAfter(t);
            const opacity = this.props.opacity.getValueAfter(t);
            const fadeIn = this.props.fadeIn.getValueAfter(t);

            const opacityVel = this.props.opacity.getVelocityAfter(t);

            const style = this.computeStyle(size, opacity, fadeIn);

            keyframes.push(style);

            const stopOpacity = Math.abs(this.props.opacity.target - opacity) + Math.abs(opacityVel) < this.props.opacity.tolerance;

            if (stopOpacity && this.props.opacity.target === 0) {
                doScheduleFinish = true;
                doScheduleTimeout = false;
                break;
            }
        }

        if (this.animation) {
            this.animation.cancel();
            this.animation = null;
        }
        this.animation = this.node.current.animate(keyframes, {
            duration: dt * 1000,
            easing: 'linear',
            fill: 'forwards',
        });
        this.animation.play();

        if (doScheduleTimeout) {
            this.animation.addEventListener('finish', () => {
                this.didUpdate();
            });
        } else if (doScheduleFinish) {
            this.animation.addEventListener('finish', () => {
                this.props.onFinish();
            });
        }
    }

    componentWillUnmount () {
        clearTimeout(this.scheduledTimeout);
    }

    render ({ size, opacity, fadeIn }) {
        return (
            <div
                ref={this.node}
                class="ink-single-ripple"
                style={this.computeStyle(size.value, opacity.value, fadeIn.value)} />
        );
    }
}