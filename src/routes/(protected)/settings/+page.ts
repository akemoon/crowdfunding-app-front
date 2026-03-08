import { redirect } from '@sveltejs/kit';

// /settings → /settings/profile
export function load() {
  throw redirect(302, '/settings/profile');
}
