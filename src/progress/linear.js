import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Spring, globalAnimator } from '../animation';

/// A linear progress indicator.
///
/// # Props
/// - `progress`: progress value
/// - `indeterminate`: will be indeterminate if true
/// - `hideIfNone`: if true, will hide itself when indeterminate is false and progress is zero
export default class LinearProgress extends PureComponent {
    componentWillMount () {
        globalAnimator.register(this);
        this.isMounted = true;

        this.indeterminate = this.props.indeterminate;
        this.spans = [new Span(this.indeterminate, 0, this.props.progress)];
        this.nextVariant = 1;
    }

    componentDidUpdate (prevProps) {
        if (this.props.indeterminate || prevProps.progress !== this.props.progress) {
            globalAnimator.register(this);
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
        this.isMounted = false;
    }

    // linear progress spans, see below
    spans = [];

    // indeterminate state as far as animation is concerned
    indeterminate = true;

    update (dt) {
        let wantsUpdate = false;

        if (!this.spans.length) this.spans.push(new Span(this.indeterminate, 0, this.props.progress));

        for (const span of this.spans) span.update(dt);

        if (this.indeterminate) {
            const lastSpan = this.spans[this.spans.length - 1];

            if (lastSpan.emitNext) {
                if (!this.props.indeterminate) {
                    this.indeterminate = false;
                    // next span is determinate
                    this.spans.push(new Span(false));
                } else {
                    this.spans.push(new Span(true, this.nextVariant));
                    this.nextVariant = this.nextVariant === 1 ? 0 : 1;
                }
            }

            wantsUpdate = true;
        }

        if (!this.indeterminate) {
            const lastSpan = this.spans[this.spans.length - 1];
            if (!lastSpan.doNotUse) {
                lastSpan.start.target = 0;
                lastSpan.end.target = +this.props.progress || 0;
            } else if (!this.props.indeterminate) {
                this.spans.push(new Span(false));
            }

            wantsUpdate = lastSpan.start.wantsUpdate() || lastSpan.end.wantsUpdate();
            if (this.spans.length > 1) wantsUpdate = true;

            if (this.props.indeterminate) {
                lastSpan.end.target = 1.5;
                lastSpan.start.target = 1;
                lastSpan.end.setPeriod(1);
                lastSpan.start.setPeriod(1);
                this.indeterminate = lastSpan.start.value > 0.9;
                lastSpan.emitNext = true;
                lastSpan.doNotUse = true;
                wantsUpdate = true;
            }
        }

        // delete dead spans
        const marked = [];
        for (let i = this.spans.length - 1; i >= 0; i--) {
            if (this.spans[i].isDead) marked.push(i);
        }
        for (const i of marked) this.spans.splice(i, 1);

        if (!wantsUpdate) globalAnimator.deregister(this);
        if (this.isMounted) this.forceUpdate();
    }

    render () {
        const props = { ...this.props };
        delete props.indeterminate;
        delete props.progress;
        delete props.hideIfNone;

        props.class = (props.class || '') + ' ink-linear-progress-indicator';

        if (this.props.hideIfNone && !this.props.indeterminate && !this.indeterminate
            && !this.props.progress) {
            props.class += ' hide-none';
        }

        const spans = this.spans.map(span => span.render());

        return (
            <span {...props}>
                <span class="p-background" />
                {spans}
            </span>
        );
    }
}

/// A single “span” of the linear progress indicator--when determinate, this is just the
/// colored bar indicating progress.
/// When indeterminate, this is each of the lines that animate.
///
/// There are two variants of indeterminate curves: the one that speeds up (0) and the one that
/// slows down (1).
class Span {
    start = new Spring(1, 0.5);
    end = new Spring(1, 0.5);
    time = 0;

    constructor (indeterminate, variant = 0, progress) {
        this.indeterminate = indeterminate;
        this.variant = variant;

        if (!indeterminate && progress) {
            this.end.value = this.end.target = progress;
        }
    }

    /// This span should be removed if true. Will be set by update.
    isDead = false;

    /// If true, the next indeterminate span should be emitted.
    emitNext = false;

    update (dt) {
        if (this.indeterminate) {
            // Indeterminate: animate start and end on preset curves.
            this.time += dt;

            if (this.variant === 0) {
                // end moves linearly from left to right over one second
                this.end.value = this.time;
                // this is just a guess; start moves quadratically, offset by 1/2?
                this.start.value = Math.max(0, this.time - 0.5) ** 2;

                // derivatives
                this.end.velocity = 1;
                this.start.velocity = this.time < 0.5 ? 0 : 2 * this.time - 1;

                this.emitNext = this.time >= 1.3;
            } else if (this.variant === 1) {
                // end looks like it slows down quadratically
                this.end.value = (1 - (1 - this.time) ** 2) * 1.2;
                if (this.time > 1) this.end.value = 1;
                // start might be cubic
                this.start.value = 1 - (1.5 - this.time) ** 3;

                // derivatives
                this.end.velocity = 2.4 - 2.4 * this.time;
                this.start.velocity = (Math.sqrt(3) * (this.time - 1.5)) ** 2;

                this.emitNext = this.time >= 1.1;
            }

            this.isDead = this.start.value >= 1;
        } else {
            // Determinate: use the springs.
            this.start.update(dt);
            this.end.update(dt);

            this.isDead = this.emitNext && this.start.value >= 1;
        }
    }

    render () {
        const scale = this.end.value - this.start.value;
        const style = {
            transform: `translateX(${this.start.value * 100}%) scaleX(${scale})`,
        };
        return <span class="p-span" style={style} />;
    }
}
