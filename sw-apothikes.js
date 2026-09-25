/* 76 — Καταγραφή Υλικού · service worker
   Σκοπός: να ανοίγει η εφαρμογή ΚΑΙ χωρίς σήμα (μέσα στα container δεν πιάνει κινητό).
   Όπως το sw.js του e76 — και σκόπιμα συντηρητικό, γιατί ένα λάθος service worker «κολλάει»
   τα κινητά σε παλιά έκδοση (το πρόβλημα του Αυγούστου):
   · Σελίδα: ΠΡΩΤΑ το δίκτυο· μόνο αν δεν απαντήσει σε 4″ (ή δεν υπάρχει σήμα) → η αποθηκευμένη.
   · Βιβλιοθήκες με καρφωμένη έκδοση (supabase-js@2.117.1, xlsx@0.18.5, qrcode@1.5.4): πρώτα η μνήμη —
     δεν αλλάζουν ποτέ (και οι στατικές έχουν SRI).
   · ΔΕΔΟΜΕΝΑ (Supabase) και ο έλεγχος νέας έκδοσης: ΠΟΤΕ από τη μνήμη.
   Διακόπτης ανάγκης: αν χρειαστεί να σβήσει, αντικατέστησε αυτό το αρχείο με ένα που κάνει
   self.registration.unregister() — ή άλλαξε το VERSION για να καθαρίσει όλη η παλιά μνήμη. */
const VERSION = 'apothikes-v1';
const PAGE = '76-katagrafi-ylikou.html';
const PINNED = /^https:\/\/cdn\.jsdelivr\.net\/npm\/(@supabase\/supabase-js@\d+\.\d+\.\d+|xlsx@\d+\.\d+\.\d+|qrcode@\d+\.\d+\.\d+|dijkstrajs@\d+\.\d+\.\d+)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(['./' + PAGE, './manifest-apothikes.webmanifest', './icon-apothikes-192.png'])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                                   // εγγραφές: ποτέ από εδώ
  if (url.hostname.endsWith('.supabase.co')) return;                  // δεδομένα: πάντα ζωντανά
  if (url.searchParams.has('build-check')) return;                    // έλεγχος νέας έκδοσης: πάντα ζωντανός

  // βιβλιοθήκες με καρφωμένη έκδοση → μνήμη πρώτα
  if (PINNED.test(req.url)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
      return res;
    })));
    return;
  }
  // η σελίδα (και ό,τι άλλο από το ίδιο site) → δίκτυο πρώτα, μνήμη μόνο αν δεν απαντήσει
  if (url.origin === self.location.origin) {
    // ΜΟΝΟ η κύρια σελίδα γράφεται στη θέση της κύριας σελίδας (αλλιώς ένα preview θα έπιανε τη θέση της)
    const isMain = url.pathname.endsWith('/' + PAGE) || url.pathname.endsWith('/');
    const isNav = req.mode === 'navigate' || isMain;
    const key = isMain ? './' + PAGE : req;
    e.respondWith(Promise.race([fetch(req), timeout(isNav ? 4000 : 8000)]).then(res => {
      if (res && res.ok && res.status === 200) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(key, cp)); }
      return res;
    }).catch(() => caches.match(key).then(hit => hit || (isNav ? caches.match('./' + PAGE) : null)).then(hit => hit || new Response(
      '<!doctype html><meta charset="utf-8"><title>76</title><p style="font:16px system-ui;padding:24px">Χωρίς σύνδεση και χωρίς αποθηκευμένη έκδοση. Άνοιξε την εφαρμογή μία φορά με σήμα.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))));
  }
});
