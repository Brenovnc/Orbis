import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentedOption {
  value: string | number;
  label: string;
}

/** A row of mutually exclusive buttons (like radio buttons). */
@Component({
  selector: 'app-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex gap-1 rounded-lg bg-black/5 p-1 text-sm"
      role="group"
      [attr.aria-label]="label()"
    >
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="min-w-0 flex-1 rounded-md px-1 py-1.5 whitespace-nowrap"
          [class]="
            option.value === value()
              ? 'bg-white font-semibold shadow-sm'
              : 'text-ink-muted hover:bg-white/60'
          "
          [attr.aria-pressed]="option.value === value()"
          (click)="changed.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class SegmentedComponent {
  readonly label = input.required<string>();
  readonly options = input.required<SegmentedOption[]>();
  readonly value = input<string | number | null>(null);
  readonly changed = output<string | number>();
}
