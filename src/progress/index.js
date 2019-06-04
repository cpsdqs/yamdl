import { h, Component } from 'preact';
import { Spring, globalAnimator, lerp } from '../animation';
import './style';

/// Circle radius for the progress indicator.
const CIRCLE_RADIUS = 16;

/// Circle radius for the small progress indicator.
const CIRCLE_RADIUS_SMALL = 8;

/// Size of the circular progress indicator.
const CIRCULAR_PROGRESS_SIZE = 48;

/// Size of the small circular progress indicator.
const CIRCULAR_PROGRESS_SIZE_SMALL = 24;

/// The size of the small arc phase of the indeterminate circular progress indicator.
const SMALL_ARC_SIZE = Math.PI / 12;

/// The size of the large arc phase of the indeterminate circular progress indicator.
const LARGE_ARC_SIZE = Math.PI * 3 / 2;

/// The “speed” of the error function as used by the indeterminate circular progress indicator.
const ERF_TIME_SCALE = 7.3;

/// Approximation of the error function
/// from https://stackoverflow.com/questions/457408/#answer-457805
const erf = x => {
    // save the sign of x
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    // constants
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    // A&S formula 7.1.26
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1)
        * t * Math.exp(-x * x);
    return sign * y;
};

const modTau = x => ((x % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

///
/// The following code is responsible the growing-and-shrinking spinning effect that the
/// indeterminate progress bar has, by using overcomplicated math:
/// To attain the “one side moves while the other stays still” behavior, the integral of a
/// gaussian function is taken, resulting in the error function. Then the plot of the two
/// ends looks something like this:
///  ^ progress
///  |
///  1          .-'''''.-''''
///  |         /      /
///  0- - - - / - - -/- - - 1 -------> stageProgress
///  |       /      /
/// -1 ....-'.....-'
///  |
/// These values are then interpolated over stageProgress, resulting in a small arc phase
/// at the beginning angle, a large arc phase, and then a small arc phase now offset by
/// LARGE_ARC_SIZE.
/// Because the beginning and end angles aren’t the same, the offset is incremented above
/// and added as sweepOffset after.
/// And finally, rotation is added to the sweepOffset such that the whole thing moves the
/// entire time.
///
function sweepAnglesForStageProgress (stageProgress) {
    const endProgress = erf((stageProgress - 0.25) * ERF_TIME_SCALE);
    const startProgress = erf((stageProgress - 0.75) * ERF_TIME_SCALE);

    const sweepStart = LARGE_ARC_SIZE / 2 * startProgress - SMALL_ARC_SIZE / 2;
    const sweepEnd = LARGE_ARC_SIZE / 2 * endProgress + SMALL_ARC_SIZE / 2;

    return [sweepStart, sweepEnd];
}

/// A material circular progress indicator. Can be determinate or indeterminate.
///
/// # Props
/// - `progress`: progress value
/// - `indeterminate`: will render as indeterminate progress if true
/// - `small`: will be 24px instead of 48px in size
export class CircularProgress extends Component {
    start = new Spring(1, 0.5, 0);
    end = new Spring(1, 0.5, (this.props.progress || 0) * 2 * Math.PI);
    indeterminate = new Spring(1, 0.5, this.props.indeterminate ? 1 : 0);

    componentWillMount () {
        globalAnimator.register(this);
    }

    indeterminateState = this.props.indeterminate;
    indeterminateTime = 3;

    update (dt) {
        this.start.target = 0;
        this.end.target = (this.props.progress || 0) * 2 * Math.PI;

        if (this.indeterminateState !== this.props.indeterminate) {

            if (this.props.indeterminate) {
                this.indeterminateState = true;
                this.indeterminateTime = 0.5;
                if (typeof this.props.progress !== 'number') {
                    this.indeterminateTime = 3;
                }
            } else if (typeof this.props.progress === 'number') {
                const [pStartAngle, pEndAngle] = this.getIndeterminateAngles();

                const pAngle = modTau(pEndAngle - pStartAngle);
                const progressAngle = modTau(this.end.target - this.start.target);
                const shrinking = this.indeterminateTime % 1 > 0.5;

                const matchingStart = pStartAngle > Math.PI || pStartAngle < 0;

                const congruentMotion = pAngle >= progressAngle && shrinking
                    || pAngle <= progressAngle && !shrinking;

                if (matchingStart && congruentMotion) {
                    this.indeterminateState = false;
                    this.indeterminate.value = 0;
                    const xdt = Math.max(dt, 1 / 144);
                    this.indeterminateTime += dt / 4 * 3;
                    const [iStartAngle, iEndAngle] = this.getIndeterminateAngles();
                    this.start.value = modTau(iStartAngle);
                    this.end.value = this.start.value + (iEndAngle - iStartAngle);
                    this.start.velocity = (iStartAngle - pStartAngle) / dt;
                    this.end.velocity = (iEndAngle - pEndAngle) / dt;
                    this.start.value -= 2 * Math.PI;
                    this.end.value -= 2 * Math.PI;
                }
            } else {
                this.indeterminateState = false;
            }
        }


        this.indeterminate.target = this.indeterminateState ? 1 : 0;
        if (this.indeterminateState || typeof this.props.progress !== 'number') {
            this.indeterminateTime += dt / 4 * 3;
            while (this.indeterminateTime > 4) this.indeterminateTime -= 4;
        }
        this.start.update(dt);
        this.end.update(dt);
        this.indeterminate.update(dt);

        if (!this.start.wantsUpdate()
            && !this.end.wantsUpdate()
            && !this.indeterminate.wantsUpdate()
            && !this.props.indeterminate
            && (this.props.indeterminate === this.indeterminateState)) {
            globalAnimator.deregister(this);
        }
        this.forceUpdate();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.indeterminate !== this.props.indeterminate
            || prevProps.progress !== this.props.progress) {
            globalAnimator.register(this);
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    getIndeterminateAngles () {
        const [iStartAngle, iEndAngle] = sweepAnglesForStageProgress(this.indeterminateTime % 1);
        const iPhase = -Math.floor(this.indeterminateTime) / 2 * Math.PI;
        const iRotation = (this.indeterminateTime % 1) * 2 * Math.PI;

        const iNetStartAngle = iRotation + iPhase + iStartAngle;
        const iNetEndAngle = iRotation + iPhase + iEndAngle;
        return [iNetStartAngle, iNetEndAngle];
    }

    /// Returns SVG path data for a clockwise arc that begins at sweepStart and ends at sweepEnd.
    getPathForArcAngles (sweepStart, sweepEnd, circle) {
        const radius = this.props.small ? CIRCLE_RADIUS_SMALL : CIRCLE_RADIUS;
        const halfSize = (this.props.small
            ? CIRCULAR_PROGRESS_SIZE_SMALL : CIRCULAR_PROGRESS_SIZE) / 2;

        const startX = halfSize + Math.cos(sweepStart) * radius;
        const startY = halfSize + Math.sin(sweepStart) * radius;
        const endX = halfSize + Math.cos(sweepEnd) * radius;
        const endY = halfSize + Math.sin(sweepEnd) * radius;

        const largeArcFlag = sweepEnd > sweepStart + Math.PI ? '1' : '0';

        if (circle && Math.abs(endX - startX) + Math.abs(endY - startY) < 0.001) {
            return [
                `M ${halfSize - radius} ${halfSize}`,
                `A ${radius} ${radius} 0 1 1 ${halfSize + radius} ${halfSize}`,
                `A ${radius} ${radius} 0 1 1 ${halfSize - radius} ${halfSize}`,
            ].join(' ');
        } else {
            return [
                `M ${startX} ${startY}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            ].join(' ');
        }
    }

    render () {
        const props = {...this.props};
        delete props.indeterminate;
        delete props.progress;
        delete props.small;

        props.class = (props.class || '') + ' paper-circular-progress-indicator';
        if (this.props.small) props.class += ' small';
        if (this.props.indeterminate) props.class += ' indeterminate';

        const [iNetStartAngle, iNetEndAngle] = this.getIndeterminateAngles();

        let startAngle, endAngle;
        if (typeof this.props.progress !== 'number') {
            startAngle = lerp(iNetEndAngle, iNetStartAngle, this.indeterminate.value);
            endAngle = iNetEndAngle;
        } else {
            startAngle = lerp(this.start.value, iNetStartAngle, this.indeterminate.value);
            endAngle = lerp(this.end.value, iNetEndAngle, this.indeterminate.value);
        }

        return (
            <span {...props}>
                <svg class="p-inner">
                    <path
                        class="p-path"
                        d={this.getPathForArcAngles(
                            startAngle - Math.PI / 2,
                            endAngle - Math.PI / 2,
                            this.end.value > 1,
                        )} />
                </svg>
            </span>
        );
    }
}
