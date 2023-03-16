import { createRef } from 'preact';
import EventEmitter from 'events';
import { getNow } from './animation';

/**
 * Handles animation of an element using the Web Animations API.
 *
 * First, set the `node` property to a node ref to the node that should be animated.
 * You can also pass an array of refs, in which case computeStyles must also return an array.
 * A number of input animation objects (usually [RtSpring]s) will be passed to a computeStyles
 * callback to generate keyframes. Use setInputs anytime updates might have happened
 * (e.g. in the render function).
 */
export class ElementAnimationController extends EventEmitter {
    node = createRef();

    /** Number of seconds to generate keyframes for in advance */
    keyframeGenerationInterval = 1;
    /** Time-step between each keyframe */
    keyframeTimeStep = 1 / 60;

    constructor (computeStyles, nodeRef) {
        super();
        this.computeStyles = computeStyles;
        if (nodeRef) this.node = nodeRef;
    }

    // Map<Object, lastResetTimestamp (number)>
    #currentInputs = new Map();
    #lastInputsObject = null;
    #needsUpdate = false;
    /**
     * Sets inputs. `inputs` can be any sort of associative object or array.
     * Its shape will be passed on to computeStyles.
     */
    setInputs (inputs) {
        let needsResolve = this.#needsUpdate;
        this.#needsUpdate = false;

        // determine whether we need to resolve the animation again.
        // we keep track of changes using the lastReset property
        const newInputs = new Set();
        for (const k in inputs) {
            if (!inputs.hasOwnProperty(k)) continue;
            const item = inputs[k];
            newInputs.add(item);
            if (this.#currentInputs.has(item)) {
                const currentReset = this.#currentInputs.get(item);
                if (item.lastReset !== currentReset) {
                    needsResolve = true;
                }
            } else {
                this.#currentInputs.set(item, item.lastReset);
                needsResolve = true;
            }
        }
        for (const item of this.#currentInputs) {
            if (!newInputs.has(item)) {
                // removed. we don't really need a resolve for this though
                this.#currentInputs.delete(item);
            }
        }

        this.#lastInputsObject = inputs;
        if (needsResolve) this.resolve();
    }

    setNeedsUpdate () {
        this.#needsUpdate = true;
    }

    didMount () {
        // so that any update will trigger a resolve
        this.setNeedsUpdate();
        // resolve now also
        this.resolve();
    }

    doComputeStyles (time) {
        const inputs = Array.isArray(this.#lastInputsObject)
            ? [...this.#lastInputsObject]
            : { ...this.#lastInputsObject };

        for (const k in inputs) {
            if (!inputs.hasOwnProperty(k)) continue;
            inputs[k] = inputs[k].getValue(time);
        }

        return this.computeStyles(inputs, time);
    }

    getCurrentStyles () {
        return this.doComputeStyles(getNow());
    }

    animations = [];
    resolve () {
        if (this.dropped) return;
        const nodes = (Array.isArray(this.node)
            ? this.node.map(item => item.current)
            : [this.node.current])
            .filter(x => x);
        if (!nodes.length) return;
        let scheduleRefresh = true;

        const now = getNow();
        const keyframes = [];
        let dt = 0;
        for (; dt < this.keyframeGenerationInterval; dt += this.keyframeTimeStep) {
            const t = now + dt;

            const styles = this.doComputeStyles(t);
            if (Array.isArray(styles)) {
                keyframes.push(styles);
            } else {
                keyframes.push([styles]);
            }

            let shouldStop = true;
            for (const input of this.#currentInputs.keys()) {
                if (!input.shouldStop(t)) {
                    shouldStop = false;
                    break;
                }
            }

            if (shouldStop) {
                scheduleRefresh = false;
                break;
            }
        }

        for (const anim of this.animations) anim.cancel();
        this.animations = nodes.map((node, i) => node.animate(keyframes.map(x => x[i]), {
            duration: dt * 1000,
            easing: 'linear',
            fill: 'forwards',
        }));
        this.emit('resolve', this.animations);

        if (scheduleRefresh) {
            this.animations[0].addEventListener('finish', () => {
                if (this.dropped) return;
                this.resolve();
            });
        } else {
            this.animations[0].addEventListener('finish', () => {
                if (this.dropped) return;
                this.emit('finish');
            });
        }
    }

    /** call this inside componentWillUnmount to clean up timers */
    drop () {
        for (const anim of this.animations) anim.cancel();
        this.dropped = true;
    }
}