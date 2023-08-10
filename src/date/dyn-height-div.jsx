import { h, Component } from 'preact';
import { Spring, globalAnimator } from '../animation';

/** Internal component for now */
export default class DynHeightDiv extends Component {
    height = new Spring(1, 0.5);
    node = null;

    updateHeight = () => {
        if (!this.node) return;
        const currentHeightStyle = this.node.style.height;
        this.node.style.height = '';
        this.height.target = this.node.offsetHeight;
        this.node.style.height = currentHeightStyle;

        if (this.height.wantsUpdate()) globalAnimator.register(this);
    };

    scheduledUpdate;
    ffScheduledUpdate;
    scheduleUpdate = () => {
        clearTimeout(this.scheduledUpdate);
        clearTimeout(this.ffScheduledUpdate);
        this.scheduledUpdate = setTimeout(this.updateHeight, 1);
        // also a schedule update further in the future
        // because sometimes layout may be just a tad off
        this.ffScheduledUpdate = setTimeout(this.updateHeight, 1000);
    };

    update (dt) {
        this.height.update(dt);
        if (!this.height.wantsUpdate()) globalAnimator.deregister(this);
        this.forceUpdate();
    }

    componentDidMount () {
        globalAnimator.register(this);
        window.addEventListener('resize', this.updateHeight);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.children !== this.props.children) this.updateHeight();
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
        clearTimeout(this.scheduledUpdate);
        clearTimeout(this.ffScheduledUpdate);
        window.removeEventListener('resize', this.updateHeight);
    }

    render (props) {
        return (
            <div {...props} ref={node => this.node = node} style={{ height: this.height.value }}>
                {props.children}
            </div>
        );
    }
}
