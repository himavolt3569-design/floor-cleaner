/**
 * `server-only` throws by design when it is resolved outside a React Server
 * Component. Vitest runs plain Node, so importing a server module in a test
 * would blow up on that import alone. The Vitest config aliases the package to
 * this empty module; nothing else may import it.
 */
export {};
