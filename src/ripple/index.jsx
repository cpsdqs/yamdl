import { createRef, h } from 'preact';
import { PureComponent } from 'preact/compat';
import { RtSpring } from '../animation';
import './style.less';
import { ElementAnimationController } from 'yamdl/element-animation';

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

        focused: false,
    };

    resizeObserver = new ResizeObserver(() => {
        this.updateParameters();
        this.forceUpdate();
    });

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
        this.setState({ focused: true });
    };

    onBlur = () => {
        this.setState({ focused: false });
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
            sizeSpring: new RtSpring({ period: RIPPLE_HOLD_DURATION, target: 1 }),
            opacitySpring: new RtSpring({ period: RIPPLE_HOLD_DURATION, value: 1, target: 0.3 }),
            fadeInSpring: new RtSpring({ period: RIPPLE_FADE_IN_DURATION, target: 1 }),
        };

        if (size > 1) {
            const { targetScale } = this.getParameters();
            ripple.sizeSpring.setValue(size / targetScale);
            ripple.fadeInSpring.setValue(0);
        } else {
            ripple.fadeInSpring.setValue(1);
        }

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

            ripple.sizeSpring.setPeriod(RIPPLE_DURATION);
            ripple.opacitySpring.setPeriod(RIPPLE_DURATION);
            ripple.opacitySpring.setTarget(0);

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

    render () {
        const ripples = [];

        if (!this.memoizedParameters) this.updateParameters();
        let centerX = this.memoizedParameters?.centerX || 0;
        let centerY = this.memoizedParameters?.centerY || 0;
        let targetScale = this.memoizedParameters?.targetScale || 0;

        for (const ripple of this.state.ripples) {
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

        return (
            <div class="ink-ripple" ref={this.node}>
                <RippleHighlight
                    key="highlight"
                    focused={this.state.focused}
                    ripples={this.state.ripples} />
                {ripples}
            </div>
        );
    }
}

class RippleHighlight extends PureComponent {
    node = createRef();
    focusSpring = new RtSpring();
    animCtrl = new ElementAnimationController((_, time) => {
        let maxHighlight = this.focusSpring.getValue(time);

        for (const ripple of this.props.ripples) {
            const rippleHighlight = 1 - 4 * Math.abs(ripple.sizeSpring.getValue(time) - 0.5) ** 2;
            const fadeIn = ripple.fadeInSpring.getValue(time);
            maxHighlight = Math.max(rippleHighlight * fadeIn, maxHighlight);
        }

        return { opacity: maxHighlight };
    }, this.node);

    componentDidMount () {
        this.animCtrl.didMount();
    }

    componentWillUnmount () {
        this.animCtrl.drop();
    }

    render ({ focused, ripples }) {
        this.focusSpring.setTarget(focused ? 1 : 0);
        this.animCtrl.setInputs([this.focusSpring]
            .concat(ripples.map(ripple => ripple.sizeSpring))
            .concat(ripples.map(ripple => ripple.fadeInSpring)));

        return (
            <div
                ref={this.node}
                data-focused={focused}
                class="ink-ripple-highlight"
                style={this.animCtrl.getCurrentStyles()} />
        );
    }
}

class SingleRipple extends PureComponent {
    node = createRef();
    animCtrl = new ElementAnimationController(({ size, opacity, fadeIn }) => {
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
    }, this.node);

    componentDidMount () {
        this.animCtrl.didMount();
        this.animCtrl.on('finish', () => this.props.onFinish());
    }

    componentWillUnmount () {
        this.animCtrl.drop();
    }

    render ({ size, opacity, fadeIn }) {
        this.animCtrl.setInputs({ size, opacity, fadeIn });

        return (
            <div
                ref={this.node}
                class="ink-single-ripple"
                style={this.animCtrl.getCurrentStyles()} />
        );
    }
}