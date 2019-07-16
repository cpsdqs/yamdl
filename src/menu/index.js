import { h, Component } from 'preact';
import { createPortal } from 'preact/compat';
import { Spring, globalAnimator } from '../animation';
import './style';

/// A context menu.
///
/// # Props
/// - `open`: if true, will display context menu
/// - `onClose`: called when the menu is dismissed
/// - `container`: optional DOM node of the container. `<body>` by default
/// - `position`: tuple of two elements; sets the top left position of the menu on screen.
///   Shortcut to `style.transform = translate(x, y)`
/// - `anchor`: shortcut to setting `style.transformOrigin`
export default class Menu extends Component {
    openness = new Spring(1, 0.3);

    update (dt) {
        this.openness.target = this.props.open ? 1 : 0;
        this.openness.update(dt);

        if (!this.openness.wantsUpdate()) {
            globalAnimator.deregister(this);
        }
        this.forceUpdate();
    }

    componentDidMount () {
        globalAnimator.register(this);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.open !== this.props.open) {
            globalAnimator.register(this);
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    onContainerClick = e => {
        if (e.target === this.containerNode && this.props.onClose) {
            this.props.onClose();
        }
    };

    render () {
        const props = { ...this.props };
        delete props.open;
        delete props.container;
        delete props.position;
        delete props.anchor;

        props.class = (props.class || '') + ' paper-menu';

        const isClosing = !this.props.open;
        const scale = isClosing ? 1 : this.openness.value;
        const opacity = isClosing ? this.openness.value : 1;

        const [x, y] = this.props.position || [0, 0];
        if (!props.style) props.style = {};
        Object.assign(props.style, {
            transform: `translate(${x}px, ${y}px) scale(${scale})`
                + (props.style.transform ? ` ${props.style.transform}` : ''),
            opacity: opacity * (props.style.opacity !== undefined ? props.style.opacity : 1),
            transformOrigin: this.props.anchor ? this.props.anchor : props.style.transformOrigin,
        });

        return this.openness.value > 1 / 100 ? createPortal((
            <div
                class="paper-menu-container"
                ref={node => this.containerNode = node}
                onClick={this.onContainerClick}>
                <div {...props}>
                    {this.props.children}
                </div>
            </div>
        ), this.props.container || document.body) : null;
    }
}
