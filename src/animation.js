import EventEmitter from 'events';

// ensure requestAnimationFrame exists
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = window.webkitRequestAniationFrame
        || window.mozRequestAnimationFrame
        || (f => setTimeout(f, 16));
}

/// An animator manages an animation loop and dispatches update events to its registered objects
/// every frame.
class Animator {
    /// Update targets.
    targets = new Set();

    /// The current loop ID. Used to prevent multiple animation loops running simultaneously.
    currentLoopID = 0;

    /// True if the animation loop is running.
    running = false;

    ///
    /// The timestamp of the previous iteration of the animation loop. Used to calculate delta time.
    /// Will be set when the animation loop starts.
    prevTime = null;

    /// Global animation speed.
    animationSpeed = 1;

    /// Registers an object with the animator. This object must have a function member named
    /// `update`. That function will then be called with the elapsed time in seconds.
    register (target) {
        this.targets.add(target);
        this.start();
    }

    /// Deregisters an object. Does nothing if it was never registered.
    deregister (target) {
        this.targets.delete(target);
    }

    /// Starts the animation loop if it isn’t already running.
    /// Calling this function directly should generally be unnecessary.
    start () {
        if (this.running) return;
        this.running = true;
        this.currentLoopID++;
        this.prevTime = Date.now();
        this.animationLoop(this.currentLoopID);
    }

    /// Stops the animation loop.
    /// Calling this function directly should generally be unnecessary.
    stop () {
        this.running = false;
    }

    /// The animation loop function; should not be called directly.
    animationLoop (loopID) {
        // check if the loop should be running in the first place
        if (loopID != this.currentLoopID || !this.running) return;

        // if no targets are present, stop
        if (!this.targets.size) {
            this.stop();
            return;
        }

        // schedule the next loop iteration
        window.requestAnimationFrame(() => this.animationLoop(loopID));

        // dispatch
        const now = Date.now();
        const deltaTime = (now - this.prevTime) / 1000 * this.animationSpeed;
        this.prevTime = now;

        for (const target of this.targets) {
            target.update(deltaTime);
        }
    }
}

/// The global animator.
export const globalAnimator = new Animator();

window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // suspend animations when the tab is no longer visible
        globalAnimator.stop();
    } else {
        globalAnimator.start();
    }
});

/// The longest time interval allowed for the spring equations—this is small so the spring
/// doesn’t become unstable.
const MAX_SPRING_TIME_INTERVAL = 1 / 60;

/// Simulates spring physics.
///
/// Will use the global animator.
///
/// # Events
/// - `update`(value: number): Fired every time the spring is updated by the global animator
export class Spring extends EventEmitter {
    /// The current value (or position).
    value = 0;

    /// The current spring velocity.
    velocity = 0;

    /// The target value. If null, no force will be applied, meaning the spring will just slowly
    /// decelerate due to damping.
    target = null;

    /// Force coefficient.
    force = 0;

    /// Damping coefficient.
    damping = 0;

    /// Tolerance below which the spring will be considered stationary.
    tolerance = 1 / 1000;

    /// If true, the spring will stop animating automatically once it’s done (also see tolerance).
    stopAutomatically = true;

    /// If true, the spring won’t move but will still fire update events.
    /// Useful e.g. when the user is dragging something controlled by a spring.
    locked = false;

    /// Creates a new spring.
    constructor (dampingRatio, period, initial) {
        super();

        this.setDampingRatioAndPeriod(dampingRatio, period);
        if (initial) this.value = this.target = initial;
    }

    /// Sets the damping ratio and the period.
    setDampingRatioAndPeriod (dampingRatio, period) {
        const forceSqrt = 2 * Math.PI / period;
        const damping = dampingRatio * (2 * forceSqrt);

        this.force = forceSqrt * forceSqrt;
        this.damping = damping;
    }

    /// Updates the spring.
    ///
    /// Will emit an 'update' event with the current value.
    update (elapsed) {
        let timeLeft = Math.min(elapsed, 1); // simulate at most an entire second at once
        if (this.locked) timeLeft = 0; // don’t update if the spring is locked
        while (timeLeft > 0) {
            const dt = Math.min(timeLeft, MAX_SPRING_TIME_INTERVAL);
            const force = this.currentForce();
            this.value += this.velocity * dt;
            this.velocity += force * dt;
            timeLeft -= dt;
        }

        if (this.stopAutomatically && !this.wantsUpdate()) {
            this.finish();
            this.stop();
        }

        this.emit('update', this.value);
    }

    /// Returns true if the spring should not be considered stopped.
    wantsUpdate () {
        return Math.abs(this.value - this.target) + Math.abs(this.velocity) > this.tolerance;
    }

    /// Starts the spring by registering it in the global animator.
    start () {
        globalAnimator.register(this);
    }

    /// Stops the spring by deregistering it in the global animator.
    stop () {
        globalAnimator.deregister(this);
    }

    /// Will finish the animation by immediately jumping to the end and emitting an `update`.
    finish () {
        if (this.target === null) return;
        this.value = this.target;
        this.velocity = 0;
        this.emit('update', this.value);
        this.stop();
    }

    /// Returns the current force.
    currentForce () {
        if (this.target !== null) {
            return -this.force * (this.value - this.target) - this.damping * this.velocity;
        } else {
            return -this.damping * this.velocity;
        }
    }

    /// Returns the damping ratio.
    getDampingRatio () {
        return this.damping / (2 * Math.sqrt(this.force));
    }

    /// Returns the period.
    getPeriod () {
        return 2 * Math.PI / Math.sqrt(this.force);
    }

    /// Sets the period.
    setPeriod (period) {
        const dampingRatio = this.getDampingRatio();
        this.setDampingRatioAndPeriod(dampingRatio, period);
    }

    /// Sets the damping ratio.
    setDampingRatio (dampingRatio) {
        const period = this.getPeriod();
        this.setDampingRatioAndPeriod(dampingRatio, period);
    }
}

/// Linearly interpolates between a and b using t.
export function lerp (a, b, t) {
    return t * (b - a) + a;
}

/// Clamps a value to the interval between l and h.
export function clamp (x, l, h) {
    return Math.max(l, Math.min(x, h));
}
