import { h, Component } from 'preact';
import { Spring, globalAnimator } from '../animation';
import './style';

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
export default class Ripple extends Component {
    state = {
        /// List of current ripples.
        ripples: [],

        /// The ID of the current ripple. Used to identify which ripple to modify when the
        /// pointer is released.
        currentRippleID: null,
    };

    hoverSpring = new Spring(1, 0.3);
    focusSpring = new Spring(1, 0.3);

    /// The DOM node.
    node = null;

    /// Base highlight opacity;
    highlightOpacity = 1;

    update (dt) {
        for (const ripple of this.state.ripples) {
            ripple.sizeSpring.update(dt);
            ripple.opacitySpring.update(dt);
            ripple.fadeInSpring.update(dt);
        }

        const indicesToRemove = [];
        for (let i = 0; i < this.state.ripples.length; i++) {
            if (!this.state.ripples[i].sizeSpring.wantsUpdate()) {
                indicesToRemove.push(i);
            }
        }

        if (indicesToRemove.length) {
            const ripples = this.state.ripples.slice();
            let offset = 0;
            for (const index of indicesToRemove) {
                ripples.splice(index + offset, 1);
                offset--;
            }
            this.setState({ ripples });
        }

        this.focusSpring.update(dt);

        if (!this.state.ripples.length && !this.focusSpring.wantsUpdate()) {
            globalAnimator.deregister(this);
        }

        this.forceUpdate();
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    onPointerDown = e => {
        if (e.defaultPrevented) return;
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
        this.updateHighlightOpacity();
        this.focusSpring.target = 1;
        globalAnimator.register(this);
    };

    onBlur = () => {
        this.focusSpring.target = 0;
        globalAnimator.register(this);
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

    updateHighlightOpacity () {
        this.highlightOpacity = getComputedStyle(this.node)
            .getPropertyValue('--md-ripple-highlight-opacity');
    }

    onDown (clientX, clientY, size) {
        const nodeRect = this.node.getBoundingClientRect();
        this.updateHighlightOpacity();

        const offsetX = clientX !== undefined ? clientX - nodeRect.left : nodeRect.width / 2;
        const offsetY = clientY !== undefined ? clientY - nodeRect.top : nodeRect.height / 2;

        const ripples = this.state.ripples.slice();
        const ripple = {
            id: Math.random(),
            x: offsetX,
            y: offsetY,
            sizeSpring: new Spring(1, RIPPLE_HOLD_DURATION),
            opacitySpring: new Spring(1, RIPPLE_HOLD_DURATION),
            fadeInSpring: new Spring(1, RIPPLE_FADE_IN_DURATION),
        };

        if (size > 1) {
            const { targetScale } = this._getParameters();
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
        }, () => globalAnimator.register(this));
    }

    onUp () {
        let currentRippleIndex = null;
        for (let i = 0; i < this.state.ripples.length; i++) {
            if (this.state.ripples[i].id === this.state.currentRippleID) {
                currentRippleIndex = i;
            }
        }

        if (currentRippleIndex != null) {
            const ripples = this.state.ripples.slice();
            ripples[currentRippleIndex].sizeSpring.setPeriod(RIPPLE_DURATION);
            ripples[currentRippleIndex].opacitySpring.target = 0;
            ripples[currentRippleIndex].opacitySpring.setPeriod(RIPPLE_DURATION);

            this.setState({
                currentRippleID: null,
                ripples,
            });
        } else {
            this.setState({ currentRippleID: null });
        }
    }

    _getParameters () {
        const nodeRect = this.node ? this.node.getBoundingClientRect() : null;
        const centerX = nodeRect ? nodeRect.width / 2 : 0;
        const centerY = nodeRect ? nodeRect.height / 2 : 0;
        const targetScale = nodeRect
            ? this.props.circle
                ? Math.max(nodeRect.width, nodeRect.height)
                : Math.hypot(nodeRect.width, nodeRect.height)
            : 0;
        return { centerX, centerY, targetScale };
    }

    render () {
        let highlight = null;
        const ripples = [];

        const { centerX, centerY, targetScale } = this._getParameters();

        let maxHighlight = this.focusSpring.value;

        for (const ripple of this.state.ripples) {
            const sizeProgress = ripple.sizeSpring.value;
            const posX = sizeProgress * (centerX - ripple.x) + ripple.x;
            const posY = sizeProgress * (centerY - ripple.y) + ripple.y;
            const scale = sizeProgress;
            const opacity = ripple.opacitySpring.value * ripple.fadeInSpring.value;

            const rippleHighlight = 1 - 4 * Math.abs(sizeProgress - 0.5) ** 2;
            maxHighlight = Math.max(rippleHighlight * ripple.fadeInSpring.value, maxHighlight);

            ripples.push(
                <div
                    key={ripple.id}
                    class="ink-single-ripple"
                    style={{
                        transform: `translate(${posX}px, ${posY}px) scale(${scale})`,
                        opacity,
                        width: `${targetScale}px`,
                        height: `${targetScale}px`,
                        marginLeft: `${-targetScale / 2}px`,
                        marginTop: `${-targetScale / 2}px`,
                    }}>
                </div>
            );
        }

        if (maxHighlight) {
            highlight = <div
                class="ink-ripple-highlight"
                style={{ opacity: maxHighlight * this.highlightOpacity }} />;
        }

        return (
            <div class="ink-ripple" ref={node => this.node = node}>
                {ripples}
                {highlight}
            </div>
        );
    }
}
