import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { ConfirmService } from '../../core/confirm/confirm.service';

/** Modal dialog for ConfirmService. The native <dialog> traps focus and handles Esc for us. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    dialog::backdrop {
      background: rgb(20 40 60 / 0.4);
    }
  `,
  template: `
    <dialog
      #dialog
      class="m-auto w-[min(92vw,24rem)] rounded-2xl bg-panel-solid p-5 text-ink shadow-panel"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      (cancel)="$event.preventDefault(); confirm.answer(false)"
    >
      @if (confirm.request(); as request) {
        <h2 id="confirm-title" class="font-serif text-xl font-semibold">{{ request.title }}</h2>
        <p id="confirm-message" class="mt-2 text-sm text-ink-muted">{{ request.message }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="btn-secondary" autofocus (click)="confirm.answer(false)">
            {{ request.cancelLabel }}
          </button>
          <button type="button" class="btn-primary" (click)="confirm.answer(true)">
            {{ request.confirmLabel }}
          </button>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;
      const open = this.confirm.request() !== null;
      if (open && !element.open) element.showModal();
      if (!open && element.open) element.close();
    });
  }
}
