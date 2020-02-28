import { h, Component } from 'preact';
import Button from '../button';
import './style';

/// A navigation drawer item.
///
/// # Props
/// - `icon`: the icon
/// - `selected`: selection state
export function DrawerItem (originalProps) {
    const props = { ...originalProps };
    const { icon, selected } = props;
    delete props.icon;
    delete props.raised;
    delete props.fab;

    props.class = (props.class || '') + ' paper-drawer-item';
    if (selected) props.class += ' is-selected';

    return (
        <Button {...props}>
            <div class="p-icon">
                {icon}
            </div>
            <div class="p-contents">
                {props.children}
            </div>
        </Button>
    );
}

export function DrawerLabel (props) {
    props.class = (props.class || '') + ' paper-drawer-label';

    return (
        <div {...props}>
            {props.children}
        </div>
    );
}
