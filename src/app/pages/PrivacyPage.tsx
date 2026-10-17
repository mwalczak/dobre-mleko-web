import { Link } from 'react-router-dom';
import { Brand } from '../../shared/components/Brand';

/** Polityka prywatności (publiczna, bez logowania) — adres podany w App Store Connect i Google Play. */
export function PrivacyPage() {
  return (
    <div className="page narrow privacy">
      <Brand />
      <h1 className="display">Polityka prywatności</h1>
      <p className="label">Obowiązuje od 16 października 2026</p>

      <p>
        Dobre Mleko to prywatna aplikacja do polecania miejsc w zamkniętej grupie przyjaciół (iOS, Android i strona
        dobre-mleko.app). Tu opisujemy, jakie dane przetwarzamy, po co i jakie masz prawa.
      </p>

      <h2 className="title">Administrator danych</h2>
      <p>
        Administratorem danych jest twórca aplikacji Dobre Mleko. Kontakt w sprawach prywatności:{' '}
        <a href="mailto:kontakt@dobre-mleko.app">kontakt@dobre-mleko.app</a>.
      </p>

      <h2 className="title">Jakie dane przetwarzamy</h2>
      <ul>
        <li>
          <strong>Konto Google lub Apple:</strong> adres e-mail, imię i zdjęcie profilowe — do logowania i sprawdzenia,
          czy jesteś na liście zaproszonych osób.
        </li>
        <li>
          <strong>Profil:</strong> wyświetlana nazwa, odznaka i ulubione kategorie — widzą je inni członkowie.
        </li>
        <li>
          <strong>Twoje treści:</strong> dodane miejsca, oceny, zdjęcia, komentarze, Złote Gwiazdki, zapisane miejsca i
          lista „Chcę odwiedzić” — widzą je inni członkowie.
        </li>
        <li>
          <strong>Lokalizacja (opcjonalnie, za Twoją zgodą):</strong> pozycja urządzenia — przybliżona albo dokładna,
          zależnie od zgody wybranej w telefonie lub przeglądarce. Wysyłamy ją z zapytaniami, żeby pokazać odległości do
          miejsc, mapę wokół Ciebie i podpowiedzi adresów w pobliżu. Nie zapisujemy jej i nie pokazujemy innym.
        </li>
        <li>
          <strong>Powiadomienia (opcjonalnie, za Twoją zgodą):</strong> identyfikator urządzenia do powiadomień push i
          Twoje ustawienia powiadomień.
        </li>
        <li>
          <strong>Wyszukiwanie adresów:</strong> gdy dodajesz miejsce, wpisany tekst i fragment mapy, który oglądasz,
          trafiają do wyszukiwarki adresów (patrz niżej). Jeśli wkleisz link z Google Maps, nasz serwer odczytuje z
          niego nazwę i współrzędne miejsca; link zapisujemy przy miejscu.
        </li>
        <li>
          <strong>Zgłoszenia (gdy coś zgłosisz):</strong> treść zgłoszenia błędu, pomysłu lub nadużycia, Twoje imię i
          adres e-mail — trafiają do naszego trackera zgłoszeń (PMO), który zakłada Ci tam konto, wysyła e-mailem klucz
          do śledzenia zgłoszeń i informuje o zmianach ich statusu. Zgłoszenia nadużyć widzą tylko administratorzy;
          pozostałe zgłoszenia, bez imienia i e-maila, widzą inni członkowie.
        </li>
        <li>
          <strong>Dane techniczne:</strong> logi serwera (np. adres IP, czas zapytania) potrzebne do działania i
          bezpieczeństwa usługi, przechowywane krótko.
        </li>
      </ul>

      <h2 className="title">Czego nie robimy</h2>
      <p>
        Nie wyświetlamy reklam, nie śledzimy Cię w innych aplikacjach ani na stronach, nie sprzedajemy i nie
        udostępniamy danych w celach marketingowych.
      </p>

      <h2 className="title">Komu przekazujemy dane</h2>
      <ul>
        <li>
          <strong>Google</strong> — logowanie kontem Google; powiadomienia push na Androidzie (Firebase Cloud
          Messaging); odczytanie wklejonego linku z Google Maps.
        </li>
        <li>
          <strong>Apple</strong> — logowanie przez Apple; powiadomienia push na iPhonie (Apple Push Notification
          service); wyszukiwanie adresów na iPhonie (Apple Maps).
        </li>
        <li>
          <strong>Dostawcy map</strong> (OpenFreeMap / OpenStreetMap) — pobieranie kafelków mapy; widzą adres IP
          urządzenia, nie Twoje dane konta.
        </li>
        <li>
          <strong>Wyszukiwarki adresów OpenStreetMap</strong> (Photon, Nominatim) — na Androidzie i w przeglądarce:
          wpisany tekst, przybliżony obszar mapy i adres IP urządzenia, bez danych konta.
        </li>
        <li>
          <strong>PMO</strong> — nasz tracker zgłoszeń, działający na naszym serwerze; e-maile z niego wysyłamy przez
          Gmail (Google).
        </li>
        <li>
          <strong>Hosting</strong> — serwer, na którym działa usługa i przechowywane są dane oraz zdjęcia.
        </li>
      </ul>

      <h2 className="title">Jak długo</h2>
      <p>
        Dane konta i treści przechowujemy, dopóki masz konto. Po usunięciu konta usuwamy dane osobowe; Twoje treści mogą
        zostać w aplikacji jako anonimowe („Były członek”), żeby nie psuć ocen i dyskusji innych osób. Zgłoszenia i
        konto w trackerze zgłoszeń zostają po usunięciu konta w aplikacji — usuniemy je na prośbę wysłaną na adres
        powyżej.
      </p>

      <h2 className="title">Twoje prawa</h2>
      <p>
        Masz prawo do dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia oraz
        sprzeciwu, a także do wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych. Kopię swoich danych
        wyeksportujesz w ustawieniach aplikacji; w pozostałych sprawach napisz na adres powyżej. Zgody na lokalizację i
        powiadomienia zmienisz w ustawieniach telefonu.
      </p>

      <h2 className="title">Usunięcie konta</h2>
      <p>
        Konto usuniesz sam w aplikacji (Ja → Ustawienia → Usuń konto) albo na stronie (Ja → Profil → Usuń konto) — od
        razu i bez pytania nas o zgodę. Możesz też poprosić o to mailem. Szczegóły:{' '}
        <Link to="/usun-konto">dobre-mleko.app/usun-konto</Link>.
      </p>

      <h2 className="title">Dzieci</h2>
      <p>Dobre Mleko nie jest przeznaczone dla osób poniżej 13 lat.</p>

      <h2 className="title">Zmiany</h2>
      <p>O istotnych zmianach tej polityki poinformujemy w aplikacji.</p>
    </div>
  );
}
