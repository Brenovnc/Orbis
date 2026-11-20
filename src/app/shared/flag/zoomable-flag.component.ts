import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

/**
 * A flag that opens bigger when tapped or clicked, and closes the same way (or with Escape).
 * The big one is a modal dialog: it sits above everything, even inside a blurred panel.
 */
@Component({
  selector: 'app-zoomable-flag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <button
      type="button"
      class="block w-full cursor-zoom-in rounded-sm"
      [attr.aria-label]="alt() + '. ' + i18n.t('flag.enlarge')"
      [title]="i18n.t('flag.enlarge')"
      (click)="modal().nativeElement.showModal()"
    >
      <img [src]="src()" [alt]="alt()" [class]="imgClass()" />
    </button>
    <!-- A click on the backdrop closes it; the button inside and Escape are the keyboard ways. -->
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <dialog
      #dialog
      class="m-auto max-w-[92vw] cursor-zoom-out border-0 bg-transparent p-0"
      [attr.aria-label]="alt()"
      (click)="dialog.close()"
    >
      <button type="button" class="block" [attr.aria-label]="i18n.t('flag.close')">
        <img
          [src]="src()"
          [alt]="alt()"
          class="max-h-[80dvh] w-[min(92vw,34rem)] rounded-md object-contain shadow-panel ring-1 ring-black/20"
        />
      </button>
    </dialog>
  `,
  styles: `
    dialog::backdrop {
      background: rgb(15 25 35 / 0.6);
    }
  `,
})
export class ZoomableFlagComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly modal = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  /** Classes of the small image. */
  readonly imgClass = input('h-9 w-auto rounded-sm ring-1 ring-black/15');
}
