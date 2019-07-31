import { h, Component } from 'preact';
import Ripple from '../ripple';
import './style';

function isButtonPressKey (key) {
    return key === ' ' || key === 'Enter';
}

///
/// A material button.
///
/// # Props
/// - `raised`: will render a raised button
/// - `fab`: will render a floating action button. Usually in conjunction with `icon`.
/// - `icon`: will render a circular icon button (to be rendered with an icon inside)
/// - `href`: if given, will use a <a> instead
export default class Button extends Component {
    /// The button node.
    button = null;

    /// The ripple instance.
    ripple = null;

    onMouseDown = e => {
        if (this.props.onMouseDown) this.props.onMouseDown(e);
        if (!this.ignoreMouse && this.ripple) this.ripple.onMouseDown(e);
    };

    onMouseMove = e => {
        this.ignoreMouse = false;
        if (this.props.onMouseMove) this.props.onMouseMove(e);
    };

    onTouchStart = e => {
        if (this.props.onTouchStart) this.props.onTouchStart(e);
        this.ripple && this.ripple.onTouchStart(e);
        this.ignoreMouse = true;
    };

    onKeyDown = e => {
        if (e.target !== this.button) return;
        if (this.props.onKeyDown) this.props.onKeyDown(e);
        if (!e.defaultPrevented && isButtonPressKey(e.key) && this.ripple) {
            this.ripple.onAnonymousDown();
        }
    };

    onKeyUp = e => {
        if (e.target !== this.button) return;
        if (this.props.onKeyUp) this.props.onKeyUp(e);
        if (!e.defaultPrevented && this.ripple) this.ripple.onAnonymousUp();
    };

    onFocus = e => {
        if (this.props.onFocus) this.props.onFocus(e);
        if (!e.defaultPrevented && this.ripple) this.ripple.onFocus();
    };

    onBlur = e => {
        if (this.props.onBlur) this.props.onBlur(e);
        if (!e.defaultPrevented && this.ripple) this.ripple.onBlur();
    };

    render () {
        const props = { ...this.props };
        props.class = (props.class || '') + ' paper-button';

        if (props.raised) props.class += ' raised';
        if (props.fab) props.class += ' fab';
        if (props.icon) props.class += ' icon-button';

        const circle = props.fab || props.icon;

        const Component = 'href' in props ? 'a' : 'button';

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
                onBlur={this.onBlur}>
                <Ripple ref={ripple => this.ripple = ripple} circle={circle} />
                {this.props.children}
            </Component>
        );
    }
}
