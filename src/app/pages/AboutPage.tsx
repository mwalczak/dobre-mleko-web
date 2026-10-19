import { Link } from 'react-router-dom';
import { Brand } from '../../shared/components/Brand';

/** O aplikacji (publiczna, bez logowania): czym jest Dobre Mleko — dla gości, recenzentów sklepów i programów. */
export function AboutPage() {
  return (
    <div className="page narrow privacy about">
      <Brand />
      <h1 className="display">O aplikacji</h1>
      <p className="label">Dobre Mleko · est. 2026 · Rybnik</p>

      <p>
        <strong>Dobre Mleko</strong> to prywatna aplikacja do polecania i oceniania miejsc w zamkniętej grupie
        przyjaciół. Zamiast tysięcy anonimowych opinii widzisz oceny ludzi, których znasz i którym ufasz — kawiarnie,
        restauracje, bary, hotele i wszystko, co warto odwiedzić.
      </p>

      <h2 className="title">Co można w niej zrobić</h2>
      <ul>
        <li>
          <strong>Dodać miejsce</strong> — z wyszukiwarki adresów, z linku Google Maps albo pinezką na mapie.
        </li>
        <li>
          <strong>Ocenić je</strong> w skali 1–5 (klimat, oferta, obsługa, wartość), ze zdjęciami i datą wizyty.
        </li>
        <li>
          <strong>Przyznać Złotą Gwiazdkę</strong> — tylko trzy na miesiąc, więc trafiają do naprawdę wyjątkowych
          miejsc.
        </li>
        <li>
          <strong>Odkrywać</strong> polecenia znajomych na liście, na mapie i w pobliżu, z filtrami i tagami.
        </li>
        <li>
          <strong>Planować</strong> — lista „Chcę odwiedzić” z miejscami na później.
        </li>
        <li>
          <strong>Rozmawiać</strong> w komentarzach i porównywać gust — statystyki grupy i zgodność ocen z innymi.
        </li>
      </ul>

      <h2 className="title">Dla kogo</h2>
      <p>
        Do Dobrego Mleka wchodzi się tylko z zaproszenia. Dzięki temu oceny są szczere, a polecenia pochodzą od ludzi,
        których znasz. Nie ma reklam ani śledzenia — szczegóły w <Link to="/privacy">polityce prywatności</Link>.
      </p>

      <h2 className="title">Gdzie działa</h2>
      <p>
        Aplikacje na iPhone’a i Androida oraz wersja w przeglądarce na dobre-mleko.app — wszystkie korzystają z tego
        samego konta i tych samych danych. Aplikacja jest w fazie testów z pierwszą grupą użytkowników.
      </p>

      <h2 className="title">Kontakt</h2>
      <p>
        <a href="mailto:kontakt@dobre-mleko.app">kontakt@dobre-mleko.app</a>
      </p>

      <section lang="en" className="about-en">
        <h2 className="title">About Dobre Mleko (in English)</h2>
        <p>
          Dobre Mleko is a private, invite-only app for recommending and rating places — cafés, restaurants, bars,
          hotels and more — within a closed group of friends, so recommendations come from people you know and trust
          instead of anonymous reviews. Members add places (from an address search, a Google Maps link or a pin on the
          map), rate them on four criteria with photos, award a limited number of monthly “Gold Stars”, discover
          friends’ picks on a list or map, keep a “want to visit” list, comment and compare tastes.
        </p>
        <p>
          It is available as native iOS (Swift) and Android (Kotlin) apps and as a web app at dobre-mleko.app, all
          backed by one TypeScript API with PostgreSQL/PostGIS. The product is in beta with its first users in Rybnik,
          Poland. No ads, no tracking. Contact: <a href="mailto:kontakt@dobre-mleko.app">kontakt@dobre-mleko.app</a>.
        </p>
      </section>
    </div>
  );
}
