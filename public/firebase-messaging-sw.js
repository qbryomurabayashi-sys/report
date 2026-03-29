// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// These values are from firebase-applet-config.json
firebase.initializeApp({
  apiKey: "AIzaSyCpvnH5rUvQr_4nUTj0yqr2kHrQP6o--uc",
  projectId: "gen-lang-client-0454608404",
  messagingSenderId: "572015609874",
  appId: "1:572015609874:web:9adf05e11949876aa070cb"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received: ', payload);
  const notificationTitle = payload.notification.title || '新着通知';
  const notificationOptions = {
    body: payload.notification.body || '新しいメッセージがあります。',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
  
  // Update badge if supported (Note: navigator is not available in SW, use self.navigator or check support)
  if (self.navigator && 'setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(1);
  }
});
