import { ApiError } from './api';

/** Messages for the API's error codes, as people should see them. */
const MESSAGES: Record<string, string> = {
  not_authenticated: 'Zaloguj się ponownie.',
  not_authorized: 'Brak dostępu — to konto nie jest na liście albo nie ma uprawnień.',
  not_found: 'Nie znaleziono.',
  invalid_input: 'Sprawdź wpisane dane.',
  email_not_verified: 'Adres e-mail w Google nie jest potwierdzony.',
  invalid_google_token: 'Logowanie Google nie powiodło się. Spróbuj jeszcze raz.',
  no_gold_stars_left: 'Nie masz już złotych gwiazdek w tym miesiącu.',
  gold_star_already_awarded: 'To miejsce ma już Twoją gwiazdkę w tym miesiącu.',
  gold_star_revoke_window_passed: 'Gwiazdkę można cofnąć tylko w miesiącu, w którym ją przyznano.',
  rating_needs_photo: 'Ocena musi mieć co najmniej jedno zdjęcie.',
  too_many_photos: 'Za dużo zdjęć.',
  place_exists: 'To miejsce już jest na mapie.',
  unsupported_type: 'Zdjęcie musi być w formacie JPEG, PNG lub WebP.',
  file_too_large: 'Zdjęcie jest za duże.',
  already_allowed: 'Ta osoba już jest na liście.',
  managed_by_environment: 'Ten admin jest ustawiony w ADMIN_EMAILS — zmień to w konfiguracji serwera.',
  cannot_change_self: 'Nie możesz odebrać uprawnień samemu sobie.',
  category_exists: 'Kategoria o tej nazwie lub identyfikatorze już istnieje.',
  category_in_use: 'Ta kategoria ma miejsca — możesz ją tylko wycofać.',
  last_category: 'Co najmniej jedna kategoria musi zostać aktywna.',
  reports_unavailable: 'Zgłoszenia są chwilowo niedostępne. Spróbuj za chwilę.',
  unrecognized_link: 'To nie wygląda na link do miejsca w Google Maps. Skopiuj go przez Udostępnij → Kopiuj link.',
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    // Validation messages from the API are technical; show the generic one with the field hint when short.
    return MESSAGES[err.code] ?? err.message;
  }
  if (err instanceof TypeError) return 'Brak połączenia z serwerem.';
  return err instanceof Error ? err.message : 'Coś poszło nie tak.';
}
