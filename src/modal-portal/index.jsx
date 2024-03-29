import { h, createRef } from 'preact';
import { createPortal, PureComponent } from 'preact/compat';
import { RootContext } from './root-context';
import './style.less';

const DIALOG_SUPPORTED = ('HTMLDialogElement' in window)
    && (typeof window.HTMLDialogElement.prototype.showModal === 'function');

/**
 * Provides a modal portal element that steals focus if &lt;dialog&gt; is supported.
 *
 * # Props
 * - mounted: bool - if true, mounts to container
 * - onCancel: () => void - fired when dialog is canceled
 * - children: VNodes - dialog content
 */
export default class ModalPortal extends PureComponent {
    container = document.createElement('div');
    dialog = createRef();

    state = {
        mounted: false,
    };

    constructor (props) {
        super(props);

        this.container.className = 'md-modal-portal-container';
    }

    get useDialogElement () {
        // we use the <dialog> element only when the mount target is body.
        // otherwise, we'd get weird behavior (because <dialog> always steals all focus)
        return DIALOG_SUPPORTED && this.mountTarget === document.body;
    }

    get mountTarget () {
        return this.props.container || document.body;
    }
    mountedToNode = null;

    mountContainer () {
        if (this.mountedToNode === this.mountTarget) return;
        this.unmountContainer();
        this.mountTarget.appendChild(this.container);
        this.mountedToNode = this.mountTarget;
    }

    unmountContainer () {
        if (!this.mountedToNode) return;
        this.mountedToNode.removeChild(this.container);
        this.mountedToNode = null;
    }

    lastShownModalDialog = null;
    lastShownDialogWasModal = null;
    showModal () {
        if (!this.useDialogElement) {
            this.setState({ mounted: true });
            return;
        }
        if (this.lastShownModalDialog === this.dialog.current
            && this.lastShownDialogWasModal === !this.props.disableModal
            && this.dialog.current.open) {
            // already in opened state
            return;
        }
        this.closeModal(); // clean up if needed
        if (this.props.disableModal) {
            this.dialog.current.show();
        } else {
            this.dialog.current.showModal();
        }
        this.lastShownModalDialog = this.dialog.current;
        this.setState({ mounted: true });
    }

    closeModal () {
        if (this.useDialogElement && this.lastShownModalDialog) {
            this.lastShownModalDialog.close();
            this.lastShownModalDialog = null;
            this.setState({ mounted: false });
        } else if (!this.useDialogElement) {
            this.setState({ mounted: false });
        }
    }

    componentDidMount () {
        this.dialog.current.addEventListener('cancel', this.onCancel);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.mounted !== this.props.mounted || prevProps.disableModal !== this.props.disableModal) {
            if (this.props.mounted) {
                this.showModal();
            } else {
                this.closeModal();
            }
        }
    }

    componentWillUnmount () {
        this.closeModal();
    }

    onCancel = (e) => {
        e.preventDefault();
        this.props.onCancel();
    };

    render ({ class: className, mounted, children }) {
        // this is fine to do during render since we're only touching DOM state
        if (mounted) this.mountContainer();
        else this.unmountContainer();

        const DialogElement = this.useDialogElement ? 'dialog' : 'div';

        return createPortal(
            <DialogElement
                class={'md-modal-portal-dialog ' + (this.useDialogElement ? '' : 'dialog-is-unsupported ') + (className || '')}
                ref={this.dialog}>
                <RootContext.Provider value={this.dialog.current}>
                    {mounted && this.state.mounted ? children : null}
                </RootContext.Provider>
            </DialogElement>,
            this.container,
        );
    }
}
