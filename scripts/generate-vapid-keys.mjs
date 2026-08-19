#!/usr/bin/env node
/**
 * Génère une paire de clés VAPID pour les notifications push (RFC 8292).
 *
 * À exécuter UNE SEULE FOIS par environnement (production, staging). Changer les
 * clés d'un environnement déjà en service invalide tous les abonnements existants :
 * les appareils devront être réabonnés un par un.
 *
 * Usage :
 *   node scripts/generate-vapid-keys.mjs
 */

import { webcrypto } from 'node:crypto';

const base64UrlEncode = (bytes) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify'
]);

const publicKey = base64UrlEncode(new Uint8Array(await webcrypto.subtle.exportKey('raw', pair.publicKey)));
const { d: privateKey } = await webcrypto.subtle.exportKey('jwk', pair.privateKey);

console.log(`
Clés VAPID générées.

1. Worker nba-api — la clé privée est un secret, jamais une var :

   npx wrangler secret put VAPID_PRIVATE_KEY --config apps/api/wrangler.json
   ${privateKey}

   npx wrangler secret put VAPID_PUBLIC_KEY --config apps/api/wrangler.json
   ${publicKey}

   (ajouter --env staging pour l'environnement de test)

2. Build du storefront — la clé publique est inlinée dans le bundle client.
   À définir comme variable d'environnement de la CI :

   PUBLIC_VAPID_PUBLIC_KEY=${publicKey}

3. VAPID_SUBJECT est déjà défini dans apps/api/wrangler.json.
`);
