import type { Championship } from '../shared/championship';

export interface PublishRostersInput {
  seasonCode: string;
  championship: Championship;
  /** `true` publie effectifs et staff aux adhérents, `false` les retire pour refaire des essais. */
  published: boolean;
}

export interface PublishRostersOutput {
  championship: Championship;
  /** Date de publication, ISO. `null` : effectifs en brouillon. */
  rostersPublishedAt: string | null;
}
