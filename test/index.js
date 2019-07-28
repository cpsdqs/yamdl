import { render, h, Component } from 'preact';
import { Button, Checkbox, CircularProgress, TextField } from '../src';
import { NavigationWindow, NavigationView, MenuIcon, AppBar } from '../src';
import Menu from '../src/menu';
import './index.less';

const root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark');
}

class DarkSwitch extends Component {
    render () {
        return (
            <div>
                <label for="dark-switch">Dark mode:</label> <Checkbox
                    switch
                    id="dark-switch"
                    checked={document.body.classList.contains('dark')}
                    onChange={checked => {
                        if (checked) document.body.classList.add('dark');
                        else document.body.classList.remove('dark');
                        this.forceUpdate();
                    }} />
            </div>
        );
    }
}

class CheckboxDemo extends Component {
    state = { a: true };
    render (props, state) {
        return (
            <div class="demo-region">
                <h2>Checkboxes</h2>
                <div class="demo-item"><Checkbox /></div>
                <div class="demo-item">
                    <Checkbox
                        indeterminate={state.a}
                        checked={!state.a}
                        onChange={() => this.setState({ a: !state.a })} />
                </div>
                <div class="demo-item">
                    <Checkbox
                        indeterminate={state.a}
                        onChange={() => this.setState({ a: !state.a })} />
                </div>
                <div class="demo-item"><Checkbox disabled /></div>
                <div class="demo-item"><Checkbox disabled checked /></div>
                <div class="demo-item"><Checkbox switch /></div>
                <div class="demo-item"><Checkbox switch disabled /></div>
                <div class="demo-item"><Checkbox switch disabled checked /></div>
                <p class="demo-description">
                    Switches can also be dragged.
                </p>
            </div>
        );
    }
}

class ProgressDemo extends Component {
    render (props, state) {
        return (
            <div class="demo-region">
                <h2>Progress Indicators</h2>
                <div class="demo-item" onClick={() => {
                    this.setState({ i: !state.i });
                }}>
                    <CircularProgress indeterminate={!state.i} />
                </div>
                <div class="demo-item" onClick={() => {
                    this.setState({ j: !state.j });
                }}>
                    <CircularProgress indeterminate={state.j} progress={0.7} />
                </div>
                <div class="demo-item" onClick={() => {
                    this.setState({ k: !state.k });
                }}>
                    <CircularProgress progress={state.k ? 1 : 0.2} />
                </div>
                <div class="demo-item" onClick={() => {
                    this.setState({ l: !state.l });
                }}>
                    <CircularProgress small indeterminate={!state.l} progress={1} />
                </div>
                <p class="demo-description">
                    Tap to change state.
                </p>
            </div>
        );
    }
}

class TextFieldDemo extends Component {
    state = { s: '' };
    render (props, state) {
        const sharedProps = { value: state.s, onChange: e => this.setState({ s: e.target.value }) };

        return (
            <div class="demo-region">
                <h2>Text Fields</h2>
                <div class="demo-item">
                    <TextField label="Hello world" placeholder="Placeholder" {...sharedProps} />
                </div>
                <div class="demo-item"><TextField label="Disabled" disabled {...sharedProps} /></div>
                <div class="demo-item"><TextField label="Hello world" outline {...sharedProps} /></div>
                <div class="demo-item"><TextField label="Disabled " outline disabled {...sharedProps} /></div>
                <div class="demo-item"><TextField label="Hello world" error="error" {...sharedProps} /></div>
                <div class="demo-item"><TextField label="Hello world" helperLabel="help label" {...sharedProps} /></div>
                <div class="demo-item"><TextField label="Prefixed" prefix="an icon?" {...sharedProps} /></div>
                <div class="demo-item"><TextField center label="Centered" {...sharedProps} /></div>
            </div>
        );
    }
}

class MenuIconDemo extends Component {
    render (props, state) {
        return (
            <div class="demo-region">
                <h2>Menu Icon</h2>
                <div class="demo-item" onClick={() => {
                    this.setState({ i: !state.i });
                }}>
                    <MenuIcon type={state.i ? 'back' : ''} />
                </div>
                <div class="demo-item" onClick={() => {
                    this.setState({ j: !state.j });
                }}>
                    <MenuIcon type={!state.j ? 'close' : ''} />
                </div>
                <div class="demo-item" onClick={() => {
                    this.setState({ k: !state.k });
                }}>
                    <MenuIcon type={state.k ? 'close' : 'back'} />
                </div>
                <p class="demo-description">Tap to change state.</p>
            </div>
        );
    }
}

class AppBarDemo extends Component {
    state = { i: 0 };
    render (props, state) {
        return (
            <div class="demo-region">
                <h2>App Bar</h2>
                <div class="demo-item app-bar-demo">
                    <AppBar title="Without Menu" />
                </div>
                <div class="demo-item app-bar-demo" onClick={() => {
                    this.setState({ i: (state.i | 0) + 1 });
                }}>
                    <AppBar
                        menu={<MenuIcon type={['menu', 'back', 'close'][state.i % 3]} />}
                        title={['Title 1', 'Other Title', 'Words'][state.i % 3]} />
                </div>
                <div class="demo-item app-bar-demo app-bar-demo-status-bar-space">
                    <AppBar title="22px status bar space also very long etc" />
                </div>
                <p class="demo-description">Tap to change state.</p>
            </div>
        );
    }
}

class MenuDemo extends Component {
    state = { i: false, j: false };
    render (props, state) {
        return (
            <div class="demo-region">
                <h2>Menu</h2>
                <div class="demo-item">
                    <Button onClick={e => this.setState({
                        i: !state.i,
                        x: e.target.getBoundingClientRect().left,
                        y: e.target.getBoundingClientRect().top,
                    })}>
                        Open Menu
                    </Button>
                    <Menu
                        open={state.i}
                        position={[state.x, state.y]}
                        onClose={() => this.setState({ i: false })}
                        items={[
                            { label: 'no ripple' },
                            { label: 'with ripple', action: () => this.setState({ i: false }) },
                            { label: 'disabled', disabled: true },
                            { label: 'selected', selected: true },
                            { label: 'etc' },
                        ]} />
                </div>
                <div class="demo-item">
                    <Button onClick={e => this.setState({
                        j: !state.j,
                        x: e.target.getBoundingClientRect().right,
                        y: e.target.getBoundingClientRect().bottom,
                    })}>
                        Open Menu
                    </Button>
                    <Menu
                        open={state.j}
                        position={[state.x, state.y]}
                        onClose={() => this.setState({ j: false })}
                        anchor={[1, 1]}
                        cascadeUp
                        selectionIcon={'✓'}
                        items={[
                            { label: 'abcd' },
                            { label: 'menu items' },
                            { label: 'efgh', selected: true },
                            ...[1, 2, 3, 4, 5, 6, 7, 8].map(() => ({ label: 'item' })),
                        ]} />
                </div>
            </div>
        );
    }
}

function Gallery () {
    return (
        <div>
            <h1>Component Gallery</h1>
            <DarkSwitch />
            <div class="demo-region">
                <h2>Buttons</h2>
                <div class="demo-item"><Button>button</Button></div>
                <div class="demo-item"><Button raised>raised</Button></div>
                <div class="demo-item"><Button fab>fab</Button></div>
                <div class="demo-item"><Button icon>+</Button></div>
                <div class="demo-item"><Button fab icon>+</Button></div>
                <div class="demo-item"><Button disabled>button</Button></div>
                <div class="demo-item"><Button raised disabled>button</Button></div>
            </div>
            <CheckboxDemo />
            <ProgressDemo />
            <TextFieldDemo />
            <MenuIconDemo />
            <AppBarDemo />
            <MenuDemo />
        </div>
    );
}

render(<Gallery />, root);
