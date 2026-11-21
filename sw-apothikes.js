/* 76 — Αποθήκες: η εφαρμογή έκλεισε (21/11/2026) για να μεταφερθεί στο e76.
   Αυτός ο service worker αντικαθιστά τον παλιό στα κινητά: σβήνει ΟΛΑ όσα κρατούσε η παλιά εφαρμογή
   (ώστε κανείς να μη βλέπει παλιά δεδομένα χωρίς σήμα), καταργεί τον εαυτό του και ξαναφορτώνει τις
   ανοιχτές σελίδες, που παίρνουν πλέον τη σελίδα «μεταφέρονται στο e76» απευθείας από το διαδίκτυο.
   Δεν πιάνει κανένα αίτημα (καμία μνήμη, καμία κλήση σε βάση). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const ks = await caches.keys();
    await Promise.all(ks.map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(function (c) { try { c.navigate(c.url); } catch (err) {} });
  })());
});
