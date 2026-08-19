import { type Db, AppError } from '@nba/db';
import { sanitizeRichText, isSafeHref, CMS_PROFILE } from '@nba/html';
import { isOrderedRange } from '../shared/event';
import { InvalidEventDatesError } from '../shared/errors';
import { CreateEventRepository } from './repository';
import type { CreateEventInput, CreateEventOutput } from './dto';

/** Slug dérivé du titre, suffixé par la date : deux stages portent le même nom. */
function slugify(title: string, startsAt: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base}-${startsAt.slice(0, 10)}`;
}

export async function createEvent(
  db: Db, input: CreateEventInput, now: Date = new Date()
): Promise<CreateEventOutput> {
  const repo = new CreateEventRepository();

  if (!isOrderedRange(input.startsAt, input.endsAt ?? null)) throw new InvalidEventDatesError();

  const slug = input.slug ?? slugify(input.title, input.startsAt);
  if (await repo.findBySlug(db, slug)) {
    throw new AppError(`Un événement porte déjà l'adresse « ${slug} ».`, 409);
  }

  // Le lien sortant est une URL affichée telle quelle : un `javascript:` y serait un
  // vecteur direct. On le refuse plutôt que de le nettoyer à l'affichage.
  const externalUrl = input.externalUrl && isSafeHref(input.externalUrl) ? input.externalUrl : null;

  return repo.insert(db, {
    slug,
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    allDay: input.allDay ?? false,
    category: input.category,
    venueLabel: input.venueLabel ?? null,
    descriptionHtml: input.descriptionHtml ? sanitizeRichText(input.descriptionHtml, CMS_PROFILE) : null,
    externalUrl,
    status: 'draft',
    createdAt: now,
    updatedAt: now
  });
}
