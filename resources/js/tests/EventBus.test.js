import { describe, it, expect, vi } from 'vitest';
import EventBus from '../src/core/EventBus.js';

describe('EventBus', () => {
    it('calls subscribed handlers with emitted arguments', () => {
        const bus = new EventBus();
        const handler = vi.fn();
        bus.on('change', handler);

        bus.emit('change', 'value', 42);

        expect(handler).toHaveBeenCalledWith('value', 42);
    });

    it('unsubscribes via the function returned from on()', () => {
        const bus = new EventBus();
        const handler = vi.fn();
        const unsubscribe = bus.on('change', handler);

        unsubscribe();
        bus.emit('change');

        expect(handler).not.toHaveBeenCalled();
    });

    it('only invokes once() handlers a single time', () => {
        const bus = new EventBus();
        const handler = vi.fn();
        bus.once('save', handler);

        bus.emit('save');
        bus.emit('save');

        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('allows a handler to unsubscribe itself during emit without breaking iteration', () => {
        const bus = new EventBus();
        const second = vi.fn();
        const first = vi.fn(() => bus.off('change', first));

        bus.on('change', first);
        bus.on('change', second);
        bus.emit('change');

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('removes all listeners on destroy', () => {
        const bus = new EventBus();
        const handler = vi.fn();
        bus.on('change', handler);

        bus.destroy();
        bus.emit('change');

        expect(handler).not.toHaveBeenCalled();
    });
});
