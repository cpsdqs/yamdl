import { createRef, h } from 'preact';
import { PureComponent } from 'preact/compat';
import Button from '../button';
import Menu from '../menu';
import { RtSpring, globalAnimator } from '../animation';
import { ElementAnimationController } from '../element-animation';
import './bar.less';

/// An app bar.
///
/// # Props
/// - `menu`: the menu button
/// - `title`: the title
/// - `actions`: array of actions to show on the right
///    - each action should be an object like `{ icon, label, action, overflow }`
///        - `icon`: optional icon to show instead of text
///        - `label`: label in the overflow menu
///        - `action`: action callback
///        - `overflow`: if true, will always stay in the overflow menu
export default class AppBar extends PureComponent {
    render (props) {
        props = { ...props };
        const { menu, title, actions } = props;
        delete props.menu;
        delete props.title;
        delete props.actions;

        props.class = (props.class || '') + ' paper-app-bar';

        return (
            <div {...props}>
                <MenuContainer>{menu}</MenuContainer>
                <div class="p-title">
                    {typeof title === 'string'
                        ? <TitleText title={title} />
                        : title}
                </div>
                <div class="p-spacer" />
                <Actions items={actions || []} />
                {props.children}
            </div>
        );
    }
}

/// Contains a menu and animates width.
class MenuContainer extends PureComponent {
    width = new RtSpring({ period: 0.5 });
    opacity = new RtSpring({ period: 0.5 });
    node = createRef();
    baseMarginRight = 0;

    animCtrl = new ElementAnimationController(({ width, opacity }) => {
        if (width === this.width.target) {
            return { marginRight: 0, opacity: 1 };
        }
        return {
            marginRight: width - this.width.target + this.baseMarginRight,
            opacity,
        };
    }, this.node);

    updateWidth () {
        this.width.setTarget(this.node.current?.offsetWidth || 0);
        this.opacity.setTarget(+!!this.width.target);
    }

    componentDidMount () {
        const computedStyle = getComputedStyle(this.node.current);
        this.baseMarginRight = parseInt(computedStyle.marginRight);
        this.updateWidth();
        this.width.setValue(this.width.target);
        this.animCtrl.didMount();
    }

    componentDidUpdate (prevProps) {
        // conservative heuristics
        // TODO: use a resizeobserver...
        let childrenDefinitelyChanged = false;
        if (!!prevProps.children !== !!this.props.children) childrenDefinitelyChanged = true;
        if (prevProps.children?.length !== this.props.children?.length) childrenDefinitelyChanged = true;

        if (childrenDefinitelyChanged) {
            this.updateWidth();
            this.animCtrl.setInputs({ width: this.width, opacity: this.opacity });
        }
    }

    componentWillUnmount () {
        this.animCtrl.drop();
    }

    render () {
        this.animCtrl.setInputs({ width: this.width, opacity: this.opacity });

        return (
            <div class="p-menu" style={this.animCtrl.getCurrentStyles()} ref={this.node}>
                {this.props.children}
            </div>
        );
    }
}

/// Renders a title string and animates changes with a crossfade.
class TitleText extends PureComponent {
    state = {
        text: this.props.title,
        newText: null,
    };

    componentDidUpdate (prevProps) {
        if (prevProps.title !== this.props.title) {
            this.setState({ newText: this.props.title });
            this.timeout = setTimeout(() => {
                if (this.state.newText) {
                    this.setState({ text: this.state.newText, newText: null });
                }
            }, 200);
        }
    }

    componentWillUnmount () {
        clearTimeout(this.timeout);
    }

    render (props, state) {
        const text = state.text;
        let innerClass = 'p-inner';
        if (state.newText) innerClass += ' p-out';

        return (
            <div class="p-title-text">
                <div class={innerClass}>
                    {text}
                </div>
            </div>
        );
    }
}

// TODO: autosizing magic?
class Actions extends PureComponent {
    state = {
        overflowOpen: false,
    };

    render ({ items }) {
        const visibleItems = [];
        const overflowingItems = [];

        let keyIndex = 0;
        for (const item of items) {
            if (item.overflow) {
                overflowingItems.push(item);
            } else if (item.node) {
                visibleItems.push(
                    <span class="p-action" key={item.key || keyIndex++}>
                        {item.node}
                    </span>
                );
            } else if (item.icon) {
                visibleItems.push(
                    <span class="p-action" key={item.key || keyIndex++}>
                        <Button
                            small
                            icon
                            onClick={item.action}
                            title={item.label}
                            aria-label={item.label}
                            disabled={item.disabled}
                            {...(item.props || {})}>
                            {item.icon}
                        </Button>
                    </span>
                );
            } else {
                visibleItems.push(
                    <span class="p-action" key={item.key || keyIndex++}>
                        <Button
                            onClick={item.action}
                            disabled={item.disabled}
                            {...(item.props || {})}>
                            {item.label}
                        </Button>
                    </span>
                );
            }
        }

        if (overflowingItems.length) {
            visibleItems.push(
                <span class="p-action">
                    <Button
                        small
                        icon
                        onClick={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            this.overflowPos = [
                                rect.right - rect.width / 4,
                                rect.top + rect.height / 4,
                            ];
                            this.setState({ overflowOpen: true });
                        }}>
                        <span class="p-overflow-icon">
                            <span />
                            <span />
                            <span />
                        </span>
                    </Button>
                </span>
            );
        }

        return (
            <div class="p-actions">
                {visibleItems}
                <Menu
                    open={this.state.overflowOpen}
                    position={this.overflowPos}
                    anchor={[1, 0]}
                    onClose={() => this.setState({ overflowOpen: false })}
                    items={overflowingItems} />
            </div>
        );
    }
}
