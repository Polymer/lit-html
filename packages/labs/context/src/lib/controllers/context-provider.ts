import {ContextEvent} from '../context-event.js';
import {AnyContext, ContextType} from '../create-context.js';
import {ContextContainer} from './context-container.js';
import {ReactiveController, ReactiveElement} from 'lit';

/**
 * A ReactiveController which can add context provider behavior to a
 * custom-element.
 *
 * This controller simply listens to the `context-request` event when
 * the host is connected to the DOM and registers the received callbacks
 * against its observable Context implementation.
 */
export class ContextProvider<T extends AnyContext>
  extends ContextContainer<ContextType<T>>
  implements ReactiveController {
  constructor(
    protected host: ReactiveElement,
    private name: T,
    defaultValue?: ContextType<T>
  ) {
    super(defaultValue);
    this.host.addController(this);
  }

  public onContextRequest = (ev: ContextEvent<AnyContext>): void => {
    if (ev.name !== this.name) {
      return;
    }
    ev.stopPropagation();
    this.addCallback(ev.callback, ev.multiple);
  };
  hostConnected(): void {
    this.host.addEventListener('context-request', this.onContextRequest);
  }
  hostDisconnected(): void {
    this.clearCallbacks();
  }
}
