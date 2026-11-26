import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import CaisseApp from './CaisseApp.svelte';

/*
  Une commande que la carte ne couvre pas : la caisse la recharge, puis revient d'elle-même à la
  commande, solde à jour. Avant, il fallait quitter la commande, recharger depuis « Articles » et
  la retrouver — ou ressaisir ses articles à la main, et la commande restait sans trace.
*/

const ORDER_ID = 7;
const order = (availableCents: number) => ({
  id: ORDER_ID,
  number: 3,
  createdAt: '2026-08-30T11:55:00Z',
  label: 'cli…@example.org',
  availableCents,
  totalCents: 600,
  lines: [{ name: 'Sandwich', quantity: 1, unitPriceCents: 600, available: true }]
});

let available = 0;
let scannedOrderId: number | null = ORDER_ID;
const posted: { path: string; body: any }[] = [];

const ok = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200 });

const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const path = url.replace(/^\/api\//, '');
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  if (body !== undefined) posted.push({ path, body });
  if (path === 'items') return ok([{ id: 1, name: 'Sandwich', priceCents: 600, active: true }]);
  if (path === 'sessions/current') {
    return ok({ session: { id: 1 }, expectedCashCents: 0, cardPaymentsEnabled: true, salesCount: 0, cardCents: 0, inProgress: [], toRefund: [] });
  }
  if (path === 'orders') return ok([order(available)]);
  if (path === `orders/${ORDER_ID}`) return ok(order(available));
  if (path === 'cards/scan') {
    return ok({ scanToken: 'jeton', label: 'cli…@example.org', balanceCents: available, pendingOrderId: scannedOrderId, kind: 'account' });
  }
  if (path === 'sales') {
    available += body.rechargeCents ?? 0;
    return ok({ sale: { id: 1, itemsCents: 0, rechargeCents: body.rechargeCents ?? 0, cashCents: body.expectedCashCents, cardCents: 0, prepaidCents: 0 } });
  }
  return new Response(JSON.stringify({ success: false, error: `inattendu : ${path}` }), { status: 404 });
});

const settle = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();
  }
};

const text = () => document.body.textContent ?? '';

async function click(label: string | RegExp) {
  const button = [...document.body.querySelectorAll('button')].find((b) =>
    typeof label === 'string' ? b.textContent?.trim() === label : label.test(b.textContent ?? '')
  );
  if (!button) throw new Error(`Bouton introuvable : ${label}`);
  button.click();
  await settle();
}

async function typeCode(value: string) {
  const input = document.body.querySelector<HTMLInputElement>('input[aria-label^="Code affiché"]')!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
  input.form!.requestSubmit();
  await settle();
}

describe('caisse : commande que la carte ne couvre pas', () => {
  let app: ReturnType<typeof mount> | undefined;

  beforeEach(async () => {
    available = 0;
    scannedOrderId = ORDER_ID;
    posted.length = 0;
    localStorage.clear();
    vi.stubGlobal('fetch', fetchMock);
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(CaisseApp, { target, props: { affiliateKey: '', clubName: 'Club' } });
    await settle();
    await click(/Commandes/);
    await click(/N° 3/);
  });

  afterEach(() => {
    if (app) unmount(app);
    app = undefined;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('recharge la carte puis revient à la commande, qui s\'encaisse sur la carte', async () => {
    expect(text()).toContain('il manque 6,00');
    await click(/Recharger la carte/);
    expect(text()).toContain('Il manque 6,00');
    expect(text()).not.toContain('Vendre une carte papier');

    await click('10 €');
    await typeCode('code-du-client');
    // La recharge se paie tout de suite, seule.
    expect(text()).toContain('10,00');
    await click(/Espèces/);
    await click('Montant exact');
    expect(posted.find((p) => p.path === 'sales')?.body).toMatchObject({ rechargeCents: 1000, rechargeScanToken: 'jeton', lines: [] });

    await click('Nouvelle vente');
    expect(text()).toContain('Commande n° 3');
    expect(text()).toContain('Disponible sur la carte : 10,00');
    expect(text()).not.toContain('il manque');
    expect(localStorage.length).toBe(0);
  });

  it('refuse de recharger une autre carte que celle de la commande', async () => {
    scannedOrderId = null;
    await click(/Recharger la carte/);
    await click('10 €');
    await typeCode('code-d-un-autre');
    expect(text()).toContain("Ce n'est pas la carte de la commande n° 3");
    expect(posted.some((p) => p.path === 'sales')).toBe(false);
  });

  it("propose de se reconnecter quand le serveur ne répond plus, réseau présent", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    await click('Encaisser la commande');
    await click('Espèces');
    await click('Montant exact');
    const link = [...document.body.querySelectorAll('a')].find((a) => a.textContent?.includes('Se reconnecter') && a.getAttribute('href')?.includes('depuis=caisse'));
    expect(link).toBeDefined();
  });

  it('se propose aussi depuis les moyens de paiement, et le retour ramène à la commande', async () => {
    await click('Encaisser la commande');
    await click(/Recharger la carte d'abord/);
    expect(text()).toContain('Recharger la carte cli…@example.org');
    await click(/Commande n° 3/);
    expect(text()).toContain('Encaisser la commande');
    expect(localStorage.length).toBe(0);
  });
});
