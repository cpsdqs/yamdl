import { h, Component } from 'preact';
import Button from '../button';
import Menu from '../menu';
import './bar.less';

/// An app bar.
///
/// # Props
/// - `menu`: the menu button
/// - `title`: the title
/// - `actions`: array of actions to show on the right
///    - each action should be an object like `{ icon, label, action, overflow }`
///        - `icon`: optional icon to show instead of text. Will overflow if omitted.
///        - `label`: label in the overflow menu
///        - `action`: action callback
///        - `overflow`: if true, will always stay in the overflow menu
export default class AppBar extends Component {
    render (props) {
        props = { ...props };
        const { menu, title, actions } = props;
        delete props.menu;
        delete props.title;
        delete props.actions;

        props.class = (props.class || '') + ' paper-app-bar';

        return (
            <div {...props}>
                {menu ? <div class="p-menu">{menu}</div> : null}
                <div class="p-title">
                    {typeof title === 'string'
                        ? <TitleText title={title} />
                        : title}
                </div>
                <div class="p-spacer" />
                <Actions items={actions || []} />
            </div>
        );
    }
};

/// Renders a title string and animates changes with a crossfade.
class TitleText extends Component {
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
class Actions extends Component {
    state = {
        overflowOpen: false,
    };

    render ({ items }) {
        const visibleItems = [];
        const overflowingItems = [];

        for (const item of items) {
            if (item.overflow || !item.icon) {
                overflowingItems.push({
                    label: item.label,
                    action: item.action,
                });
            } else if (item.icon) {
                visibleItems.push(
                    <span class="p-action">
                        <Button small icon>
                            {item.icon}
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
