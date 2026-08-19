import type { AgendaEvent } from './agenda';
import type { MyFixture } from './my-fixtures';

export interface FixtureEntry {
  /** La rencontre présentée comme un événement d'agenda, catégorie `interclubs`. */
  event: AgendaEvent;
  fixture: MyFixture;
  /** La date affichée n'est que le lundi de la semaine : le capitaine doit la préciser. */
  provisional: boolean;
}

/**
 * Les rencontres d'interclubs, converties en événements d'agenda.
 *
 * Elles empruntent la catégorie `interclubs` plutôt qu'une présentation à part : c'est le
 * même rendez-vous pour l'adhérent, il doit se repérer à la même couleur et se lire sur la
 * même ligne. Une seconde présentation aurait fini par diverger de la première.
 *
 * **Trois dates possibles, dans cet ordre.** Celle que le capitaine a saisie fait foi,
 * heure comprise. À défaut, le jour commun du calendrier — le dimanche des vétérans. À
 * défaut encore, le **lundi de la semaine théorique** : le mixte et le masculin se jouent
 * en semaine sans jour commun, et seul le capitaine peut préciser lequel. On place alors
 * la rencontre en début de semaine et on le dit, plutôt que de la taire jusqu'à sa saisie.
 *
 * Ces lignes ne portent aucune inscription : on ne s'inscrit pas à une rencontre, on y est
 * aligné. `registration: 'none'` retire donc tout bouton.
 */
export function toFixtureEntries(fixtures: MyFixture[]): FixtureEntry[] {
  return fixtures.map((fixture) => {
    const provisional = fixture.date === null;
    const day = fixture.date ?? fixture.weekStart;
    // Une date sans heure — le dimanche des vétérans, ou le lundi de repli — occupe la
    // journée : lui inventer un horaire ferait arriver les joueurs à la mauvaise heure.
    const timed = day.length > 10;

    const dayLabel = fixture.dayLabel ?? `J${fixture.dayNumber}`;
    const against = fixture.opponent
      ? ` ${fixture.home ? 'contre' : 'chez'} ${fixture.opponent}`
      : '';

    return {
      fixture,
      provisional,
      event: {
        // Identifiant négatif : ces lignes ne sont pas des événements du club, et rien ne
        // doit pouvoir les confondre avec un identifiant réel.
        id: -(fixture.teamId * 1000 + fixture.dayNumber),
        slug: `interclubs-${fixture.teamId}-${fixture.dayNumber}`,
        title: `${fixture.teamName} · ${dayLabel}${against}`,
        startsAt: timed ? day : `${day.slice(0, 10)}T00:00`,
        endsAt: null,
        allDay: !timed,
        category: 'interclubs',
        venueLabel: fixture.venue,
        externalUrl: null,
        registration: 'none',
        registrationCount: 0,
        attendeeCount: 0,
        myGuests: null
      }
    };
  });
}
