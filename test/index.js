import { render, h, Component } from 'preact';
import { Button, Checkbox, CircularProgress, TextField, Slider, Dialog } from '../src';
import { MenuIcon, AppBar, AppBarProvider, AppBarConsumer, AppBarProxy } from '../src';
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
                <div class="demo-item">
                    <Checkbox
                        checked={state.a}
                        onChange={() => this.setState({ a: !state.a })}
                        class="custom-checkbox-color" />
                </div>
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
                <div class="demo-item">
                    <CircularProgress indeterminate class="custom-progress-color" />
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
                <div class="demo-item"><TextField label="With leading" leading="an icon?" {...sharedProps} /></div>
                <div class="demo-item"><TextField outline label="With leading" leading="an icon?" {...sharedProps} /></div>
                <div class="demo-item"><TextField label="With trailing" trailing="an icon?" {...sharedProps} /></div>
                <div class="demo-item"><TextField outline label="With trailing" trailing="an icon?" {...sharedProps} /></div>
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
                        menu={
                            <Button small icon>
                                <MenuIcon type={['menu', 'back', 'close'][state.i % 3]} />
                            </Button>
                        }
                        title={['Title 1', 'Other Title', 'Words'][state.i % 3]}
                        actions={[
                            {
                                label: 'action 1',
                                action: () => {},
                            },
                            {
                                icon: <span>+</span>,
                                label: 'icon',
                                action: () => {},
                            },
                            {
                                label: 'action 2',
                                action: () => {},
                                overflow: true,
                            },
                        ]} />
                </div>
                <div class="demo-item app-bar-demo app-bar-demo-status-bar-space">
                    <AppBar title="22px status bar space also very long etc" />
                </div>
                <div class="demo-item app-bar-demo">
                    <AppBar class="custom-app-bar-color" title="custom color" />
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
                <h2>Menus</h2>
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

class SliderDemo extends Component {
    state = { a: 5, b: 7, c: 250, d: 500 };
    render (props, state) {
        return (
            <div class="demo-region">
                <h2>Sliders</h2>
                <div class="demo-item">
                    <Slider
                        value={state.a}
                        max={10}
                        onChange={a => this.setState({ a })} />
                </div>
                <div class="demo-item">
                    <Slider
                        max={10}
                        discrete
                        value={state.a}
                        onChange={a => this.setState({ a })} />
                </div>
                <div class="demo-item">
                    <Slider
                        max={10}
                        value={[state.a, state.b]}
                        onChange={([a, b]) => this.setState({ a, b })} />
                </div>
                <div class="demo-item">
                    <Slider
                        min={-10}
                        max={10}
                        discrete
                        tickDistance={2}
                        disabled
                        value={state.a}
                        onChange={() => {}} />
                </div>
                <div class="demo-item">
                    <Slider
                        max={10}
                        discrete
                        disabled
                        value={[state.a, state.b]}
                        transfer={[
                            t => Math.sqrt(t) * 10,
                            x => (x / 10) ** 2,
                        ]}
                        onChange={() => {}} />
                </div>
                <div class="demo-item">
                    <Slider
                        min={100}
                        max={1000}
                        popout
                        value={[state.c, state.d]}
                        transfer={[
                            t => (Math.exp(t) - 1) * 1000 / Math.E / (1 - 1 / Math.E),
                            x => Math.log(x / 1000 * (1 - 1 / Math.E) * Math.E + 1),
                        ]}
                        onChange={([c, d]) => this.setState({ c, d })} />
                </div>
            </div>
        );
    }
}

class AppBarProxyDemo extends Component {
    state = { a: false, b: false };
    subviewActions = [
        {
            label: 'action',
            action () {},
        }
    ];
    render (props, state) {
        return (
            <div class="demo-region">
                <h2>App Bar Proxy</h2>
                <div class="demo-item app-bar-demo app-bar-proxy-demo">
                    <AppBarProvider>
                        <AppBarConsumer class="app-bar-consumer" />
                        <AppBarProxy title="root" />
                        {state.a ? (
                            <div class="app-bar-proxy-demo-subview">
                                <AppBarProxy
                                    class="custom-app-bar-color"
                                    local={state.b}
                                    menu={
                                        <Button
                                            small
                                            icon
                                            onClick={() => this.setState({ a: false })}>
                                            <MenuIcon type={'back'} />
                                        </Button>
                                    }
                                    title="subview"
                                    priority={1}
                                    actions={this.subviewActions} />
                                subview
                                <Button onClick={() => this.setState({ b: !state.b })}>
                                    {state.b ? 'make proxied' : 'make local'}
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={() => this.setState({ a: true })}>
                                open subview
                            </Button>
                        )}
                    </AppBarProvider>
                </div>
            </div>
        );
    }
}

class DialogDemo extends Component {
    state = { a: 0 };
    render (props, state) {
        return (
            <div class="demo-region">
                <h2>Dialogs</h2>
                <div class="demo-item">
                    <Button onClick={() => this.setState({ a: 1 })}>Open Alert Dialog</Button>
                    <Button onClick={() => this.setState({ a: 2 })}>Open Simple Dialog</Button>
                    <Button onClick={() => this.setState({ a: 3 })}>Open Full Screen Dialog</Button>
                    <Button onClick={() => this.setState({ a: 4 })}>Open &lt; 500 Full Screen Dialog</Button>
                    <Dialog
                        open={state.a === 1}
                        backdrop
                        onClose={() => this.setState({ a: 0 })}
                        actions={[
                            {
                                label: 'action 1',
                                action: () => this.setState({ a: 0 }),
                            },
                            {
                                label: 'action 2',
                                action: () => this.setState({ a: 0 }),
                            },
                        ]}>
                        alert dialog
                    </Dialog>
                    <Dialog
                        open={state.a === 2}
                        backdrop
                        title="Simple Dialog"
                        onClose={() => this.setState({ a: 0 })}>
                        simple dialog
                    </Dialog>
                    <Dialog
                        open={state.a === 3}
                        fullScreen
                        title="Full Screen Dialog"
                        onClose={() => this.setState({ a: 0 })}
                        actions={[ { label: 'action', action () {} } ]}>
                        full screen dialog
                    </Dialog>
                    <Dialog
                        open={state.a === 4}
                        backdrop
                        fullScreen={width => width < 500}
                        title="Conditionally Full Screen Dialog"
                        onClose={() => this.setState({ a: 0 })}>
                        cond. full screen dialog
                    </Dialog>
                    <div ref={node => this.container5 = node} class="demo-item proxied-dialog-demo">
                        <AppBarProvider>
                            <AppBarConsumer
                                style={{
                                    opacity: (state.a === 0 || state.a === 5) ? 1 : 0,
                                }} />
                            <AppBarProxy
                                title="root"
                                menu={
                                    <Button icon small><MenuIcon type="menu" /></Button>
                                } />
                            <Button onClick={() => this.setState({ a: 5 })}>Open Proxied Full Screen Dialog</Button>
                            <Dialog
                                open={state.a === 5}
                                title="proxied"
                                onClose={() => this.setState({ a: 0 })}
                                container={this.container5}
                                fullScreen
                                appBarProps={{ class: 'dialog-app-bar' }}>
                                proxied full screen dialog
                            </Dialog>
                        </AppBarProvider>
                    </div>
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
                <div class="demo-item"><Button class="custom-button-color">custom color</Button></div>
                <div class="demo-item"><Button href="javascript:void(0)">link</Button></div>
            </div>
            <CheckboxDemo />
            <ProgressDemo />
            <TextFieldDemo />
            <MenuIconDemo />
            <AppBarDemo />
            <MenuDemo />
            <SliderDemo />
            <AppBarProxyDemo />
            <DialogDemo />
        </div>
    );
}

render(<Gallery />, root);
