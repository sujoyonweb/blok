const Timer = {
    duration: 25 * 60, 
    remaining: 25 * 60,
    endTime: null,
    interval: null, 
    isRunning: false,
    isStarting: false,
    currentLabel: 'Pomodoro',
    sessionId: null, // 🛑 THE FIX: Unique fingerprint for this session
    
    dailySeconds: 0,
    dailyGoal: 6 * 3600,
    
    isMomentumMode: false,   // Tracks if the user has enabled Momentum Mode
    isMomentum: false,       // Tracks if the timer is actively in the count-up state
    momentumSeconds: 0,      // Tracks how much extra time has elapsed
    // ... Autoflow v10.0
    autoFlowEnabled: false,
    breakPref: 5,
    sessionPhase: 'focus', 
    sessionBaseDur: 25 * 60,
    sessionFocusTally: 0,
    sessionBreakTally: 0,

    init() {
        this.sessionId = Storage.get('blok_session_id', null); // 🛑 THE FIX
        
        // 1. Load Mode Toggles
        this.isMomentumMode = Storage.get(Storage.KEYS.MOMENTUM_MODE, false);
        UI.updateMomentumBtn(this.isMomentumMode);

        this.autoFlowEnabled = Storage.get(Storage.KEYS.AUTOFLOW_ENABLED, false);
        this.breakPref = Storage.get(Storage.KEYS.BREAK_PREF, 5);
        
        // Restore active Autoflow session trackers
        this.sessionBaseDur = Storage.get(Storage.KEYS.SESSION_BASE_DUR, 25 * 60);
        this.sessionFocusTally = Storage.get(Storage.KEYS.SESSION_FOCUS_TALLY, 0);
        this.sessionBreakTally = Storage.get(Storage.KEYS.SESSION_BREAK_TALLY, 0);

        this.loadDailyStats();

        // 2. Restore Duration & Preset Label
        const savedDur = Storage.get(Storage.KEYS.TIMER_DUR);
        if (savedDur) { 
            this.duration = parseInt(savedDur); 
            this.remaining = this.duration;
            const last = Storage.get(Storage.KEYS.LAST_PRESET);
            if (last) this.currentLabel = last.label;
        } else {
            const lastPreset = Storage.get(Storage.KEYS.LAST_PRESET);
            if (lastPreset) {
                this.duration = lastPreset.time;
                this.currentLabel = lastPreset.label;
            } else {
                this.duration = 25 * 60; 
                this.currentLabel = 'Pomodoro';
            }
            this.remaining = this.duration;
        }

        // --- THE REFRESH FIX ---
        // Double check what phase we were in before the refresh
        this.sessionPhase = Storage.get(Storage.KEYS.SESSION_PHASE, null);
        if (!this.sessionPhase) {
            this.sessionPhase = (this.currentLabel && this.currentLabel.toLowerCase().includes('break')) ? 'break' : 'focus';
        }
        if (typeof UI !== 'undefined') UI.setBreakMode(this.sessionPhase === 'break');
        // -----------------------
        
        // 3. Check for Running/Paused States
        const savedState = Storage.get(Storage.KEYS.TIMER_STATE);
        if (savedState === 'running') {
            const savedEndTime = Storage.get(Storage.KEYS.TIMER_END);
            const now = Date.now();
            if (savedEndTime && savedEndTime > now) {
                this.remaining = Math.ceil((savedEndTime - now) / 1000);
                this.start(true);
            } else if (savedEndTime && savedEndTime <= now && this.isMomentumMode) {
                const elapsedMomentum = Math.floor((now - savedEndTime) / 1000);
                this.momentumSeconds = elapsedMomentum;
                this.startMomentum(true); 
            }
        } else if (savedState === 'paused') {
            const ot = Storage.get(Storage.KEYS.TIMER_MOMENTUM);
            if (ot !== null) {
                this.isMomentum = true;
                this.momentumSeconds = parseInt(ot);
                this.render();
            } else {
                const savedRem = Storage.get(Storage.KEYS.TIMER_REMAINING);
                if (savedRem) this.remaining = parseInt(savedRem);
            }
            UI.toggleReset(true);
        }

        // 4. Initial Render
        this.render();
        const m = Math.floor((this.duration % 3600) / 60);
        const h = Math.floor(this.duration / 3600);
        const s = this.duration % 60;
        UI.highlightPreset(m, h, s);
    },

    loadDailyStats() {
        const savedDate = Storage.get(Storage.KEYS.DAILY_DATE);
        const today = new Date().toDateString();
        const savedGoal = Storage.get(Storage.KEYS.DAILY_GOAL);
        this.dailyGoal = savedGoal ? parseInt(savedGoal) : 6 * 3600;
        UI.updateGoalUI(this.dailyGoal / 3600);
        
        if (savedDate !== today) {
            this.dailySeconds = 0;
            Storage.set(Storage.KEYS.DAILY_DATE, today);
            Storage.set(Storage.KEYS.DAILY_TOTAL, 0);
        } else {
            this.dailySeconds = parseInt(Storage.get(Storage.KEYS.DAILY_TOTAL, 0)) || 0;
        }
        UI.updateStats(this.dailySeconds);
        UI.updateRing(this.dailySeconds, this.dailyGoal);
    },

    toggleMomentumMode() {
        if (!this.isMomentumMode && this.autoFlowEnabled) this.toggleAutoFlowSetting(false);
        this.isMomentumMode = !this.isMomentumMode;
        Storage.set(Storage.KEYS.MOMENTUM_MODE, this.isMomentumMode);
        UI.updateMomentumBtn(this.isMomentumMode);
        UI.showToast(this.isMomentumMode ? "Momentum Mode ON" : "Momentum Mode OFF");
    },

    toggleAutoFlowSetting(forceState = null) {
        this.autoFlowEnabled = forceState !== null ? forceState : !this.autoFlowEnabled;
        if (this.autoFlowEnabled && this.isMomentumMode) {
            this.isMomentumMode = false;
            Storage.set(Storage.KEYS.MOMENTUM_MODE, false);
            UI.updateMomentumBtn(false);
        }
        Storage.set(Storage.KEYS.AUTOFLOW_ENABLED, this.autoFlowEnabled);
        UI.updateSettingsUI();
        if (forceState === null) UI.showToast(this.autoFlowEnabled ? "Auto Flow ON" : "Auto Flow OFF", true);
    },

    setBreakPref(minutes) {
        this.breakPref = minutes;
        Storage.set(Storage.KEYS.BREAK_PREF, this.breakPref);
        UI.updateSettingsUI();
    },

    setGoal(hours) {
        this.dailyGoal = hours * 3600;
        Storage.set(Storage.KEYS.DAILY_GOAL, this.dailyGoal);
        UI.updateRing(this.dailySeconds, this.dailyGoal);
    },

    set(h, m, s, label = 'Custom') {
        const clock = document.getElementById('clockGroup');
        const task = document.getElementById('taskInput');

        // --- NEW: THE INTERRUPTION ENGINE ---
        // If they click a new preset while the old one is still animating,
        // instantly kill the old timeouts and reset the visual state!
        if (this.isAnimatingPreset) {
            clearTimeout(this.swapTimeout);
            clearTimeout(this.inhaleTimeout);
            clearTimeout(this.cleanupTimeout);
            
            if (clock) {
                clock.style.transition = 'none'; 
                clock.style.filter = '';
                clock.style.transform = '';
                clock.style.opacity = '1';
                void clock.offsetHeight; // Force browser to register the reset
            }
            if (task) {
                task.style.transition = 'none';
                task.style.transform = '';
                task.style.removeProperty('opacity');
                void task.offsetHeight;
            }
        }
        
        this.isAnimatingPreset = true;

        // Tell the reset function to NOT highlight the old preset
        this.reset(true); 

        this.duration = (h * 3600) + (m * 60) + s;
        this.remaining = this.duration;
        this.currentLabel = label;
        
        if (label.toLowerCase().includes('break')) {
            this.sessionPhase = 'break';
        } else {
            this.sessionPhase = 'focus';
        }
        Storage.set(Storage.KEYS.SESSION_PHASE, this.sessionPhase);
        Storage.set(Storage.KEYS.TIMER_DUR, this.duration);
        Storage.set(Storage.KEYS.LAST_PRESET, { time: this.duration, label: label });

        // --- FAST CINEMATIC SWAP ---
        
        // 1. Exhale Fast (0.2s)
        if (clock) {
            clock.style.transition = 'all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)';
            clock.style.transform = 'translateY(20px)'; 
            clock.style.filter = 'blur(8px)';
            clock.style.opacity = '0';
        }
        if (task) {
            task.style.transition = 'all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)';
            task.style.transform = 'translateY(10px)';
            task.style.setProperty('opacity', '0', 'important'); // Overpower CSS
        }

        // 2. Logic Swap (at 0.25s)
        this.swapTimeout = setTimeout(() => {
            if (typeof UI !== 'undefined') {
                UI.setBreakMode(this.sessionPhase === 'break');
                UI.setPlayState(false);
                UI.toggleReset(false);
                UI.setSuccessState(false);
                UI.highlightPreset(m, h, s);
            }
            
            this.clearPersistence();
            this.render(); 

            ['displayHr', 'displayMin', 'displaySec'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('tick-fall', 'tick-rise');
            });

            if (clock) {
                clock.style.transition = 'none'; 
                clock.style.transform = 'translateY(20px)'; 
                void clock.offsetHeight; 
            }
            if (task) {
                task.style.transition = 'none';
                task.style.transform = 'translateY(10px)';
                task.style.setProperty('opacity', '0', 'important'); // Keep invisible
                void task.offsetHeight;
            }

            // 3. Inhale Fast (at 0.3s)
            this.inhaleTimeout = setTimeout(() => {
                if (clock) {
                    clock.style.transition = 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)';
                    clock.style.transform = 'translateY(0)';
                    clock.style.filter = 'blur(0px)';
                    clock.style.opacity = '1';
                }
                if (task) {
                    task.style.transition = 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)';
                    task.style.transform = 'translateY(0)';
                    const targetOpacity = this.sessionPhase === 'break' ? '0.8' : '1';
                    task.style.setProperty('opacity', targetOpacity, 'important');
                }
                
                // 4. Cleanup
                this.cleanupTimeout = setTimeout(() => {
                    if (clock) {
                        clock.style.transition = '';
                        clock.style.filter = '';
                        clock.style.transform = '';
                    }
                    if (task) {
                        task.style.transition = '';
                        task.style.transform = '';
                        task.style.removeProperty('opacity'); // Hand control back to CSS
                    }
                    this.isAnimatingPreset = false; 
                }, 450);
            }, 50);

        }, 250); 
    },

    toggle() { 
        if (this.isRunning) this.pause();
        else if (this.isMomentum) this.startMomentum();
        else this.start(); 
    },

    spawnParticles(buttonElement) {
        if (!buttonElement) return;
        
        const rect = buttonElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const wave = document.createElement('div');
        wave.classList.add('shockwave-ring');
        wave.style.width = rect.width + 'px';
        wave.style.height = rect.height + 'px';
        wave.style.left = (rect.left) + 'px'; 
        wave.style.top = (rect.top) + 'px';
        document.body.appendChild(wave);
        
        const waveAnim = wave.animate([
            { transform: 'scale(1)', opacity: 0.5, borderWidth: '2px' },
            { transform: 'scale(1.5)', opacity: 0, borderWidth: '0px' }
        ], { duration: 400, easing: 'ease-out' });
        waveAnim.onfinish = () => wave.remove();

        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle-spark');
            document.body.appendChild(particle);

            const angle = (i / 12) * 360;
            const velocity = 60 + Math.random() * 30; 
            const rad = angle * (Math.PI / 180);
            const tx = Math.cos(rad) * velocity;
            const ty = Math.sin(rad) * velocity;

            const animation = particle.animate([
                { transform: `translate(${centerX}px, ${centerY}px) scale(1)`, opacity: 0.8 },
                { transform: `translate(${centerX + tx}px, ${centerY + ty}px) scale(0.5)`, opacity: 0 }
            ], { duration: 500, easing: 'cubic-bezier(0, 0, 0.2, 1)', fill: 'forwards' });

            animation.onfinish = () => particle.remove();
        }
    },

    start(isResume = false) {
        // 🛑 ENGINE FIREWALL: Never start if time is 0
        if (this.remaining <= 0) {
            if (typeof UI !== 'undefined') UI.showToast("Cannot start a 0-second timer.");
            return;
        }
        // THE FIX: Block rapid double-clicks while the animation is playing
        if (this.isRunning || this.isStarting) return;
        this.isStarting = true; 

        // Code for Autoflow
        if (!isResume && this.autoFlowEnabled && this.sessionPhase === 'focus' && this.remaining === this.duration) {
            this.sessionBaseDur = this.duration;
            Storage.set(Storage.KEYS.SESSION_BASE_DUR, this.sessionBaseDur);
        }

        const btn = document.getElementById('btnMain'); 
        
        if (btn && !isResume) {
            this.spawnParticles(btn);
            btn.style.transform = "scale(0.95)";
            setTimeout(() => btn.style.transform = "scale(1)", 150);
        }

        if (!isResume) Sound.play('click');

        setTimeout(() => {
            this.isStarting = false; // Release the lock
            
            document.body.classList.add('is-deep-focus');
            
            if (document.activeElement && typeof document.activeElement.blur === 'function') {
                document.activeElement.blur();
            }
            
            // if (this.remaining === 0 && !this.isMomentumMode) return;
            
            this.isRunning = true;
            
            // 🛑 THE FIX: Generate a unique ID for this specific run
            if (!isResume) {
                this.sessionId = Date.now().toString();
                Storage.set('blok_session_id', this.sessionId);
            }

            this.endTime = Date.now() + (this.remaining * 1000);
            
            Storage.set(Storage.KEYS.TIMER_STATE, 'running');
            Storage.set(Storage.KEYS.TIMER_END, this.endTime);
            
            UI.setPlayState(true);
            UI.toggleReset(false);
            
            this.interval = setInterval(() => {
                const delta = this.endTime - Date.now();
                if (delta > 0) { 
                    this.remaining = Math.ceil(delta / 1000);
                    this.render(); 
                } else { 
                    clearInterval(this.interval);
                    this.remaining = 0;
                    if (this.isMomentumMode) {
                        this.momentumSeconds = 0; 
                        this.startMomentum(); 
                    } else {
                        this.finish(); 
                    }
                }
            }, 100);

        }, 300); 
    },

    startMomentum(isResume = false) {
        this.isMomentum = true;
        this.isRunning = true;
        
        if (!isResume) {
            // 🛑 THE FIX: Generate a unique ID when Momentum mode officially begins
            // This prevents the duplicate save bug across multiple windows!
            this.sessionId = Date.now().toString(); 
            Storage.set('blok_session_id', this.sessionId);
            
            Sound.play('alarm');
        }

        // Calculate the anchor time (this math applies perfectly whether we are 
        // starting fresh at 0 seconds, or resuming a paused session).
        this.momentumStartTime = Date.now() - (this.momentumSeconds * 1000);

        Storage.set(Storage.KEYS.TIMER_STATE, 'running');
        UI.setPlayState(true);
        UI.toggleReset(false);

        this.interval = setInterval(() => {
            const now = Date.now();
            const newSeconds = Math.floor((now - this.momentumStartTime) / 1000);
            
            // 🛑 THE PERFORMANCE FIX: 
            // Only write to the database and update the DOM if a full second has passed!
            // This reduces CPU and Disk usage by 90%
            if (newSeconds !== this.momentumSeconds) {
                this.momentumSeconds = newSeconds;
                Storage.set(Storage.KEYS.TIMER_MOMENTUM, this.momentumSeconds);
                this.render();
            }
        }, 100);
    },

    pause() {
        this.isRunning = false; 
        clearInterval(this.interval);
        Storage.set(Storage.KEYS.TIMER_STATE, 'paused');
        
        if (this.isMomentum) {
            Storage.set(Storage.KEYS.TIMER_MOMENTUM, this.momentumSeconds);
        } else {
            Storage.set(Storage.KEYS.TIMER_REMAINING, this.remaining);
            Storage.remove(Storage.KEYS.TIMER_END);
        }
        
        UI.setPlayState(false);
        UI.toggleReset(true);
        Sound.play('click');
    },

    // THE FIX: Added skipHighlight parameter (defaults to false so standard resets still work perfectly)
    reset(skipHighlight = false) {
        this.isRunning = false;
        this.isMomentum = false;
        this.momentumSeconds = 0;
        clearInterval(this.interval);

        // --- v10.0 AUTO FLOW RECOVERY FIX ---
        // If Auto Flow is ON and you hit reset while on a Break, bounce back to Focus.
        if (this.autoFlowEnabled && this.sessionPhase === 'break') {
            this.duration = this.sessionBaseDur || (25 * 60);
            
            // Smart Label Recovery: If the time is standard (25, 30, 48), call it 'Focus'. Otherwise, it was 'Custom'.
            const isStandard = [25 * 60, 30 * 60, 48 * 60].includes(this.duration);
            this.currentLabel = isStandard ? 'Focus' : 'Custom';
            
            // THE REFRESH FIX: Explicitly overwrite the "Break" memory in storage so a refresh doesn't resurrect it!
            Storage.set(Storage.KEYS.TIMER_DUR, this.duration);
            Storage.set(Storage.KEYS.LAST_PRESET, { time: this.duration, label: this.currentLabel });
        }
        // ------------------------------------

        this.remaining = this.duration; 
        this.clearPersistence();
        
        // Wipe Autoflow session if manually resetting
        this.clearSessionTrackers();

        this.render();

        UI.setPlayState(false);
        UI.toggleReset(false);
        
        if (typeof UI !== 'undefined') {
            UI.setSuccessState(false);
            
            // THE FIX: Only highlight if we aren't actively skipping it
            if (!skipHighlight) {
                const h = Math.floor(this.duration / 3600);
                const m = Math.floor((this.duration % 3600) / 60);
                const s = this.duration % 60;
                UI.highlightPreset(m, h, s);
            }
        }
        
        Sound.play('click');
    },

    handleStopClick() {
        // ==========================================
        // ⏱️ THE MINIMUM MEANINGFUL SESSION (60s)
        // ==========================================
        const GRACE_PERIOD_SEC = 60; 
        
        const elapsedThisSession = this.duration - this.remaining;

        if (this.isMomentum) {
            // --- MOMENTUM MODE ---
            const totalSec = this.duration + this.momentumSeconds;
            
            if (totalSec < GRACE_PERIOD_SEC) {
                this.reset();
                if (typeof UI !== 'undefined') UI.clearTaskInput();
                return; 
            }

            this.pause(); 
            
            const tMin = Math.floor(totalSec / 60);
            const tSec = totalSec % 60;
            const totalStr = tSec > 0 ? `${tMin}m ${tSec}s` : `${tMin}m`;

            const exMin = Math.floor(this.momentumSeconds / 60);
            const exSec = this.momentumSeconds % 60;
            const extraStr = exMin > 0 ? `+${exMin}m ${exSec}s` : `+${exSec}s`;

            const finalHTML = `Total: ${totalStr} <span class="text-momentum">(${extraStr})</span>`;

            UI.showCompleteModal(finalHTML, true, extraStr);
            
        } else if (this.autoFlowEnabled) {
            // --- AUTO FLOW MODE ---
            let finalFocus = this.sessionFocusTally;
            let finalBreak = this.sessionBreakTally;

            if (this.sessionPhase === 'focus') {
                finalFocus += elapsedThisSession;
            } else {
                finalBreak += elapsedThisSession;
            }

            // THE FIX: Evaluate the ENTIRE combined flow time (Focus + Break)
            const totalFlowTime = finalFocus + finalBreak;
            
            if (totalFlowTime < GRACE_PERIOD_SEC) {
                this.reset();
                this.clearSessionTrackers();
                if (typeof UI !== 'undefined') UI.clearTaskInput();
                return; 
            }

            this.pause();
            
            // FIX: Ensure we save BOTH Focus and Break fragments if stopped manually
            if (elapsedThisSession > 0) {
                if (this.sessionPhase === 'focus') {
                    this.saveToHistory(elapsedThisSession);
                } else {
                    this.saveBreakToJournal(elapsedThisSession);
                }
            }

            // SMART STRING FORMATTING: Shows "< 1m" instead of "0m" for short tests
            let focusStr = '';
            if (finalFocus > 0 && finalFocus < 60) focusStr = '< 1m';
            else {
                const fH = Math.floor(finalFocus / 3600);
                const fM = Math.floor((finalFocus % 3600) / 60);
                focusStr = fH > 0 ? `${fH}h ${fM}m` : `${fM}m`;
            }

            let breakStr = '';
            if (finalBreak > 0 && finalBreak < 60) breakStr = '< 1m';
            else if (finalBreak === 0) breakStr = '0m';
            else {
                const bH = Math.floor(finalBreak / 3600);
                const bM = Math.floor((finalBreak % 3600) / 60);
                breakStr = bH > 0 ? `${bH}h ${bM}m` : `${bM}m`;
            }

            const html = `
                <div style="margin-bottom: 25px; line-height: 1.8;">
                    <div style="color: #FFF; font-size: 16px; font-weight: 500;">
                        Total Focus <span style="font-family: var(--font-mono); color: var(--accent-color); margin-left: 8px;">${focusStr}</span>
                    </div>
                    <div style="color: #666; font-size: 13px;">
                        Breaks Taken <span style="font-family: var(--font-mono); margin-left: 8px;">${breakStr}</span>
                    </div>
                </div>
                <div style="font-size: 14px; color: #888; margin-bottom: 10px;">How was your overall session?</div>
            `;
            
            UI.showCompleteModal(html, false);
            this.clearSessionTrackers();

        } else {
            // ==========================================
            // --- STANDARD MODE ---
            // ==========================================
            if (elapsedThisSession >= GRACE_PERIOD_SEC) {
                this.pause();
                
                if (!this.currentLabel.toLowerCase().includes('break')) {
                    this.saveToHistory(elapsedThisSession);
                    localStorage.removeItem('blok_task_timer'); 
                    
                    if (typeof UI !== 'undefined') {
                        UI.setSuccessState(true);
                        UI.showCompleteModal("How was your focus?", false);
                    }
                } else {
                    // THE FIX: Save manual breaks to the recovery journal!
                    this.saveBreakToJournal(elapsedThisSession);
                    this.reset();
                    // (Removed the clearTaskInput here so breaks don't wipe text)
                }
            } else {
                this.reset();
                // THE FIX: Only clear the text if we cancelled a FOCUS session.
                if (!this.currentLabel.toLowerCase().includes('break') && typeof UI !== 'undefined') {
                    UI.clearTaskInput();
                }
            }
        }
    },

    stopAndSave(discardExtra = false) {
        this.isRunning = false;
        clearInterval(this.interval);
        const timeToSave = discardExtra ? this.duration : (this.duration + this.momentumSeconds);
        
        // FIX: Check if the momentum session was a break before saving!
        if (this.currentLabel && this.currentLabel.toLowerCase().includes('break')) {
            this.saveBreakToJournal(timeToSave);
        } else {
            this.saveToHistory(timeToSave);
        }
        
        this.reset();
    },

    saveSessionTrackers() {
        Storage.set(Storage.KEYS.SESSION_PHASE, this.sessionPhase);
        Storage.set(Storage.KEYS.SESSION_FOCUS_TALLY, this.sessionFocusTally);
        Storage.set(Storage.KEYS.SESSION_BREAK_TALLY, this.sessionBreakTally);
    },

    clearSessionTrackers() {
        // Smart reset: only default to focus if we aren't explicitly sitting on a Break preset
        if (this.currentLabel && this.currentLabel.toLowerCase().includes('break')) {
            this.sessionPhase = 'break';
        } else {
            this.sessionPhase = 'focus';
        }

        this.sessionFocusTally = 0;
        this.sessionBreakTally = 0;
        Storage.remove(Storage.KEYS.SESSION_PHASE);
        Storage.remove(Storage.KEYS.SESSION_BASE_DUR);
        Storage.remove(Storage.KEYS.SESSION_FOCUS_TALLY);
        Storage.remove(Storage.KEYS.SESSION_BREAK_TALLY);
        
        if (typeof UI !== 'undefined') UI.setBreakMode(this.sessionPhase === 'break');
    },

    finish() {
        // 1. Stop the internal timer loop
        this.isRunning = false; 
        clearInterval(this.interval);
        
        // 2. Force Visuals to 00:00 IMMEDIATELY
        this.remaining = 0;
        this.render(); 

        if (this.autoFlowEnabled) {
            
            // --- AUTO FLOW MODE ---
            if (this.sessionPhase === 'focus') {
                this.sessionFocusTally += this.duration;
                this.saveToHistory(this.duration); 
            } else {
                this.sessionBreakTally += this.duration;
                // THE FIX: Log completed Auto Flow breaks to the journal!
                this.saveBreakToJournal(this.duration);
            }
            this.saveSessionTrackers();

            Sound.play('alarm'); 
            if (typeof UI !== 'undefined') UI.setSuccessState(true); 

            // --- THE "DEEP BREATH" (NO-SCALE PERFECT MASKING) ---
            const clock = document.getElementById('clockGroup');
            const task = document.getElementById('taskInput'); 

            // Phase 1: EXHALE 
            setTimeout(() => {
                if (clock) {
                    clock.style.transition = 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1), filter 0.6s ease, opacity 0.3s ease-out';
                    clock.style.transform = 'translateY(40px)'; 
                    clock.style.filter = 'blur(25px)'; 
                    clock.style.setProperty('opacity', '0', 'important'); 
                }
                if (task) {
                    task.style.transition = 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease-out';
                    task.style.transform = 'translateY(25px)';
                    task.style.setProperty('opacity', '0', 'important'); 
                }
            }, 50); 

            // Phase 2: THE "DARK ZONE" SWAP (at 650ms)
            setTimeout(() => {
                if (typeof UI !== 'undefined') UI.setSuccessState(false); 

                // FIX: Generate a brand new Session ID for the next Auto Flow phase 
                // so the anti-spam firewall doesn't block it!
                this.sessionId = Date.now().toString();
                Storage.set('blok_session_id', this.sessionId);

                if (this.sessionPhase === 'focus') {
                    this.sessionPhase = 'break';
                    this.duration = this.breakPref * 60;
                    this.currentLabel = 'Break';
                } else {
                    this.sessionPhase = 'focus';
                    this.duration = this.sessionBaseDur || (25 * 60);
                    this.currentLabel = 'Focus';
                }
                this.remaining = this.duration;

                Storage.set(Storage.KEYS.TIMER_DUR, this.duration);
                Storage.set(Storage.KEYS.LAST_PRESET, { time: this.duration, label: this.currentLabel });
                this.saveSessionTrackers();
                
                if (typeof UI !== 'undefined') {
                    UI.setBreakMode(this.sessionPhase === 'break');
                    const h = Math.floor(this.duration / 3600);
                    const m = Math.floor((this.duration % 3600) / 60);
                    const s = this.duration % 60;
                    UI.highlightPreset(m, h, s);
                }
                
                this.render();

                ['displayHr', 'displayMin', 'displaySec'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.style.animation = 'none'; 
                        el.classList.remove('tick-fall', 'tick-rise');
                    }
                });

                if (clock) {
                    clock.style.transition = 'none'; 
                    clock.style.transform = 'translateY(40px)'; 
                    void clock.offsetHeight; 
                }
                if (task) {
                    task.style.transition = 'none';
                    task.style.transform = 'translateY(25px)';
                    task.style.setProperty('opacity', '0', 'important');
                    void task.offsetHeight; 
                }

            }, 650); 

            // Phase 3: INHALE (at 750ms)
            setTimeout(() => {
                ['displayHr', 'displayMin', 'displaySec'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.animation = ''; 
                });

                if (clock) {
                    clock.style.transition = 'transform 0.8s cubic-bezier(0.19, 1, 0.22, 1), filter 0.8s ease, opacity 0.4s ease-in 0.15s';
                    clock.style.transform = 'translateY(0)';
                    clock.style.filter = 'blur(0px)';
                    clock.style.setProperty('opacity', '1', 'important');
                }
                if (task) {
                    task.style.transition = 'transform 0.8s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.4s ease-in 0.15s';
                    task.style.transform = 'translateY(0)';
                    const targetOpacity = this.sessionPhase === 'break' ? '0.8' : '1';
                    task.style.setProperty('opacity', targetOpacity, 'important');
                }

                // Phase 4: CLEANUP & START 
                setTimeout(() => {
                    if (clock) {
                        clock.style.transition = '';
                        clock.style.filter = '';
                        clock.style.transform = ''; 
                        clock.style.removeProperty('opacity'); 
                    }
                    if (task) {
                        task.style.transition = '';
                        task.style.transform = '';
                        task.style.removeProperty('opacity');
                    }
                    this.start(true); 
                }, 850); 

            }, 750);

        } else {
            // ==========================================
            // --- STANDARD MODE (Fixed for < 60s) ---
            // ==========================================
            const GRACE_PERIOD_SEC = 60; 
            const isBreak = this.currentLabel.toLowerCase().includes('break');
            
            Sound.play('alarm'); 
            if (typeof UI !== 'undefined') UI.setSuccessState(true); 

            if (!isBreak && this.duration >= GRACE_PERIOD_SEC) { 
                this.saveToHistory(this.duration);
                localStorage.removeItem('blok_task_timer'); // Moved this inside so it only wipes after saving a focus session!
                setTimeout(() => {
                    if (typeof UI !== 'undefined') UI.showCompleteModal("How was your focus?", false);
                }, 1500);
            } else {
                // THE FIX: Log completed standard breaks!
                if (isBreak && this.duration >= GRACE_PERIOD_SEC) {
                    this.saveBreakToJournal(this.duration);
                }
                setTimeout(() => {
                    this.reset();
                }, 1500);
            }
        }
    },

    saveToHistory(seconds) {
        // 🛑 THE ULTIMATE FIX: The "Saved Sessions" Ledger
        // 1. Grab the ID from active memory or storage
        let currentId = this.sessionId || Storage.get('blok_session_id');
        
        // If there is no ID, this is a ghost session from a wiped tab. Abort!
        if (!currentId) return; 
        
        // 2. Check the global ledger
        const savedIds = Storage.get('blok_saved_sessions', []);
        if (savedIds.includes(currentId)) {
            console.log("Duplicate cross-tab save prevented!");
            return; 
        }
        
        // 3. Add this ID to the ledger so no other tab can save it
        savedIds.push(currentId);
        if (savedIds.length > 10) savedIds.shift(); // Keep array small and fast
        Storage.set('blok_saved_sessions', savedIds);

        const todayKey = new Date().toDateString();
        this.dailySeconds += seconds;
        Storage.set(Storage.KEYS.DAILY_TOTAL, this.dailySeconds);
        Storage.set(Storage.KEYS.DAILY_DATE, todayKey);

        let history = Storage.get(Storage.KEYS.HISTORY, {});
        const currentVal = parseInt(history[todayKey]) || 0;
        history[todayKey] = currentVal + seconds;
        Storage.set(Storage.KEYS.HISTORY, history);
        
        UI.updateStats(this.dailySeconds);
        UI.updateRing(this.dailySeconds, this.dailyGoal);

        // --- NEW: V12.0 BULLETPROOF JOURNAL HOOK ---
        if (typeof Journal !== 'undefined') {
            // 1. Try to read from memory first
            let taskText = localStorage.getItem('blok_task_timer') || '';
            
            // 2. ULTIMATE FALLBACK: If memory was already wiped by the timer finishing, 
            // physically grab the text straight from the input box on the screen!
            if (!taskText) {
                const physicalInput = document.getElementById('taskInput');
                if (physicalInput && physicalInput.value !== "Enjoy your break...") {
                    taskText = physicalInput.value;
                }
            }

            Journal.recordSession(seconds, taskText);
        }
    },

    // --- NEW: V12.0 RECOVERY LOGGING ---
    saveBreakToJournal(seconds) {
        // 🛑 THE ULTIMATE FIX: Cross-tab duplication lock for breaks
        let currentId = this.sessionId || Storage.get('blok_session_id');
        if (!currentId) return;
        
        const savedIds = Storage.get('blok_saved_sessions', []);
        if (savedIds.includes(currentId)) return;
        
        savedIds.push(currentId);
        if (savedIds.length > 10) savedIds.shift();
        Storage.set('blok_saved_sessions', savedIds);

        if (typeof Journal !== 'undefined') {
            let logs = Storage.get(Storage.KEYS.JOURNAL_LOG, []);
            logs.unshift({
                id: Date.now(),
                date: new Date().toDateString(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
                duration: seconds,
                task: "Recovery",
                bucket: "Recovery",
                subject: "Break",
                quality: 'break' // Distinguishes it so it doesn't affect Quality Math
            });
            // Enforce the same history cap
            if (logs.length > Journal.MAX_ENTRIES) {
                const overflow = logs.pop();
                let archive = Storage.get(Storage.KEYS.JOURNAL_ARCHIVE, []);
                archive.unshift(overflow);
                Storage.set(Storage.KEYS.JOURNAL_ARCHIVE, archive);
            }
            Storage.set(Storage.KEYS.JOURNAL_LOG, logs);
        }
    },

    clearPersistence() {
        Storage.remove(Storage.KEYS.TIMER_STATE);
        Storage.remove(Storage.KEYS.TIMER_END);
        Storage.remove(Storage.KEYS.TIMER_REMAINING);
        Storage.remove(Storage.KEYS.TIMER_MOMENTUM);
        Storage.remove('blok_session_id'); // 🛑 THE FIX
    },

    render() { 
        if (this.isMomentum) {
            UI.updateClock(Utils.fmtTime(this.momentumSeconds), true);
        } else {
            UI.updateClock(Utils.fmtTime(this.remaining), false);
        }
    },

    getStreak() {
        const history = Storage.get(Storage.KEYS.HISTORY, {});
        const today = new Date();
        let streak = 0;
        let d = new Date(today);
        
        if ((history[d.toDateString()] || 0) > 0) {
            streak++;
        }
        
        while (true) {
            d.setDate(d.getDate() - 1); 
            const dayKey = d.toDateString();
            if ((history[dayKey] || 0) > 0) {
                streak++;
            } else {
                break; 
            }
        }
        return streak;
    }
};