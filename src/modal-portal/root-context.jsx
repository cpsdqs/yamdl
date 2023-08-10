import { createContext } from 'preact';

/**
 * A root context provides a reference to the nearest root container.
 * The value is an HTMLElement or null.
 */
export const RootContext = createContext(null);
