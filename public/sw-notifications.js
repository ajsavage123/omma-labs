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
      // Check if there is already a window open with this app
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        // If matches or contains relative path, focus it and navigate
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
      // Otherwise, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(fullTargetUrl);
      }
    })
  );
});
