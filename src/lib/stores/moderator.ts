import { writable } from 'svelte/store';
import type { ModeratorApplication } from '$lib/api';

// Holds the application the moderator is currently reviewing.
// Set before navigating to /moderator/[id], cleared on leave.
export const currentApplication = writable<ModeratorApplication | null>(null);
