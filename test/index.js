import { render, h, Component } from 'preact';
import Button from '../src/button';
import Checkbox from '../src/checkbox';
import { CircularProgress } from '../src/progress';
import TextField from '../src/text-field';
import { NavigationWindow, NavigationView, MenuIcon, AppBar } from '../src/app';
import './index.less';

const root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')) {
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

class NavigationDemo extends Component {
    state = {
        subview: false,
        subview2: false,
        subview3: false,
    };
    render (props, state) {
        return (
            <div class="demo-region">
                <h2>Navigation</h2>
                <div class="demo-item nav-window-demo">
                    <NavigationWindow>
                        <NavigationView title="Root View">
                            <div>
                                {state.subview ? (
                                    <NavigationView
                                        title="Subview"
                                        onClose={() => this.setState({ subview: false })}>
                                        <div>
                                            subview!
                                            <Button onClick={() => this.setState({ subview3: true })}>
                                                Open Sub-subview
                                            </Button>
                                            {state.subview3 && (
                                                <NavigationView title="Sub-subview"
                                                    close
                                                    onClose={() => this.setState({ subview3: false })}>
                                                    sub-subview
                                                </NavigationView>
                                            )}
                                        </div>
                                    </NavigationView>
                                ) : state.subview2 ? (
                                    <NavigationView
                                        title="Subview 2"
                                        close
                                        onClose={() => this.setState({ subview2: false })}>
                                        subview 2!
                                    </NavigationView>
                                ) : (
                                    <div>
                                        hello world
                                        <Button onClick={() => this.setState({ subview: true })}>
                                            Open Subview
                                        </Button>
                                        <Button onClick={() => this.setState({ subview2: true })}>
                                            Open Subview 2
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </NavigationView>
                    </NavigationWindow>
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
            <div class="demo-region">
                <h2>Checkboxes</h2>
                <div class="demo-item"><Checkbox /></div>
                <div class="demo-item"><Checkbox disabled /></div>
                <div class="demo-item"><Checkbox disabled checked /></div>
                <div class="demo-item"><Checkbox switch /></div>
                <div class="demo-item"><Checkbox switch disabled /></div>
                <div class="demo-item"><Checkbox switch disabled checked /></div>
                <p class="demo-description">
                    Switches can also be dragged.
                </p>
            </div>
            <ProgressDemo />
            <div class="demo-region">
                <h2>Text Fields</h2>
                <div class="demo-item"><TextField label="Hello world" placeholder="Placeholder" /></div>
                <div class="demo-item"><TextField label="Disabled" disabled /></div>
                <div class="demo-item"><TextField label="Hello world" outline /></div>
                <div class="demo-item"><TextField label="Disabled " outline disabled /></div>
                <div class="demo-item"><TextField label="Hello world" error="error" /></div>
                <div class="demo-item"><TextField label="Hello world" helperLabel="help label" /></div>
                <div class="demo-item"><TextField label="Prefixed" prefix="an icon?" /></div>
                <div class="demo-item"><TextField center label="Centered" /></div>
            </div>
            <MenuIconDemo />
            <AppBarDemo />
            <NavigationDemo />
        </div>
    );
}

render(<Gallery />, root);
