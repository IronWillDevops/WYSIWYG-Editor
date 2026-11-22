import { vi } from 'vitest';

// jsdom does not implement window.scrollTo and logs "Not implemented" every
// time a Dialog closes. Browsers implement the call, so a silent stub keeps
// the shared test environment faithful without polluting the output.
window.scrollTo = vi.fn();
