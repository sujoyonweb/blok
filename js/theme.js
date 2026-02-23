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
            if (hour >= 6 && hour < 18) {
                themeToApply = 'day';
            } else {
                themeToApply = 'night';
            }
        }

        // Apply it to the HTML root element
        if (themeToApply === 'day') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', themeToApply);
        }

        // --- THE DYNAMIC CSS VARIABLE FIX ---
        // We read the active CSS variable so we never have to hardcode hex colors in JS!
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            // Get the computed styles of the page after the theme was just changed
            const rootStyles = getComputedStyle(document.documentElement);
            
            // Extract the exact value of --bg-color (e.g., "#000000" or "#060504")
            const activeBgColor = rootStyles.getPropertyValue('--bg-color').trim();
            
            // Inject that pure hex color into the meta tag for the mobile status bar
            metaThemeColor.setAttribute('content', activeBgColor);
        }
    }
};