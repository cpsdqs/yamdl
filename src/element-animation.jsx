import { createRef } from 'preact';
import EventEmitter from 'events';
import { getNow } from './animation';

/**
 * Handles animation of an element using the Web Animations API.
 *
 * First, set the `node` property to a node ref to the node that should be animated.
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
    /**
     * Sets inputs. `inputs` can be any sort of associative object or array.
     * Its shape will be passed on to computeStyles.
     */
    setInputs (inputs) {
        let needsResolve = false;

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

    animation = null;
    resolve () {
        const node = this.node.current;
        if (!node) return;
        let scheduleRefresh = true;

        const now = getNow();
        const keyframes = [];
        let dt = 0;
        for (; dt < this.keyframeGenerationInterval; dt += this.keyframeTimeStep) {
            const t = now + dt;

            keyframes.push(this.doComputeStyles(t));

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

        this.animation?.cancel();
        this.animation = node.animate(keyframes, {
            duration: dt * 1000,
            easing: 'linear',
            fill: 'forwards',
        });
        this.emit('resolve', this.animation);

        if (scheduleRefresh) {
            this.animation.addEventListener('finish', () => {
                this.resolve();
            });
        } else {
            this.animation.addEventListener('finish', () => {
                this.emit('finish');
            });
        }
    }

    /** call this inside componentWillUnmount to clean up timers */
    drop () {
        this.animation?.cancel();
    }
}