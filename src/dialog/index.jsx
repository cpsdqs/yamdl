import { createRef, h } from 'preact';
import { PureComponent } from 'preact/compat';
import { RtSpring, lerp, clamp } from '../animation';
import { ElementAnimationController } from '../element-animation';
import { AppBarProxy, MenuIcon } from '../app';
import Button from '../button';
import ModalPortal from '../modal-portal';
import './style.less';

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
export default class Dialog extends PureComponent {
    state = {
        fullScreen: false,
        mounted: false,
    };

    updateFullScreen () {
        const fullScreen = typeof this.props.fullScreen === 'function'
            ? this.props.fullScreen(window.innerWidth)
            : this.props.fullScreen;
        this.setState({ fullScreen });
    }

    onResize = () => {
        this.updateFullScreen();
    };

    componentDidMount () {
        window.addEventListener('resize', this.onResize);
        if (this.props.open) {
            this.setState({ mounted: true });
        }
        this.updateFullScreen();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.fullScreen !== this.props.fullScreen) this.updateFullScreen();
        if (this.props.open && !prevProps.open) {
            this.setState({ mounted: true });
        }
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.onResize);
    }

    onContainerClick () {
        if (this.props.onClose) this.props.onClose();
    }

    updatePeriod (presence) {
        presence.setPeriod(this.state.fullScreen ? 0.5 : 0.3);
    }

    renderStyle (style, presence) {
        if (this.state.fullScreen) {
            style.transform += ` translateY(${lerp(100, 0, presence)}%)`;
            style.opacity *= clamp(lerp(0, 50, presence), 0, 1);
        } else {
            style.opacity *= presence;
        }
    }

    renderAppBarMenu () {
        return this.state.fullScreen ? (
            <Button icon small onClick={this.props.onClose}>
                <MenuIcon type="close" />
            </Button>
        ) : null;
    }

    #onContainerClickProxy = () => this.onContainerClick();
    #updatePeriodProxy = (presence) => this.updatePeriod(presence);
    #renderStyleProxy = (style, presence) => this.renderStyle(style, presence);
    #renderAppBarMenuProxy = () => this.renderAppBarMenu();

    get container () {
        return this.props.container || document.body;
    }

    onCancel = () => {
        this.props.onClose();
    };

    render ({
        open, fixed, backdrop, title, actions, fullScreen, container,
        appBarProps, appBarPriority, ...props
    }) {
        props.class = (props.class || '') + ' paper-dialog';

        let containerClass = 'paper-dialog-container';
        if (this.state.fullScreen) {
            containerClass += ' is-full-screen';
            props.class += ' is-full-screen';
        }
        containerClass += ('fixed' in this.props
            ? this.props.fixed
            : !this.props.container) ? ' is-fixed' : '';

        const dialog = (
            <InnerDialog
                containerClass={containerClass}
                onClose={this.props.onClose}
                onUnmount={() => this.setState({ mounted: false })}
                backdrop={backdrop}
                fullScreen={this.state.fullScreen}
                title={title}
                open={open}
                appBarProps={appBarProps}
                appBarPriority={appBarPriority}
                actions={actions}
                onContainerClick={this.#onContainerClickProxy}
                updatePeriod={this.#updatePeriodProxy}
                renderStyle={this.#renderStyleProxy}
                renderAppBarMenu={this.#renderAppBarMenuProxy}
                {...props} />
        );

        return (
            <ModalPortal
                container={this.container}
                class={'paper-dialog-modal-portal' + (this.state.fullScreen ? ' is-full-screen' : '')}
                disableModal={this.state.fullScreen || ('fixed' in this.props && !this.props.fixed)}
                mounted={this.state.mounted}
                onCancel={this.onCancel}>
                {dialog}
            </ModalPortal>
        );
    }
}

class InnerDialog extends PureComponent {
    presence = new RtSpring({ period: 0.3, value: 0, target: 1 });

    containerNode = createRef();
    dialogNode = createRef();
    backdropNode = createRef();
    animCtrl = new ElementAnimationController(({ presence }) => {
        const style = { ...(this.props.style || {}) };
        style.transform = style.transform || '';
        style.opacity = Number.isFinite(style.opacity) ? style.opacity : 1;

        this.props.renderStyle(style, presence);
        return [style, { opacity: clamp(presence, 0, 1) }];
    }, [this.dialogNode, this.backdropNode]);

    componentDidMount () {
        this.props.updatePeriod(this.presence);
        this.animCtrl.didMount();
        this.animCtrl.on('finish', () => {
            if (!this.props.open) this.props.onUnmount();
        });
    }

    componentWillUnmount () {
        this.animCtrl.drop();
    }

    onContainerClick = e => {
        if (e.target === this.containerNode.current) {
            this.props.onContainerClick();
        }
    };

    render ({
        containerClass, onClose,
        backdrop, fullScreen, title, open, appBarProps, appBarPriority, actions,
        renderStyle, renderAppBarMenu, updatePeriod,
        ...props
    }) {
        updatePeriod(this.presence);
        this.presence.setTarget(open ? 1 : 0);
        this.animCtrl.setInputs({ presence: this.presence });

        const [dialogStyle, backdropStyle] = this.animCtrl.getCurrentStyles();
        props.style = dialogStyle;

        return (
            <div
                class={containerClass}
                ref={this.containerNode}
                onClick={this.onContainerClick}>
                {backdrop && <div
                    ref={this.backdropNode}
                    class="paper-dialog-backdrop"
                    style={backdropStyle} />}
                <div ref={this.dialogNode} {...props}>
                    {(fullScreen || title) ? (
                        <AppBarProxy
                            local={!fullScreen}
                            priority={open
                                ? (appBarPriority || 1000)
                                : -Infinity}
                            class="paper-dialog-app-bar"
                            menu={renderAppBarMenu()}
                            title={title}
                            actions={fullScreen ? actions : null}
                            proxied={<div class="p-app-bar-placeholder" />}
                            {...(appBarProps || {})} />
                    ) : null}
                    <div class="paper-dialog-contents">
                        {props.children}
                    </div>
                    {!fullScreen && actions ? (
                        <footer class="paper-dialog-actions">
                            {actions.map(({ label, action, disabled, props }, i) => (
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
    }
}
