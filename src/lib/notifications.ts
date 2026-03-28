export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn("Push notifications not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const publicVapidKey = "BIJQObXWpMqW1nYXUX3b4icKnyLwcPNU2-qXJOUuUOX68wQ2BlYWyILatrP_LB2xyOzOfWih8Ott31nsdXuOYX0";
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    await fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription, userId }),
      headers: {
        'content-type': 'application/json'
      }
    });
    console.log("Push notification subscribed for user:", userId);
    return true;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}
