const Utils = {
    // Format Seconds to HH, MM, SS strings
    fmtTime(totalSec) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return {
            h: h.toString().padStart(2, '0'),
            m: m.toString().padStart(2, '0'),
            s: s.toString().padStart(2, '0')
        };
    }
};

// Append to the bottom of utils.js
const Notify = {
    async requestPermission() {
        try {
            if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
                const { display } = await Capacitor.Plugins.LocalNotifications.requestPermissions();
                return display === 'granted';
            } else if ("Notification" in window) {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            }
        } catch (e) {
            console.error("Notification permission error:", e);
        }
        return false;
    },

    async send(title, body) {
        const isEnabled = Storage.get(Storage.KEYS.NOTIFICATIONS_ON, false);
        if (!isEnabled) return;

        try {
            // Native Android/iOS
            if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
                await Capacitor.Plugins.LocalNotifications.schedule({
                    notifications: [{
                        title: title,
                        body: body,
                        id: Math.floor(Math.random() * 100000),
                        schedule: { at: new Date(Date.now() + 100) }, // Fire instantly
                        sound: null // We already play our custom alarm audio
                    }]
                });
            } 
            // Fallback to Web/PWA
            else if ("Notification" in window && Notification.permission === "granted") {
                new Notification(title, { body: body, icon: './assets/favicon.svg' });
            }
        } catch (e) {
            console.error("Error sending notification:", e);
        }
    }
};