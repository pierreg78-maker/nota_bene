/* sw.js — Service worker de Keep
   À déposer dans le MÊME dossier que le fichier HTML.

   Rôles :
   1. Notifications système sur Android (via showNotification).
   2. Mode hors ligne : sert la dernière version de l'appli,
      ou la copie en cache si le réseau est coupé.
*/
const CACHE='keep-cache-v1';

/* Installation : mise en cache de la page */
self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(['./']))
      .then(()=>self.skipWaiting())
  );
});

/* Activation : nettoyage des anciens caches */
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

/* Réseau d'abord (toujours la dernière version), cache en secours hors ligne */
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||!req.url.startsWith(self.location.origin))return;
  e.respondWith(
    fetch(req).then(res=>{
      const copie=res.clone();
      caches.open(CACHE).then(c=>c.put(req,copie)).catch(()=>{});
      return res;
    }).catch(()=>caches.match(req,{ignoreSearch:true})
        .then(r=>r||caches.match('./')))
  );
});

/* Clic sur une notification Android : ramener l'appli au premier plan
   et ouvrir la note concernée. */
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const noteId=e.notification.data&&e.notification.data.noteId;
  e.waitUntil(
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
      for(const c of clients){
        if('focus' in c){
          if(noteId)c.postMessage({type:'open-note',id:noteId});
          return c.focus();
        }
      }
      return self.clients.openWindow(noteId?'./#note='+encodeURIComponent(noteId):'./');
    })
  );
});
