import { h, Component } from 'preact';
import { createPortal } from 'preact/compat';
import { Spring, globalAnimator, lerp, clamp } from '../animation';
import { AppBarProxy, MenuIcon } from '../app';
import Button from '../button';
import ModalPortal from '../modal-portal';
import './style';

/// A dialog.
///
/// # Props
/// - `open`: if true, will display the dialog
/// - `onClose`: called when the dialog is dismissed
/// - `title`: dialog title
/// - `actions`: dialog actions to show in the footer, or in the top bar when full screen.
///   Array of `{ icon, label, action }` objects (see menu).
/// - `fullScreen`: if true, will make dialog full-screen.
/// - `backdrop`: if true, will have a backdrop
///   pass a function `width => bool` to make it conditional based on window width.
/// - `container`: optional DOM node of the container. `<body>` by default
/// - `priority`: app bar proxy priority. 1000 by default.
/// - `appBarProps`: additional app bar props
/// - `fixed`: pass to override whether or not the container is `position: fixed`.
export default class Dialog extends Component {
    presence = new Spring(1, 0.3);

    state = {
        fullScreen: false,
    };

    updatePeriod () {
        this.presence.setPeriod(this.state.fullScreen ? 0.5 : 0.3);
    }

    updateFullScreen () {
        const fullScreen = typeof this.props.fullScreen === 'function'
            ? this.props.fullScreen(window.innerWidth)
            : this.props.fullScreen;
        this.setState({ fullScreen }, () => this.updatePeriod());
    }

    update (dt) {
        this.presence.update(dt);
        if (!this.presence.wantsUpdate()) globalAnimator.deregister(this);
        this.forceUpdate();
    }

    onContainerClick = e => {
        if (e.target === this.containerNode && this.props.onClose) this.props.onClose();
    };

    onResize = () => {
        this.updateFullScreen();
    };

    componentDidMount () {
        window.addEventListener('resize', this.onResize);
        if (this.props.open) this.presence.value = 1;
        this.updateFullScreen();
        this.forceUpdate();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.fullScreen !== this.props.fullScreen) this.updateFullScreen();
        if (prevProps.open !== this.props.open) {
            this.presence.target = +!!this.props.open;
            globalAnimator.register(this);
        }
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.onResize);
        globalAnimator.deregister(this);
    }

    renderStyle (props) {
        if (this.state.fullScreen) {
            props.style.transform += ` translateY(${lerp(100, 0, this.presence.value)}%)`;
            props.style.opacity *= clamp(lerp(0, 50, this.presence.value), 0, 1);
        } else {
            props.style.opacity *= this.presence.value;
        }
    }

    renderAppBarMenu () {
        return this.state.fullScreen ? (
            <Button icon small onClick={this.props.onClose}>
                <MenuIcon type="close" />
            </Button>
        ) : null;
    }

    get container () {
        return this.props.container || document.body;
    }

    render () {
        const props = { ...this.props };
        delete props.open;
        delete props.fixed;
        delete props.backdrop;
        delete props.title;
        delete props.actions;
        delete props.fullScreen;
        delete props.container;
        delete props.appBarProps;

        props.class = (props.class || '') + ' paper-dialog';

        let containerClass = 'paper-dialog-container';
        if (this.state.fullScreen) {
            containerClass += ' is-full-screen';
            props.class += ' is-full-screen';
        }
        containerClass += ('fixed' in this.props
            ? this.props.fixed
            : !this.props.container) ? ' is-fixed' : '';

        props.style = { ...(props.style || {}) };
        props.style.transform = props.style.transform || '';
        props.style.opacity = 'opacity' in props.style ? +props.style.opacity : 1;

        this.renderStyle(props);

        const dialog = (
            <div
                class={containerClass}
                ref={node => this.containerNode = node}
                onClick={this.onContainerClick}>
                {this.props.backdrop && <div
                    class="paper-dialog-backdrop"
                    style={{ opacity: this.presence.value }} />}
                <div {...props}>
                    {this.state.fullScreen || this.props.title ? (
                        <AppBarProxy
                            local={!this.state.fullScreen}
                            priority={this.props.open
                                ? (this.props.appBarPriority || 1000)
                                : -Infinity}
                            class="paper-dialog-app-bar"
                            menu={this.renderAppBarMenu()}
                            title={this.props.title}
                            actions={this.state.fullScreen ? this.props.actions : null}
                            proxied={<div class="p-app-bar-placeholder" />}
                            {...(this.props.appBarProps || {})} />
                    ) : null}
                    <div class="paper-dialog-contents">
                        {this.props.children}
                    </div>
                    {!this.state.fullScreen && this.props.actions ? (
                        <footer class="paper-dialog-actions">
                            {this.props.actions.map(({ label, action, disabled, props }, i) => (
                                <Button
                                    key={i}
                                    class="p-action"
                                    onClick={action}
                                    disabled={disabled}
                                    {...(props || {})}>
                                    {label}
                                </Button>
                            ))}
                        </footer>
                    ) : null}
                </div>
            </div>
        );

        return (
            <ModalPortal
                class={'paper-dialog-modal-portal' + (this.state.fullScreen ? ' is-full-screen' : '')}
                disableModal={this.state.fullScreen || ('fixed' in this.props && !this.props.fixed)}
                mounted={this.presence.value > 1 / 100}
                onCancel={this.props.onClose}>
                {dialog}
            </ModalPortal>
        );
    }
}
