// Immediate activation for Service Worker
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

// Service Worker Custom Notification Click Handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Get the target URL from notification data or default to /crm/tasks
  let targetUrl = '/crm/tasks';
  if (event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }

  // Resolve target URL relative to the client origin
  const fullTargetUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there is already a window open from this origin
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        try {
          var clientUrl = new URL(client.url);
          var selfUrl = new URL(self.location.origin);
          if (clientUrl.origin === selfUrl.origin) {
            if ('focus' in client) {
              client.focus();
            }
            if ('navigate' in client && client.url !== fullTargetUrl) {
              return client.navigate(fullTargetUrl);
            }
            return;
          }
        } catch (e) {
          // Fallback if URL parsing fails
          if (client.url === fullTargetUrl || client.url.indexOf('/crm/') !== -1) {
            if ('focus' in client) {
              client.focus();
            }
            if ('navigate' in client && client.url !== fullTargetUrl) {
              return client.navigate(fullTargetUrl);
            }
            return;
          }
        }
      }
      // Otherwise, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(fullTargetUrl);
      }
    })
  );
});
