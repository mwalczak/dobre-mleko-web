/** Dobre Mleko in Google Play. */
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=app.dobremleko';

/** Google Play with an install referrer: the Android app opens the shared place after installing (DM-45). */
export const playUrlForShare = (token: string) => `${PLAY_URL}&referrer=${encodeURIComponent(`share=${token}`)}`;

/** The text sent with a shared place — the same in the apps. */
export function shareText(name: string, rating: string | null, url: string): string {
  const score = rating ? ` ${rating}/5` : '';
  return `Polecam Ci ${name} 🥛${score} w Dobrym Mleku — apce, w której przyjaciele polecają sobie miejsca: ${url}`;
}
