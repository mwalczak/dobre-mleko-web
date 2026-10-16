import { Link } from 'react-router-dom';
import { Brand } from '../../shared/components/Brand';

/** Jak usunąć konto (publiczna, bez logowania) — adres podany w Google Play (Bezpieczeństwo danych). */
export function DeleteAccountPage() {
  return (
    <div className="page narrow privacy">
      <Brand />
      <h1 className="display">Usuń konto</h1>
      <p className="label">Dobre Mleko · iOS, Android i dobre-mleko.app</p>

      <p>
        Konto w Dobrym Mleku usuniesz sam, w każdej chwili. Usunięcie działa od razu i obejmuje wszystkie urządzenia —
        nie da się go cofnąć.
      </p>

      <h2 className="title">W aplikacji</h2>
      <ol>
        <li>Otwórz Dobre Mleko na iPhonie lub Androidzie i zaloguj się.</li>
        <li>
          Wejdź w <strong>Ja → Ustawienia</strong>.
        </li>
        <li>
          Stuknij <strong>Usuń konto</strong> i potwierdź.
        </li>
      </ol>

      <h2 className="title">Na stronie</h2>
      <ol>
        <li>
          Zaloguj się na <Link to="/">dobre-mleko.app</Link>.
        </li>
        <li>
          Wejdź w <strong>Ja → Profil</strong>.
        </li>
        <li>
          Kliknij <strong>Usuń konto</strong> i potwierdź.
        </li>
      </ol>

      <h2 className="title">Mailem</h2>
      <p>
        Nie możesz się zalogować? Napisz z adresu, którym logujesz się do aplikacji, na{' '}
        <a href="mailto:kontakt@dobre-mleko.app?subject=Usuni%C4%99cie%20konta">kontakt@dobre-mleko.app</a> — usuniemy
        konto w ciągu 30 dni i potwierdzimy to odpowiedzią.
      </p>

      <h2 className="title">Co usuwamy</h2>
      <ul>
        <li>adres e-mail, imię, odznakę i zdjęcie profilowe,</li>
        <li>powiązanie z kontem Google lub Apple,</li>
        <li>zapisane miejsca, listę „Chcę odwiedzić”, ulubione kategorie i ustawienia powiadomień,</li>
        <li>urządzenia zarejestrowane do powiadomień push,</li>
        <li>Twój adres z listy zaproszonych osób.</li>
      </ul>

      <h2 className="title">Co zostaje</h2>
      <p>
        Dodane miejsca, oceny, zdjęcia miejsc i komentarze zostają w aplikacji bez Twoich danych — podpisane „Były
        członek” — żeby nie psuć ocen i dyskusji innych osób. Jeśli chcesz usunąć również je, napisz na adres wyżej.
        Logi serwera znikają same po krótkim czasie.
      </p>

      <p>
        Więcej: <Link to="/privacy">polityka prywatności</Link>.
      </p>
    </div>
  );
}
