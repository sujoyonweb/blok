const Theme = {
    // We store the user's preference (auto, day, night, or any future theme)
    currentPref: 'auto', 
    autoInterval: null,

    init() {
        // 1. Load preference (default to 'auto')
        this.currentPref = Storage.get(Storage.KEYS.THEME_PREF, 'auto');
        
        // 2. Apply it immediately
        this.apply(this.currentPref);
        
        // 3. Start the background monitor (Runs once per minute)
        // This is ultra-lightweight and guarantees the 6PM shift happens
        if (!this.autoInterval) {
            this.autoInterval = setInterval(() => {
                if (this.currentPref === 'auto') {
                    this.apply('auto');
                }
            }, 60000); 
        }
    },

    setPreference(newPref) {
        // Save the new preference and apply it
        this.currentPref = newPref;
        Storage.set(Storage.KEYS.THEME_PREF, newPref);
        this.apply(newPref);
    },

    apply(pref) {
        let themeToApply = pref;

        // If 'auto', we calculate the actual theme based on the hour
        if (pref === 'auto') {
            const hour = new Date().getHours();
            // Day mode between 6:00 AM (6) and 5:59 PM (17)
            if (hour >= 6 && hour < 18) {
                themeToApply = 'day';
            } else {
                themeToApply = 'night';
            }
        }

        // Apply it to the HTML root element
        // If themeToApply is 'day', we remove the attribute so it uses the :root defaults
        if (themeToApply === 'day') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            // This handles 'night', 'ocean', 'sunset', etc. automatically!
            document.documentElement.setAttribute('data-theme', themeToApply);
        }
    }
};