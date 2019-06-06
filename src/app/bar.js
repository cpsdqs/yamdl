import { h, Component } from 'preact';
import './bar.less';

/// An app bar.
///
/// # Props
/// - `menu`: the menu button
/// - `title`: the title
/// - `buttons`: array of button descriptors to show on the right
///    - each button descriptor should be an object like `{ icon, label, overflow }`
///        - `icon`: optional icon to show instead of text
///        - `label`: icon label as shown in the overflow menu
///        - `overflow`: if true, will always stay in the overflow menu
export default class AppBar extends Component {
    render (props) {
        return (
            <div class="paper-app-bar">
                {props.menu ? <div class="p-menu">{props.menu}</div> : null}
                <div class="p-title">
                    {typeof props.title === 'string'
                        ? <TitleText title={props.title} />
                        : props.title}
                </div>
                <div class="p-spacer" />
                <span class="p-overflowing-buttons-and-stuff">todo</span>
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
