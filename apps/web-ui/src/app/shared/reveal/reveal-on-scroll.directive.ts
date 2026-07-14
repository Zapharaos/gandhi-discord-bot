import { Directive, ElementRef, inject, input, OnDestroy, OnInit, Renderer2 } from '@angular/core';

// Shared across every instance: one observer is cheaper than one-per-element.
let sharedObserver: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, () => void>();

function getObserver(): IntersectionObserver {
  sharedObserver ??= new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          callbacks.get(entry.target)?.();
          observer.unobserve(entry.target);
          callbacks.delete(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  return sharedObserver;
}

/**
 * Fades/slides an element in the first time it scrolls into view. Zoneless- and
 * OnPush-safe: it only toggles a CSS class (see `.reveal` in styles.scss), never
 * touches change detection. Honours `prefers-reduced-motion` by revealing at once.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: { class: 'reveal' },
})
export class RevealOnScrollDirective implements OnInit, OnDestroy {
  /** Optional stagger, in ms, applied as transition-delay. */
  readonly revealDelay = input(0);

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private host!: HTMLElement;

  ngOnInit(): void {
    this.host = this.el.nativeElement;

    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      this.reveal();
      return;
    }

    if (this.revealDelay()) {
      this.renderer.setStyle(this.host, 'transition-delay', `${this.revealDelay()}ms`);
    }
    callbacks.set(this.host, () => this.reveal());
    getObserver().observe(this.host);
  }

  ngOnDestroy(): void {
    if (this.host) {
      sharedObserver?.unobserve(this.host);
      callbacks.delete(this.host);
    }
  }

  private reveal(): void {
    this.renderer.addClass(this.host, 'is-visible');
  }
}
