import {ElementPart, nothing} from 'lit';
import {AsyncDirective} from 'lit/async-directive.js';
import {directive, DirectiveParameters} from 'lit/directive.js';

const INITIAL = 0;
const EXPANDED = 1;
const EXPANDING = 2;
const COLLAPSED = 3;
const COLLAPSING = 4;
type ExpandCollapseState =
  | typeof INITIAL
  | typeof EXPANDED
  | typeof EXPANDING
  | typeof COLLAPSED
  | typeof COLLAPSING;

// resolves next time the browser does a layout, normally this can be RAF + microtask but
// we are using a timeout becaue this works more consistent across (older) browsers
const nextLayout = () =>
  new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));

export interface ExpandCollapseOptions {
  duration: number;
  timingFunction?: typeof CSSStyleDeclaration.prototype.transitionTimingFunction;
}

class ExpandCollapseDirective extends AsyncDirective {
  private state: ExpandCollapseState = INITIAL;
  private element?: HTMLElement;

  setup(element: HTMLElement) {
    this.element = element;
    this.element.addEventListener('transitionend', this.onTransitionEnd);
    this.element.addEventListener('transitioncancel', this.onTransitionEnd);
  }

  teardown() {
    if (this.element) {
      this.element.removeEventListener('transitionend', this.onTransitionEnd);
      this.element.removeEventListener(
        'transitioncancel',
        this.onTransitionEnd
      );
    }
    this.element = undefined;
  }

  disconnected() {
    this.teardown();
  }

  render(_expanded: boolean, _options: ExpandCollapseOptions) {
    return nothing;
  }

  update(
    _elementPart: ElementPart,
    [expanded, options]: DirectiveParameters<this>
  ) {
    const el = _elementPart.element as HTMLElement;
    if (this.element !== el) {
      this.teardown();
      this.setup(el);
    }

    if (typeof options !== 'object') {
      throw new Error('Missing expand collapse options');
    }

    if (typeof options.duration !== 'number') {
      throw new Error('Missing duration in options');
    }

    if (expanded) {
      this.expand(options);
    } else {
      this.collapse(options);
    }
  }

  private async expand(opts: ExpandCollapseOptions) {
    if (!this.element || this.state === EXPANDED || this.state === EXPANDING) {
      return;
    }

    if (this.state === INITIAL || opts.duration === 0) {
      // no animation
      this.setExpanded();
      return;
    }
    this.state = EXPANDING;

    // Set overflow so that margins from children are added to the element's height
    this.element.style.setProperty('overflow', 'hidden');

    const currentHeight = this.element.getBoundingClientRect().height;
    // Remove display restrictions, so that we can calculate the desired height to transition to
    this.element.style.removeProperty('display');
    this.element.style.removeProperty('height');
    const desiredHeight = this.element.getBoundingClientRect().height;

    // Start from current height
    this.element.style.setProperty('height', `${currentHeight}px`);

    await nextLayout();

    if (!this.element || this.state !== EXPANDING) {
      // animation got canceled meanwhile
      return;
    }

    // animate to desired height.
    this.element.style.setProperty(
      'transition',
      `height ${opts.duration}ms ${opts.timingFunction || 'ease-in-out'}`
    );
    this.element.style.setProperty('height', `${desiredHeight}px`);
  }

  private async collapse(opts: ExpandCollapseOptions) {
    if (
      !this.element ||
      this.state === COLLAPSED ||
      this.state === COLLAPSING
    ) {
      return;
    }

    if (this.state === INITIAL || opts.duration === 0) {
      // no animation
      this.setCollapsed();
      return;
    }
    this.state = COLLAPSING;

    // Set overflow so that margins from children are added to the element's height
    this.element.style.setProperty('overflow', 'hidden');

    // Current height is where we should transition from
    const currentHeight = this.element.getBoundingClientRect().height;
    this.element.style.setProperty('height', `${currentHeight}px`);

    // wait for layout to start animating
    await nextLayout();

    if (!this.element || this.state !== COLLAPSING) {
      // animation got canceled meanwhile
      return;
    }

    this.element.style.transition = `height ${opts.duration}ms ${
      opts.timingFunction || 'ease-in-out'
    }`;
    this.element.style.setProperty('height', '0');
  }

  private setExpanded() {
    if (this.element && this.state !== INITIAL) {
      this.element.style.removeProperty('transition');
      this.element.style.removeProperty('height');
      this.element.style.removeProperty('display');
      this.element.style.removeProperty('overflow');
    }
    this.state = EXPANDED;
  }

  private setCollapsed() {
    if (this.element) {
      this.element.style.removeProperty('transition');
      this.element.style.removeProperty('overflow');
      this.element.style.setProperty('height', '0');
      this.element.style.setProperty('display', 'none');
    }
    this.state = COLLAPSED;
  }

  private onTransitionEnd = (e: TransitionEvent) => {
    if (e.propertyName === 'height' && e.target === this.element) {
      if (this.state === EXPANDING) {
        this.setExpanded();
      } else if (this.state === COLLAPSING) {
        this.setCollapsed();
      }
    }
  };
}

// Create the directive function
export const expandCollapse = directive(ExpandCollapseDirective);
