import { h, Component } from 'preact';
import { createPortal } from 'preact/compat';
import Button from '../button';
import Ripple from '../ripple';
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
/// - `anchor`: tuple of two elements; anchor position normalized to 0..1
/// - `items`: array of menu items
/// - `clampToScreenEdge`: set to false to disable
/// - `cascadeUp`: set to cascade up instead of cascading down
/// - `selectionIcon`: icon to use for selection
export default class Menu extends Component {
    openness = new Spring(1, 0.3);

    state = {
        size: [0, 0],
    };

    update (dt) {
        if (this.node && this.sizeNeedsUpdate) {
            this.setState({ size: [this.node.offsetWidth, this.node.offsetHeight] });
            this.sizeNeedsUpdate = false;
        }

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
            this.openness.setPeriod(this.props.open ? 0.3 : 0.1);
            this.sizeNeedsUpdate = true;
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
        delete props.items;
        delete props.clampToScreenEdge;

        props.class = (props.class || '') + ' paper-menu';

        const isClosing = !this.props.open;
        const scale = isClosing ? 1 : this.openness.value;
        const opacity = isClosing ? this.openness.value : 1;

        const [ax, ay] = this.props.anchor || [0, 0];
        let [x, y] = this.props.position || [0, 0];
        let anchorOffsetX = 0;
        let anchorOffsetY = 0;

        const [width, height] = this.state.size;
        x -= ax * width;
        y -= ay * height;

        if (this.props.clampToScreenEdge !== false) {
            const newX = Math.max(0, Math.min(x, window.innerWidth - width));
            const newY = Math.max(0, Math.min(y, window.innerHeight - height));
            anchorOffsetX = newX - x;
            anchorOffsetY = newY - y;
            x = newX;
            y = newY;
        }

        if (!props.style) props.style = {};

        let transform = '';
        if (anchorOffsetX || anchorOffsetY) {
            // correct transform origin when clamped to edge
            transform += `translate(${-anchorOffsetX}px, ${-anchorOffsetY}px)`;
        }
        transform += `translate(${x}px, ${y}px) scale(${scale})`;
        if (anchorOffsetX || anchorOffsetY) {
            transform += `translate(${anchorOffsetX}px, ${anchorOffsetY}px)`;
        }
        if (props.style.transform) transform += ' ' + props.style.transform;

        Object.assign(props.style, {
            transform,
            opacity: opacity * (props.style.opacity !== undefined ? props.style.opacity : 1),
            transformOrigin: this.props.anchor
                ? `${this.props.anchor[0] * 100}% ${this.props.anchor[1] * 100}%`
                : props.style.transformOrigin,
        });

        const cascadeDown = !this.props.cascadeUp;
        const menuItems = (this.props.items || [])
            .map((item, i) => (
                <MenuItem
                    leadingIcon={this.props.selectionIcon
                        ? item.selected ? this.props.selectionIcon : ''
                        : null}
                    selectWithIcon={!!this.props.selectionIcon}
                    {...item}
                    key={i}
                    onClick={item.action}
                    cascadeDelay={(cascadeDown ? i : (this.props.items.length - 1 - i))
                        * 0.3 / (this.props.items.length ** 0.9)}
                    cascadeDirection={cascadeDown ? 1 : -1}>
                    {item.label}
                </MenuItem>
            ));

        return this.openness.value > 1 / 100 ? createPortal((
            <div
                class="paper-menu-container"
                ref={node => this.containerNode = node}
                onClick={this.onContainerClick}>
                <div {...props} ref={node => this.node = node}>
                    {menuItems}
                    {this.props.children}
                </div>
            </div>
        ), this.props.container || document.body) : null;
    }
}

/// A menu item.
///
/// # Props
/// - `selected`: disabled state
/// - `disabled`: disabled state
/// - `leadingIcon`: if not null, will display a leading icon
/// - `selectWithIcon`: if set, will not highlight when selected
/// - `cascadeDelay`: if given, will animate in with a delay
/// - `cascadeDirection`: if given, will cascade in the given vertical direction
export class MenuItem extends Button {
    presence = new Spring(1, 0.3);

    componentDidMount () {
        this.presence.target = 1;
        this.presence.velocity = 4;
        if (Number.isFinite(this.props.cascadeDelay)) {
            this.presenceTimeout = this.props.cascadeDelay;
            globalAnimator.register(this);
        } else {
            this.presence.finish();
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    update (dt) {
        this.presenceTimeout -= dt;
        if (this.presenceTimeout <= 0) {
            this.presenceTimeout = 0;
            this.presence.update(dt);
            if (!this.presence.wantsUpdate()) {
                globalAnimator.deregister(this);
            }
            this.forceUpdate();
        }
    }

    render () {
        const props = { ...this.props };

        delete props.cascadeDelay;

        props.class = (props.class || '') + ' paper-menu-item';
        if (this.props.onClick) props.class += ' has-action';
        if (this.props.selected) {
            props.class += ' is-selected';
            if (this.props.selectWithIcon) props.class += ' select-with-icon';
        }
        if (this.props.disabled) props.class += ' is-disabled';

        let icon = null;

        if (this.props.leadingIcon !== null && this.props.leadingIcon !== undefined) {
            props.class += ' has-icon';
            icon = (
                <div className="p-icon">
                    {this.props.leadingIcon}
                </div>
            );
        }

        const Component = this.props.onClick ? 'button' : 'div';

        const cascadeDirection = Number.isFinite(this.props.cascadeDirection)
            ? this.props.cascadeDirection
            : 1;
        const style = {
            opacity: this.presence.value * (this.props.disabled ? 0.5 : 1),
            transform: `translateY(${-(1 - this.presence.value) * 10 * cascadeDirection}px)`,
        };

        return (
            <Component
                {...props}
                ref={node => this.button = node}
                onMouseDown={this.onMouseDown}
                onMouseMove={this.onMouseMove}
                onTouchStart={this.onTouchStart}
                onTouchEnd={this.onTouchEnd}
                onKeyDown={this.onKeyDown}
                onKeyUp={this.onKeyUp}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                style={style}>
                {this.props.onClick ? (
                    <Ripple ref={ripple => this.ripple = ripple} />
                ) : null}
                {icon}
                {this.props.children}
            </Component>
        );
    }
}
