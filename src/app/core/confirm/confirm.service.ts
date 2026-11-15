import { Injectable, signal } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

export interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Asks the player to confirm something risky (leave, restart, give up) in a modal dialog. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.request()?.resolve(false);
    return new Promise((resolve) => this.request.set({ ...options, resolve }));
  }

  answer(ok: boolean): void {
    const request = this.request();
    this.request.set(null);
    request?.resolve(ok);
  }
}

/** Pages that must warn before being left implement this. */
export interface LeaveGuarded {
  confirmLeave(): boolean | Promise<boolean>;
}

export const leaveGuard: CanDeactivateFn<LeaveGuarded> = (page) => page.confirmLeave();
