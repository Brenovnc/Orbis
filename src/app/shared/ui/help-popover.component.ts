import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { GameIconComponent } from './game-icon.component';

let nextId = 0;

/**
 * A round "i" button that shows or hides a small balloon under it with an explanation (its
 * content). Esc, a click outside or leaving it with Tab closes it.
 */
@Component({
  selector: 'app-help-popover',
  imports: [GameIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'onEscape($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <button
      #button
      type="button"
      class="grid size-11 place-items-center rounded-full text-ink-muted hover:bg-black/5"
      [attr.aria-label]="label()"
      [title]="label()"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? id : null"
      (click)="toggle()"
    >
      <app-game-icon name="info" />
    </button>
    @if (open()) {
      <div
        [id]="id"
        role="note"
        class="absolute top-full right-0 z-20 mt-1 max-h-[38dvh] w-[min(17rem,78vw)] animate-panel-in overflow-y-auto rounded-xl border border-line bg-panel-solid p-3 text-left font-sans text-sm leading-snug font-normal text-ink shadow-panel"
      >
        <ng-content />
      </div>
    }
  `,
})
export class HelpPopoverComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  protected readonly id = `help-popover-${nextId++}`;

  /** Says what the button explains, to screen readers and on hover. */
  readonly label = input.required<string>();

  protected readonly open = signal(false);

  protected toggle(): void {
    this.open.set(!this.open());
    // Safari does not focus a clicked button, and Esc only reaches the popover with the focus in it.
    this.button().nativeElement.focus();
  }

  /** The page also listens to Esc (it pauses the game), so it stops here. */
  protected onEscape(event: Event): void {
    if (!this.open()) return;
    event.stopPropagation();
    this.open.set(false);
    this.button().nativeElement.focus();
  }

  protected onDocumentClick(event: Event): void {
    if (!this.host.contains(event.target as Node)) this.open.set(false);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && !this.host.contains(next)) this.open.set(false);
  }
}
