import { h, Component } from 'preact';

export MenuIcon from './menu-icon';
export AppBar from './bar';

import MenuIcon from './menu-icon';
import AppBar from './bar';

export const CONTEXT_ID = 'md-navigation-window-context';

export class NavigationWindow extends Component {
    getChildContext () {
        return {
            [CONTEXT_ID]: {
                /// all immediate child navigation windows should foward their state to this one
                shouldWindowProxy: true,
                pushView: this.pushView,
                replaceView: this.replaceView,
                popView: this.popView,
            }
        };
    }

    state = {
        views: [],
    };

    pushView = view => {
        const views = this.state.views.slice();
        views.push(view);
        this.setState({ views });
        return [views.length - 1];
    };

    replaceView = (index, view) => {
        const views = this.state.views.slice();
        if (index in views) {
            views[index] = view;
        }
        this.setState({ views });
    };

    popView = () => {
        const views = this.state.views.slice();
        views.pop();
        this.setState({ views });
    };

    onMenuClick = () => {
        if (this.state.views.length) {
            this.state.views[this.state.views.length - 1].onClose();
        }
    };

    render () {
        if (this.context[CONTEXT_ID] && this.context[CONTEXT_ID].shouldWindowProxy) {
            // TODO: forward up
            return Array.isArray(this.props.children)
                ? this.props.children[0]
                : this.props.children;
        } else {
            let currentItem;
            for (let i = 0; i < this.state.views.length; i++) {
                const j = this.state.views.length - 1 - i;
                if (!this.state.views[j].modal) {
                    currentItem = this.state.views[j];
                    break;
                }
            }
            const currentTitle = currentItem ? currentItem.title : '';
            const menuType = currentItem === this.state.views[0] ? 'menu'
                : currentItem.close ? 'close' : 'back';

            return (
                <div class="navigation-window">
                    <AppBar
                        class="p-window-bar"
                        menu={<MenuIcon type={menuType} onClick={this.onMenuClick} />}
                        title={currentTitle} />
                    <div class="p-window-content">
                        {this.props.children}
                    </div>
                </div>
            );
        }
    }
}

/// A view in a navigation window. Should always enclose child navigation views.
///
/// # Props
/// - `title`: the title of this view
/// - `modal`: if true, will not affect the app bar
/// - `close`: if true, will show a close button instead of a back button
/// - `hidden`: if true, will not affect the app bar (temporarily)
/// - `onClose`: close handler
export class NavigationView extends Component {
    getChildContext () {
        return {
            [CONTEXT_ID]: {
                // if this is a modal, a child NavigationWindow shouldn’t forward its app bar
                shouldWindowProxy: !this.props.modal,
                pushView: this.pushView,
                replaceView: this.context[CONTEXT_ID].replaceView || (() => {}),
                popView: this.popView,
            },
        };
    }

    subviews = 0;
    viewID = null;

    pushView = view => {
        this.subviews++;
        this.context[CONTEXT_ID] && this.context[CONTEXT_ID].pushView(view);
    };

    popView = () => {
        if (this.subviews > 0) {
            this.context[CONTEXT_ID] && this.context[CONTEXT_ID].popView();
        }
    };

    updateNav () {
        const o = {
            title: this.props.title,
            modal: this.props.modal,
            close: this.props.close,
            onClose: this.props.onClose || (() => {}),
        };

        if (this.viewID !== null && !this.props.hidden) {
            this.context[CONTEXT_ID].replaceView(this.viewID, o);
        } else if (this.viewID !== null && this.props.hidden) {
            this.removeNav();
        } else if (this.context[CONTEXT_ID]) {
            this.viewID = this.context[CONTEXT_ID].pushView(o);
        }
    }

    removeNav () {
        if (this.context[CONTEXT_ID]) {
            for (let i = 0; i < this.subviews; i++) {
                this.context[CONTEXT_ID].popView();
            }
            if (this.viewID !== null) this.context[CONTEXT_ID].popView();
        }
        this.viewID = null;
    }

    componentDidMount () {
        this.updateNav();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.title !== this.props.title
            || prevProps.modal !== this.props.modal
            || prevProps.close !== this.props.close
            || prevProps.hidden !== this.props.hidden) {
            this.updateNav();
        }
    }

    componentWillUnmount () {
        this.removeNav();
    }

    render () {
        return Array.isArray(this.props.children) ? this.props.children[0] : this.props.children;
    }
}
