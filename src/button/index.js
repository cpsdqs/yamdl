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
/// - `small`: will use the smaller icon button size
/// - `href`: if given, will use a <a> instead
/// - `selected`: if true, will pretend it’s focused
export default class Button extends Component {
    /// The button node.
    button = null;

    /// The ripple instance.
    ripple = null;

    onPointerDown = e => {
        if (this.props.onPointerDown) this.props.onPointerDown(e);
        if (this.ripple) this.ripple.onPointerDown(e);
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
        if (this.props.selected) return;
        if (!e.defaultPrevented && this.ripple) this.ripple.onFocus();
    };

    onBlur = e => {
        if (this.props.onBlur) this.props.onBlur(e);
        if (this.props.selected) return;
        if (!e.defaultPrevented && this.ripple) this.ripple.onBlur();
    };

    componentDidMount () {
        if (this.props.selected) this.ripple.onFocus();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.selected !== this.props.selected) {
            if (this.props.selected) this.ripple.onFocus();
            else this.ripple.onBlur();
        }
    }

    render () {
        const props = { ...this.props };
        props.class = (props.class || '') + ' paper-button';

        if (props.raised) props.class += ' raised';
        if (props.fab) props.class += ' fab';
        if (props.icon) props.class += ' icon-button';
        if (props.small) props.class += ' small';

        delete props.raised;
        delete props.fab;
        delete props.icon;
        delete props.small;
        delete props.selected;

        const circle = props.fab || props.icon;

        const Component = 'href' in props ? 'a' : 'button';

        return (
            <Component
                type="button"
                {...props}
                ref={node => this.button = node}
                onPointerDown={this.onPointerDown}
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
