import {Injectable, signal, computed} from '@angular/core';
import {Relative} from "../domain/model/relative.entity";
import {RelativesApi} from "../infrastructure/relatives-api";
import {take} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RelativesStore {

    private readonly _selectedRelative = signal<Relative | null>(null);
    readonly selectedRelative = this._selectedRelative.asReadonly();

    private readonly loadingSignal = signal<boolean>(false);
    readonly loading = this.loadingSignal.asReadonly();

    private readonly errorSignal = signal<string | null>(null);
    readonly error = this.errorSignal.asReadonly();

    constructor(private relativesApi: RelativesApi) {}

    /**
     * Loads a relative by userId (since the route uses userId as relativeId)
     * @param userId - The user ID to load the relative for
     */
    loadRelativeById(userId: number): void {
        console.log(`[RelativesStore] Loading relative for userId: ${userId}`);
        this.loadingSignal.set(true);
        this.errorSignal.set(null);

        this.relativesApi.getRelativeByUserId(userId).pipe(take(1)).subscribe({
            next: (relative) => {
                console.log('[RelativesStore] ✅ Relative loaded:', relative);
                this._selectedRelative.set(relative);
                this.loadingSignal.set(false);
            },
            error: (err) => {
                console.error(`[RelativesStore] ❌ Error loading relative for userId ${userId}:`, err);
                const errorMessage = this.formatError(err, 'Failed to load relative');
                this.errorSignal.set(errorMessage);
                this.loadingSignal.set(false);
                this._selectedRelative.set(null);
            }
        });
    }

    /**
     * Formats an error into a user-friendly message
     */
    private formatError(err: any, defaultMessage: string): string {
        if (err?.error?.message) {
            return err.error.message;
        }
        if (err?.message) {
            return err.message;
        }
        if (err?.status === 404) {
            return 'Relative not found';
        }
        if (err?.status === 0) {
            return 'Unable to connect to server. Please check your connection.';
        }
        return defaultMessage;
    }

    /**
     * Clears the selected relative and error state
     */
    clearRelative(): void {
        this._selectedRelative.set(null);
        this.errorSignal.set(null);
        this.loadingSignal.set(false);
    }
}
