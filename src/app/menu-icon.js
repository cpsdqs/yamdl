import { h, Component } from 'preact';
import { Spring, lerp, globalAnimator } from '../animation';
import './menu-icon.less';

const triLerp = (a, b, c, bp, cp) => lerp(lerp(a, b, bp), c, cp);

const positions = {
    menu: {
        a: {
            x: 3,
            y: 6,
            w: 18,
            r: 0,
        },
        b: {
            x: 3,
            y: 11,
            w: 18,
            r: 0,
        },
        c: {
            x: 3,
            y: 16,
            w: 18,
            r: 0,
        },
    },
    back: {
        a: {
            x: 12,
            y: 4,
            w: Math.hypot(8, 8),
            r: 45,
        },
        b: {
            x: 4,
            y: 11,
            w: 15,
            r: 0,
        },
        c: {
            // “top left” corner calculated by taking the “bottom left” corner and going up
            // by 2 (rotated)
            x: 12 + Math.cos(Math.PI * 3 / 4) * 2,
            y: 20 - Math.sin(Math.PI * 3 / 4) * 2,
            w: Math.hypot(8, 8),
            r: -45,
        },
    },
    close: {
        a: {
            x: 12 + Math.cos(Math.PI * 3 / 4) * 9 + Math.cos(Math.PI / 4),
            y: 12 - Math.sin(Math.PI * 3 / 4) * 9 - Math.sin(Math.PI / 4),
            w: 18,
            r: 45,
        },
        b: {
            // overcompensate with negative width to make it disappear halfway through the animation
            x: 12 + 6 / 2,
            y: 11,
            w: -6,
            r: 0,
        },
        c: {
            x: 12 + Math.cos(Math.PI * 5 / 4) * 9 + Math.cos(Math.PI * 3 / 4),
            y: 12 - Math.sin(Math.PI * 5 / 4) * 9 - Math.sin(Math.PI * 3 / 4),
            w: 18,
            r: -45,
        },
    },
};

/// Renders the menu icon, which can be one of three things:
///
/// - a hamburger
/// - an X
/// - a back arrow
///
/// # Props
/// - `type`: one of the following:
///    - a string: `close` or `back`, for automatic animation
///    - an object like `{ close: 0, back: 0 }` indicating with a number from 0 to 1 which type to
///      show (or interpolate between).
///      To avoid strange behavior, the sum of the components should be about 1.
export default class MenuIcon extends Component {
    close = new Spring(1, 0.5);
    back = new Spring(1, 0.5);
    rotateOut = false;

    update (dt) {
        this.back.update(dt);
        this.close.update(dt);
        this.forceUpdate();

        if (!this.back.wantsUpdate() && !this.close.wantsUpdate()) {
            globalAnimator.deregister(this);
        }
    }

    componentWillMount () {
        this.updateSpringTargets();
        this.back.value = this.back.target;
        this.close.value = this.close.target;
    }

    componentDidUpdate (prevProps) {
        if (prevProps.type !== this.props.type) {
            if (this.back.wantsUpdate() || this.close.wantsUpdate()) {
                globalAnimator.register(this);
            }
        }
    }

    updateSpringTargets () {
        this.back.target = this.close.target = 0;
        if (this.props.type === 'back') this.back.target = 1;
        else if (this.props.type === 'close') this.close.target = 1;
        else if (typeof this.props.type === 'object' && this.props.type !== null) {
            this.back.target = this.back.value = this.props.type.back;
            this.close.target = this.close.value = this.props.type.close;
        }
    }

    render (props) {
        props = { ...props };
        props.class = (props.class || '') + ' ink-menu-icon';

        this.updateSpringTargets();

        delete props.type;

        let rotation = (this.back.value + this.close.value) / 2;
        if (this.rotateOut) rotation = -rotation;

        if (this.rotateOut && Math.abs(rotation) < 0.001) {
            this.rotateOut = false;
        } else if (!this.rotateOut && Math.abs(rotation - 0.5) < 0.001) {
            this.rotateOut = true;
        }

        const styles = ['a', 'b', 'c'].map(key => {
            const props = { x: 0, y: 0, w: 0, r: 0 };
            for (const prop of ['x', 'y', 'w', 'r']) {
                props[prop] = triLerp(
                    positions.menu[key][prop],
                    positions.back[key][prop],
                    positions.close[key][prop],
                    this.back.value,
                    this.close.value,
                );
            }
            return props;
        }).map(p => ({
            transform: `translate(${p.x}px, ${p.y}px)`
                + ` rotate(${p.r}deg)`
                + ` scaleX(${Math.max(0, p.w) / 24})`,
        }));

        return (
            <span {...props}>
                <span class="p-inner" style={{
                    transform: `rotate(${rotation * 360}deg)`,
                }}>
                    <span class="p-line p-line-a" style={styles[0]} />
                    <span class="p-line p-line-b" style={styles[1]} />
                    <span class="p-line p-line-c" style={styles[2]} />
                </span>
            </span>
        );
    }
}
