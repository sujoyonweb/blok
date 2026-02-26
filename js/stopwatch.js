const Stopwatch = {
    startTime: 0, 
    elapsed: 0, 
    interval: null, 
    isRunning: false, 
    laps: [],
    lastRenderedSec: -1, // <-- Add this

    init() {
        // 1. Restore Laps (if any)
        const savedLaps = Storage.get(Storage.KEYS.SW_LAPS);
        if (savedLaps) {
            this.laps = savedLaps;
            UI.renderLaps(this.laps);
        }

        // 2. Check Saved State
        const savedState = Storage.get(Storage.KEYS.SW_STATE);
        
        if (savedState === 'running') {
            // CASE A: It was running.
            // Recover the original start timestamp.
            const savedStart = Storage.get(Storage.KEYS.SW_START);
            if (savedStart) {
                // Calculate current elapsed time: Now - Original Start
                this.elapsed = Date.now() - parseInt(savedStart);
                this.start(true); // true = resume without click sound
            }
        } else if (savedState === 'paused') {
            // CASE B: It was paused.
            // Just recover the static elapsed time.
            const savedElapsed = Storage.get(Storage.KEYS.SW_ELAPSED);
            if (savedElapsed) {
                this.elapsed = parseInt(savedElapsed);
                this.render();
                // Ensure UI buttons show "Resume/Reset" instead of "Start"
                UI.toggleReset(true); 
            }
        }
    },

    toggle() { this.isRunning ? this.pause() : this.start(); },

    start(isResume = false) {
        this.isRunning = true;
        
        // 1. Set Start Time
        // If resuming, we calculate "Start" as (Now - Elapsed) 
        // effectively pretending we started X minutes ago.
        this.startTime = Date.now() - this.elapsed;
        
        // 2. SAVE STATE
        Storage.set(Storage.KEYS.SW_STATE, 'running');
        Storage.set(Storage.KEYS.SW_START, this.startTime);
        
        if (!isResume) Sound.play('click');
        
        UI.setPlayState(true);
        UI.toggleLap(true);
        UI.toggleReset(false);
        
        this.interval = setInterval(() => {
            this.elapsed = Date.now() - this.startTime;
            
            // Only update the screen if the physical second has changed
            const currentSec = Math.floor(this.elapsed / 1000);
            if (currentSec !== this.lastRenderedSec) {
                this.lastRenderedSec = currentSec;
                this.render();
            }
        }, 100);
    },

    pause() {
        this.isRunning = false; 
        clearInterval(this.interval);
        
        // SAVE STATE
        Storage.set(Storage.KEYS.SW_STATE, 'paused');
        Storage.set(Storage.KEYS.SW_ELAPSED, this.elapsed);
        // We keep SW_START in case they resume, but SW_ELAPSED is the source of truth for now.
        
        UI.setPlayState(false);
        UI.toggleLap(false);
        UI.toggleReset(true);
        Sound.play('click');
    },

    reset() {
        this.pause(); 
        this.elapsed = 0; 
        this.laps = [];
        
        // CLEAR STORAGE
        Storage.remove(Storage.KEYS.SW_STATE);
        Storage.remove(Storage.KEYS.SW_START);
        Storage.remove(Storage.KEYS.SW_ELAPSED);
        Storage.remove(Storage.KEYS.SW_LAPS);
        
        this.render(); 
        UI.renderLaps([]);
        UI.toggleReset(false);
        
        // NEW: Clear task intent
        if (typeof UI !== 'undefined') UI.clearTaskInput();
        
        Sound.play('click');
    },

    lap() {
        const t = this.render(true); // Get formatted string
        this.laps.unshift({ idx: this.laps.length + 1, time: t });
        
        // SAVE LAPS IMMEDIATELY
        Storage.set(Storage.KEYS.SW_LAPS, this.laps);
        
        UI.renderLaps(this.laps);
        Sound.play('click');
    },

    render(returnStr = false) {
        const totalSec = Math.floor(this.elapsed / 1000);
        
        // Let the global Utils engine do the math for us!
        const fmt = Utils.fmtTime(totalSec); 
        
        if (returnStr) return `${fmt.h}:${fmt.m}:${fmt.s}`;
        UI.updateClock(fmt);
    }
};