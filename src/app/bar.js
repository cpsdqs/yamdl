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
    render () {
        return (
            <div class="paper-app-bar">
                todo
            </div>
        );
    }
};
