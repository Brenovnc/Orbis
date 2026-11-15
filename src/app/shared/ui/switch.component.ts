import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** An on/off switch with a label and an optional hint. Works with Tab and Space. */
@Component({
  selector: 'app-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      class="flex items-start gap-3 py-2"
      [class.cursor-pointer]="!disabled()"
      [class.opacity-60]="disabled()"
    >
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-medium">
          {{ label() }}
          @if (tag()) {
            <span
              class="ml-1.5 rounded bg-black/5 px-1.5 py-0.5 align-middle text-[0.65rem] font-medium text-ink-muted"
              >{{ tag() }}</span
            >
          }
        </span>
        @if (hint()) {
          <span class="mt-0.5 block text-xs text-ink-muted">{{ hint() }}</span>
        }
      </span>
      <input
        type="checkbox"
        role="switch"
        class="peer sr-only"
        [checked]="checked()"
        [disabled]="disabled()"
        (change)="changed.emit($any($event.target).checked)"
      />
      <!-- The knob moves, so the state does not depend on color alone. -->
      <span
        class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-black/25 transition-colors after:absolute after:top-0.5 after:left-0.5 after:grid after:size-5 after:place-items-center after:rounded-full after:bg-white after:text-[0.7rem] after:leading-none after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-5 peer-checked:after:text-accent peer-checked:after:content-['✓'] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
        aria-hidden="true"
      ></span>
    </label>
  `,
})
export class SwitchComponent {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  /** Small tag next to the label (for example "next game"). */
  readonly tag = input<string>();
  readonly checked = input.required<boolean>();
  readonly disabled = input(false);
  readonly changed = output<boolean>();
}
