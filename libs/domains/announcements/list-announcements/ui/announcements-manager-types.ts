export interface Announcement {
  id: number;
  title: string;
  bodyHtml: string;
  status: 'draft' | 'published';
  /** Sérialisées en ISO par l'API : le fuseau est déjà résolu. */
  publishedAt: string | null;
  notifiedAt: string | null;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
}
