import { render, h, Component } from 'preact';
import Button from '../src/button';
import Checkbox from '../src/checkbox';
import { CircularProgress } from '../src/progress';
import TextField from '../src/text-field';
import { MenuIcon, AppBar } from '../src/app';
import './index.less';

const root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);

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

function Gallery () {
    return (
        <div>
            <h1>Component Gallery</h1>
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
            <div class="demo-region">
                <h2>App Bar</h2>
                <div class="demo-item">
                    <AppBar />
                </div>
            </div>
        </div>
    );
}

render(<Gallery />, root);
