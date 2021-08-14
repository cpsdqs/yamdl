import { h, Component } from 'preact';
import AppBar from './bar';

const contextKey = 'md-app-bar-provider';

/// In a setup like the following
///
/// ```
/// App
/// |- AppBar
/// |- Dialog (full screen)
///    |- AppBar
/// ```
///
/// it would be bad to have two app bars that share the same space but seem to be two different
/// objects, so this module allows all components in an app to share a single app bar as follows:
///
/// ```
/// App
/// |- AppBarProvider
///    |- AppBarConsumer
///       |- AppBar (provided by AppBarProvider)
///    |- Dialog (full screen)
///       |- AppBarProxy
/// ```
///
/// In this setup, the dialog uses an app bar proxy to control the global app bar.
///
/// AppBarProviders may also be nested without causing additional app bars to appear.
export class AppBarProvider extends Component {
    getChildContext () {
        return {
            [contextKey]: this.context[contextKey] || this,
        };
    }

    registeredAppBars = {};
    registeredConsumers = [];

    register (id, props) {
        this.registeredAppBars[id] = props;
        this.updateConsumers();
    }

    deregister (id) {
        delete this.registeredAppBars[id];
        this.updateConsumers();
    }

    getTopBar () {
        let topBar = null;
        let topBarPriority = -Infinity;

        for (const id in this.registeredAppBars) {
            const props = this.registeredAppBars[id];
            const priority = 'priority' in props ? props.priority : 0;

            if (priority > topBarPriority) {
                topBar = props;
                topBarPriority = priority;
            }
        }

        return topBar;
    }

    updateConsumers () {
        const topBar = this.getTopBar();
        for (const consumer of this.registeredConsumers) consumer.update(topBar);
    }

    registerConsumer (consumer) {
        this.registeredConsumers.push(consumer);
        consumer.update(this.getTopBar());
    }

    deregisterConsumer (consumer) {
        this.registeredConsumers.splice(this.registeredConsumers.indexOf(consumer), 1);
    }

    render () {
        return this.props.children;
    }
}

/// # Props
/// - `prependedProps`: props to prepend to the app bar props instead of appending
/// - `onData`: (data, allProps) => void - additional data from the proxy, or null
export class AppBarConsumer extends Component {
    state = {
        appBar: null,
    }

    update (appBar) {
        if (this.props.onData) this.props.onData(appBar?.data || null, appBar);
        this.setState({ appBar });
    }

    componentDidMount () {
        const provider = this.context[contextKey];
        if (provider) provider.registerConsumer(this);
    }

    componentWillUnmount () {
        const provider = this.context[contextKey];
        if (provider) provider.deregisterConsumer(this);
    }

    render () {
        if (!this.state.appBar) return null;
        const props = {
            ...(this.props.prependedProps || {}),
            ...this.state.appBar,
            ...this.props,
        };
        delete props.priority;
        delete props.prependedProps;
        delete props.onData;
        delete props.data;

        props.class = (this.state.appBar.class || '') + ' ' + (this.props.class || '');
        props.style = Object.assign({}, this.state.appBar.style || {}, this.props.style || {});
        props.children = [];

        if (Array.isArray(this.state.appBar.children)) {
            props.children.push(...this.state.appBar.children);
        } else props.children.push(this.state.appBar.children);
        if (Array.isArray(this.props.children)) {
            props.children.push(...this.props.children);
        } else props.children.push(this.props.children);

        return <AppBar {...props} />;
    }
}

/// Proxy for an AppBarProvider.
///
/// Will create its own AppBar if there is no AppBarProvider, so this should be placed somewhere
/// where an app bar may be allowed to appear.
///
/// # Props
/// - `priority`: works like z-index; the highest priority app bar will be visible. Defaults to 0
/// - `local`: if true, will cause the app bar not to be proxied. Useful for dialogs that are
///   conditionally full-screen
/// - `proxied`: will be returned when the app bar is proxied. null by default.
/// - `data`: additional data, retrievable from the consumer with the onData callback.
export class AppBarProxy extends Component {
    id = Math.random().toString();

    componentDidMount () {
        if (!this.props.local) this.updateProxied();
    }

    componentDidUpdate (prevProps) {
        let update = false;
        for (const k in prevProps) {
            if (prevProps[k] !== this.props[k]) {
                update = true;
            }
        }
        if (update) {
            if (!this.props.local) this.updateProxied();
            else this.removeProxied();
        }
    }

    componentWillUnmount () {
        this.removeProxied();
    }

    updateProxied () {
        const provider = this.context[contextKey];
        const props = { ...this.props };
        delete props.local;
        delete props.proxied;
        if (provider) provider.register(this.id, props);
    }

    removeProxied () {
        const provider = this.context[contextKey];
        if (provider) provider.deregister(this.id);
    }

    render () {
        if (this.context[contextKey] && !this.props.local) return this.props.proxied || null;
        else {
            const props = { ...this.props };
            delete props.priority;
            delete props.local;
            delete props.proxied;
            return <AppBar {...props} />;
        }
    }
}
