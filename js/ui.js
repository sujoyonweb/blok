const UI = {
    defaultTitle: document.title,
    els: {
        clock: { h: document.getElementById('displayHr'), m: document.getElementById('displayMin'), s: document.getElementById('displaySec') },
        clockGroup: document.getElementById('clockGroup'),
        taskInput: document.getElementById('taskInput'),
        
        controls: { 
            reset: document.getElementById('btnReset'), 
            lap: document.getElementById('btnLap'), 
            play: document.querySelector('.icon-play'), 
            pause: document.querySelector('.icon-pause'),
            momentum: document.getElementById('btnMomentum') // Renamed
        },
        menu: { wrapper: document.getElementById('timerMenuWrapper'), container: document.getElementById('presetContainer') },
        laps: document.getElementById('lapList'),
        track: document.querySelector('.toggle-track'),
        tabs: { timer: document.getElementById('tabTimer'), stopwatch: document.getElementById('tabStopwatch') },
        
        modal: document.getElementById('customModal'),
        
        completeModal: document.getElementById('completeModal'),
        completeText: document.getElementById('completeText'),
        btnModalClose: document.getElementById('btnModalClose'),
        reflectionGrid: document.getElementById('reflectionGrid'),
        
        momentumActions: document.getElementById('momentumActions'), // Renamed
        btnDiscard: document.getElementById('btnDiscardMomentum'), // Renamed

        statsModal: document.getElementById('statsModal'),
        statsText: document.getElementById('dailyStats'),
        chartContainer: document.getElementById('chartBars'),
        
        goalValue: document.getElementById('goalValue'),
        toast: document.getElementById('toast'),
        
        ringFill: document.querySelector('.progress-ring-fill'),
        ringContainer: document.querySelector('.progress-ring'), 
        
        inputs: { h: document.getElementById('inpHr'), m: document.getElementById('inpMin'), s: document.getElementById('inpSec') },

        settingsModal: document.getElementById('settingsModal'),
        btnSettings: document.getElementById('btnSettings'),
        btnCloseSettings: document.getElementById('btnCloseSettings'),
        themeBtns: document.querySelectorAll('#themeSelector .seg-btn'),
        toggleSound: document.getElementById('toggleSound'),
        toggleHaptics: document.getElementById('toggleHaptics'),
        toggleAwake: document.getElementById('toggleAwake'),
        bgmBtns: document.querySelectorAll('#bgmSelector .seg-btn'),
        btnResetData: document.getElementById('btnResetData'),
        
        confirmModal: document.getElementById('confirmModal'),
        btnCancelReset: document.getElementById('btnCancelReset'),
        btnConfirmReset: document.getElementById('btnConfirmReset'),

        // v10.0 Elements
        toastAuto: document.getElementById('toastAuto'),
        toggleAutoFlow: document.getElementById('toggleAutoFlow'),
        breakRow: document.getElementById('breakRow'),
        breakBtns: document.querySelectorAll('#breakSelector .seg-btn')
    },

    init() { 
        this.buildMenu(); 
        this.setupInputValidation();
        this.setupTaskInput();
        this.startStreakRotator();
        this.lastCelebration = 0; 
        this.updateSettingsUI();
    },

    toggleFullScreen() {
        if (!document.fullscreenElement) {
            // Ask the browser to expand the whole HTML document
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Fullscreen blocked: ${err.message}`);
            });
        } else {
            // Safely check if the browser supports exiting fullscreen before firing it
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => console.log("Exit fullscreen ignored by browser."));
            }
        }
    },

    showToast(msg, isAutoFlow = false) {
        const targetToast = isAutoFlow && this.els.toastAuto ? this.els.toastAuto : this.els.toast;
        if (!targetToast) return;

        targetToast.textContent = msg;
        targetToast.classList.remove('hidden');
        
        const timeoutKey = isAutoFlow ? 'toastAutoTimeout' : 'toastTimeout';
        if (this[timeoutKey]) clearTimeout(this[timeoutKey]);
        
        this[timeoutKey] = setTimeout(() => {
            targetToast.classList.add('hidden');
        }, 2000);
    },

    updateMomentumBtn(isActive) {
        if (this.els.controls.momentum) {
            this.els.controls.momentum.classList.toggle('active', isActive);
        }
    },

    // Handles the Break styling and Smart Text swapping
    setBreakMode(isBreak) {
        if (isBreak) {
            document.body.classList.add('mode-break');
            
            // THE FIX: Instantly hide the Momentum button when a break starts
            if (this.els.controls.momentum) {
                this.els.controls.momentum.classList.add('hidden');
            }
            
            if (this.els.taskInput) {
                // 1. Save the user's actual focus task before we overwrite it
                const memoryTask = localStorage.getItem('blok_task_timer') || '';
                // Don't overwrite our saved variable if we are already showing the break text
                if (this.els.taskInput.value !== "Enjoy your break...") {
                     this.savedFocusTask = this.els.taskInput.value;
                } else {
                     this.savedFocusTask = memoryTask;
                }

                // 2. Change the input text to the relaxing message
                this.els.taskInput.value = "Enjoy your break...";
                
                // 3. Make it unclickable so they don't accidentally edit it
                this.els.taskInput.readOnly = true;
                
                // 4. Force it to be visible (prevents it from hiding)
                this.els.taskInput.classList.remove('hidden-running');
            }
        } else {
            document.body.classList.remove('mode-break');
            
            if (this.els.taskInput) {
                // 1. Make it editable again
                this.els.taskInput.readOnly = false;
                
                // 2. Restore the user's actual focus task (or leave empty if there wasn't one)
                this.els.taskInput.value = this.savedFocusTask !== undefined ? this.savedFocusTask : (localStorage.getItem('blok_task_timer') || '');
                
                // 3. Smart Hide: If the focus timer is running and the input is empty, hide it
                if (Timer.isRunning && this.els.taskInput.value.trim() === '') {
                    this.els.taskInput.classList.add('hidden-running');
                }
            }
        }
    },

    showCompleteModal(textHTML, isMomentumMode, momentumStr) {
        if (this.els.completeText) {
             this.els.completeText.innerHTML = textHTML || "How was your focus?";
        }
        
        // NEW: ALWAYS show the reflection pills! They act as our "Done" buttons for Auto Flow.
        if (this.els.reflectionGrid) {
            this.els.reflectionGrid.classList.remove('hidden');
        }

        // Momentum Mode "Discard" Button Logic
        if (this.els.momentumActions) {
            if (isMomentumMode) {
                this.els.momentumActions.classList.remove('hidden');
                
                if (this.els.btnDiscard) {
                    this.els.btnDiscard.textContent = momentumStr 
                        ? `Discard Extra (${momentumStr})` 
                        : "Discard Extra Time";
                        
                    this.els.btnDiscard.onclick = () => { 
                        Timer.stopAndSave(true); 
                        this.toggleCompleteModal(false);
                        this.setSuccessState(false);
                    };
                }
            } else {
                this.els.momentumActions.classList.add('hidden');
            }
        }

        this.toggleCompleteModal(true);
    },

    handleReflection(quality) {
        Sound.play('click');
        
        if (Timer.isMomentum) {
            Timer.stopAndSave(false); // This creates the log
            if (typeof Journal !== 'undefined') Journal.updateLastReflection(quality); // This updates it
        } else {
            // The log was already created when the timer hit zero. Update it NOW.
            if (typeof Journal !== 'undefined') Journal.updateLastReflection(quality);
            Timer.reset(); // Safely reset the UI afterward
        }

        this.toggleCompleteModal(false);
        this.setSuccessState(false);
    },

    updateClock({ h, m, s }, isMomentum) { 
        const isTimer = document.body.classList.contains('mode-timer');
        const animClass = (isTimer && !isMomentum) ? 'tick-fall' : 'tick-rise';

        const updateDigit = (el, newVal) => {
            if (el.textContent !== newVal) {
                el.textContent = newVal;
                el.classList.remove('tick-fall', 'tick-rise');
                void el.offsetWidth; 
                el.classList.add(animClass);
            }
        };

        updateDigit(this.els.clock.h, h);
        updateDigit(this.els.clock.m, m);
        updateDigit(this.els.clock.s, s);
        
        if (this.els.clockGroup) {
            this.els.clockGroup.classList.toggle('momentum', isMomentum === true);
        }

        const timeStr = (parseInt(h) > 0) ? `${h}:${m}:${s}` : `${m}:${s}`;
        this.updateTitle(timeStr, false);
    },

    updateRing(totalSeconds, goalSeconds) {
        const green = document.querySelector('.ring-green');
        const purple = document.querySelector('.ring-purple');
        const gold = document.querySelector('.ring-gold');
        
        if (!green || !purple || !gold) return;

        const r = 44; 
        const C = 2 * Math.PI * r; 
        const ratio = totalSeconds / goalSeconds;
        
        let greenOffset = ratio >= 1 ? 0 : C - (ratio * C);
        green.style.strokeDashoffset = greenOffset;
        
        let purpleOffset = C; 
        if (ratio > 1) {
            const pRatio = Math.min(ratio - 1, 1); 
            purpleOffset = C - (pRatio * C);
        }
        purple.style.strokeDashoffset = purpleOffset;

        let goldOffset = C;
        if (ratio > 2) {
            const gRatio = Math.min(ratio - 2, 1);
            goldOffset = C - (gRatio * C);
        }
        gold.style.strokeDashoffset = goldOffset;
        
        let currentLevel = 0;
        if (ratio >= 3) currentLevel = 3;
        else if (ratio >= 2) currentLevel = 2;
        else if (ratio >= 1) currentLevel = 1;

        if (typeof this.lastCelebration === 'undefined') this.lastCelebration = currentLevel;

        if (currentLevel > this.lastCelebration) {
            this.triggerCelebration(currentLevel);
            this.lastCelebration = currentLevel;
        }
    },

    triggerCelebration(level) {
        const green = document.querySelector('.ring-green');
        const purple = document.querySelector('.ring-purple');
        const gold = document.querySelector('.ring-gold');

        green.classList.remove('celebrate-100');
        purple.classList.remove('celebrate-200');
        gold.classList.remove('celebrate-300');

        if (level === 1) {
            this.showToast("🔥 Goal Crushed! Amazing work!");
            green.classList.add('celebrate-100');
        } 
        else if (level === 2) {
            this.showToast("🚀 UNSTOPPABLE! 2x Goal Reached!");
            purple.classList.add('celebrate-200');
        } 
        else if (level === 3) {
            this.showToast("⚡ GOD MODE! 3x Goal! Take a break!");
            gold.classList.add('celebrate-300');
        }
    },

    updateGoalUI(hours) { if (this.els.goalValue) this.els.goalValue.textContent = hours; },

    setDeepFocus(isActive) {
        document.body.classList.toggle('is-deep-focus', isActive);
    },

    setPlayState(isPlaying) {
        if (this.els.controls.play) this.els.controls.play.classList.toggle('hidden', isPlaying);
        if (this.els.controls.pause) this.els.controls.pause.classList.toggle('hidden', !isPlaying);
        
        this.setDeepFocus(isPlaying);

        // <-- NEW BULLETPROOF SCREEN AWAKE TIE-IN -->
        if (typeof App !== 'undefined') {
            if (isPlaying) App.requestWakeLock();
            else App.releaseWakeLock();
        }

        // <-- NEW BGM TIE-IN (Silence on Break) -->
        if (typeof BGM !== 'undefined') {
            const isBreak = document.body.classList.contains('mode-break');
            // Play ONLY if it's running AND it is NOT a break
            if (isPlaying && !isBreak) BGM.play();
            else BGM.pause();
        }
        
        if (this.els.taskInput) {
            if (isPlaying && this.els.taskInput.value.trim() === '') {
                this.els.taskInput.classList.add('hidden-running');
            } else {
                this.els.taskInput.classList.remove('hidden-running');
            }
        }
        
        if (isPlaying) {
            this.els.controls.reset.classList.add('hidden');
            
            if (this.els.controls.momentum) {
                if (!this.els.tabs.stopwatch.classList.contains('active') && !document.body.classList.contains('mode-break')) {
                     this.els.controls.momentum.classList.remove('hidden');
                } else {
                     this.els.controls.momentum.classList.add('hidden');
                }
            }
        }
    },

    switchLayout(mode) {
        const isTimer = mode === 'timer';

        // 1. Move the Header Toggle Indicator (CORE LOGIC FIRST)
        if (this.els.track) this.els.track.style.transform = isTimer ? 'translateX(0)' : 'translateX(100%)';
        if (this.els.tabs.timer) this.els.tabs.timer.classList.toggle('active', isTimer);
        if (this.els.tabs.stopwatch) this.els.tabs.stopwatch.classList.toggle('active', !isTimer);
        
        // 2. Set the Body Class
        document.body.classList.remove('mode-timer', 'mode-stopwatch');
        document.body.classList.add(isTimer ? 'mode-timer' : 'mode-stopwatch');
        
        // 3. Show/Hide Presets and Laps
        if(this.els.menu.wrapper) this.els.menu.wrapper.classList.toggle('hidden', !isTimer);
        if(this.els.laps) this.els.laps.classList.toggle('hidden', isTimer);
        
        // 4. Manage Controls (Momentum vs Lap)
        if (isTimer) {
            if (this.els.controls.lap) this.els.controls.lap.classList.add('hidden');
        } else {
            if (this.els.controls.lap) this.els.controls.lap.classList.remove('hidden'); 
            if (this.els.controls.momentum) this.els.controls.momentum.classList.add('hidden');
            if (this.els.clockGroup) this.els.clockGroup.classList.remove('momentum');
        }

        // 5. Hide/Show Progress Ring
        if (this.els.ringContainer) {
            this.els.ringContainer.style.opacity = isTimer ? '1' : '0';
        }

        // 6. Manage the Task Input Text
        if (this.els.taskInput) {
            const key = isTimer ? 'blok_task_timer' : 'blok_task_stopwatch';
            const savedText = localStorage.getItem(key) || '';
            
            if (document.body.classList.contains('mode-break')) {
                this.els.taskInput.value = "Enjoy your break...";
            } else {
                this.els.taskInput.value = savedText;
                this.els.taskInput.placeholder = isTimer ? "What are you working on?" : "What are you tracking?";
            }
        }

        // 7. --- THE SPATIAL SLIDE ANIMATION ---
        // Placed at the very end in a try/catch block so it can NEVER break your tabs!
        try {
            const viewport = document.querySelector('.viewport');
            const footer = document.querySelector('.footer');
            
            if (viewport && footer) {
                // Clear any stuck classes
                viewport.classList.remove('slide-from-left', 'slide-from-right');
                footer.classList.remove('slide-from-left', 'slide-from-right');
                
                // Force browser reflow
                void viewport.offsetWidth; 
                void footer.offsetWidth;
                
                // Add the animation
                const slideClass = isTimer ? 'slide-from-left' : 'slide-from-right';
                viewport.classList.add(slideClass);
                footer.classList.add(slideClass);

                // Instantly clean up when finished
                const cleanup = (e) => {
                    e.target.classList.remove('slide-from-left', 'slide-from-right');
                    e.target.removeEventListener('animationend', cleanup);
                };
                
                viewport.addEventListener('animationend', cleanup);
                footer.addEventListener('animationend', cleanup);
            }
        } catch (err) {
            console.error("Animation skipped to protect core UI:", err);
        }
    },

    toggleReset(show) { 
        this.els.controls.reset.classList.toggle('hidden', !show); 
        
        if (show) {
            this.updateTitle("", 'paused');
        } else if (!this.els.controls.play.classList.contains('hidden')) {
            this.updateTitle("", 'ready');
        }

        if (this.els.controls.momentum) {
            // THE FIX: Completely block Momentum button in Stopwatch OR Break modes
            if (this.els.tabs.stopwatch.classList.contains('active') || document.body.classList.contains('mode-break')) {
                this.els.controls.momentum.classList.add('hidden');
                return;
            }
            if (Timer.isRunning) {
                this.els.controls.momentum.classList.remove('hidden');
                return;
            }
            if (show) {
                this.els.controls.momentum.classList.remove('hidden');
            } else if (Timer.remaining === Timer.duration && !Timer.isMomentum) {
                this.els.controls.momentum.classList.add('hidden');
            }
        }
    },
    
    toggleLap(show) { 
        if (this.els.tabs.stopwatch.classList.contains('active')) {
            this.els.controls.lap.classList.toggle('hidden', !show); 
        } else {
            this.els.controls.lap.classList.add('hidden');
        }
    },

    highlightPreset(min, hr = 0, sec = 0) {
        if (!this.els.presets) return;
        
        // 1. Clear all active highlights first
        this.els.presets.forEach(p => p.classList.remove('active'));
        const btnCustom = document.getElementById('btnCustomOpen');
        if (btnCustom) btnCustom.classList.remove('active');

        let activeBtn = null;

        // 2. Read the Timer's internal brain
        if (typeof Timer !== 'undefined') {
            
            // --- AUTO FLOW FIX ---
            if (Timer.autoFlowEnabled && Timer.sessionPhase === 'break' && Timer.currentLabel === 'Break') {
                // Fade out the floating line during Auto Flow breaks
                const line = document.getElementById('presetHighlightLine');
                if (line) line.style.opacity = '0';
                return; 
            }

            // --- CUSTOM TIME FIX ---
            if (Timer.currentLabel === 'Custom') {
                activeBtn = btnCustom;
            }
        }

        // 3. Standard fallback matching (for Pomodoro, Study, etc.)
        if (!activeBtn) {
            const match = Array.from(this.els.presets).find(p => parseInt(p.dataset.m) === min && hr === 0 && sec === 0);
            activeBtn = match || btnCustom;
        }
        
        // 4. Apply the class AND animate the floating line!
        if (activeBtn) {
            activeBtn.classList.add('active');
            
            const line = document.getElementById('presetHighlightLine');
            if (line) {
                line.style.opacity = '1'; // Make sure it's visible
                
                // Calculate the exact bottom edge of the button
                const topPos = activeBtn.offsetTop + activeBtn.offsetHeight - 2;
                
                // Glide the line to the target button
                line.style.transform = `translate(${activeBtn.offsetLeft}px, ${topPos}px)`;
                line.style.width = `${activeBtn.offsetWidth}px`;
            }
        }
    },

    renderLaps(laps) { this.els.laps.innerHTML = laps.map(l => `<div class="lap-row"><span>Lap ${l.idx}</span><span>${l.time}</span></div>`).join(''); },
    
    setupInputValidation() {
        const validate = (el, max) => {
            el.addEventListener('input', () => {
                let val = parseInt(el.value);
                if (isNaN(val)) return;
                if (val > max) el.value = max;
                if (val < 0) el.value = 0;
            });
            el.addEventListener('blur', () => {
                let val = parseInt(el.value) || 0;
                el.value = val.toString().padStart(2, '0');
            });
        };
        if(this.els.inputs.h) validate(this.els.inputs.h, 99);
        if(this.els.inputs.m) validate(this.els.inputs.m, 59);
        if(this.els.inputs.s) validate(this.els.inputs.s, 59);
    },

    setupTaskInput() {
        if (!this.els.taskInput) return;
        this.els.taskInput.addEventListener('input', (e) => {
            const isTimer = document.body.classList.contains('mode-timer') || !document.body.classList.contains('mode-stopwatch');
            const key = isTimer ? 'blok_task_timer' : 'blok_task_stopwatch';
            localStorage.setItem(key, e.target.value);
        });
        this.els.taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.els.taskInput.blur();
        });
    },

    clearTaskInput() {
        if (!this.els.taskInput) return;
        this.els.taskInput.classList.add('clearing');
        const isTimer = document.body.classList.contains('mode-timer') || !document.body.classList.contains('mode-stopwatch');
        const key = isTimer ? 'blok_task_timer' : 'blok_task_stopwatch';
        localStorage.removeItem(key);

        setTimeout(() => {
            if (this.els.taskInput) {
                this.els.taskInput.value = '';
                this.els.taskInput.classList.remove('clearing');
            }
        }, 300);
    },

    toggleModal(show) { 
        if (show) {
            const saved = Storage.get(Storage.KEYS.CUSTOM_CFG);
            if (saved && this.els.inputs.h) {
                this.els.inputs.h.value = saved.h.toString().padStart(2, '0');
                this.els.inputs.m.value = saved.m.toString().padStart(2, '0');
                this.els.inputs.s.value = saved.s.toString().padStart(2, '0');
            } else if (this.els.inputs.h) {
                this.els.inputs.h.value = "00";
                this.els.inputs.m.value = "00";
                this.els.inputs.s.value = "00";
            }
        }
        if(this.els.modal) this.els.modal.classList.toggle('hidden', !show); 
    },
    
    toggleCompleteModal(show) { 
        if(this.els.completeModal) this.els.completeModal.classList.toggle('hidden', !show); 
        // Don't clear input if we are just transitioning to a break loop
        if (!show && !document.body.classList.contains('mode-break')) {
            this.clearTaskInput();
        }
    },

    setSuccessState(isActive) {
        const greenRing = document.querySelector('.progress-ring');
        if (!greenRing) return;

        if (isActive) {
            greenRing.style.animation = 'none';
            void greenRing.offsetHeight; 
            greenRing.style.animation = 'pulse-green 1.5s ease-in-out 1 forwards';
            greenRing.style.opacity = '1';
            
            // Allow mode-break styles to inherit
            if (!document.body.classList.contains('mode-break')) {
                greenRing.style.stroke = 'var(--accent-color)';
            }
        } else {
            greenRing.style.animation = 'none';
        }
    },

    toggleStatsModal(show) { 
        if (show) {
            this.renderChart(); 
            // THE FIX: Automatically refresh Insights data every time the modal opens
            if (typeof this.renderInsights === 'function') {
                const btnWeek = document.getElementById('btnRangeWeek');
                const isWeek = btnWeek && btnWeek.classList.contains('active');
                this.renderInsights(isWeek ? 'week' : 'today');
            }
        }
        if (this.els.statsModal) this.els.statsModal.classList.toggle('hidden', !show); 
    },
    
    updateStats(sec) {
        // THE FIX: Removed the "dataset.initialized" block so it updates instantly instead of waiting 15 seconds
        if (!this.els.statsText) return;
        
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        this.els.statsText.textContent = (sec > 0 && h === 0 && m === 0) ? `Today: < 1m` : `Today: ${h}h ${m}m`;
        this.els.statsText.dataset.initialized = "true";
    },

    renderChart() {
        if (!this.els.chartContainer) return;

        const header = document.getElementById('statsHeader');
        if (header) {
            const streak = Timer.getStreak();
            
            if (streak > 0) {
                const label = streak === 1 ? "DAY" : "DAYS";
                header.innerHTML = `<span style="color:#FF9500">🔥</span> ${streak} ${label} STREAK`;
                header.style.color = "#FFFFFF"; 
                header.style.letterSpacing = "1px";
            } else {
                header.textContent = "LAST 7 DAYS";
                header.style.color = "#555";
                header.style.letterSpacing = "2px";
            }
        }

        let history = Storage.get(Storage.KEYS.HISTORY, {});
        this.els.chartContainer.innerHTML = ''; 
        
        const todayKey = new Date().toDateString();
        const live = parseInt(Storage.get(Storage.KEYS.DAILY_TOTAL, 0)) || 0;
        
        const displayHistory = { ...history };
        if (live >= (parseInt(displayHistory[todayKey]) || 0)) {
            displayHistory[todayKey] = live;
        }
        
        const values = Object.values(displayHistory).map(v => parseInt(v) || 0);
        const maxVal = Math.max(60, ...values);

        for (let i = 6; i >= 0; i--) {
            const d = new Date(); 
            d.setDate(d.getDate() - i); 
            const key = d.toDateString(); 
            const seconds = parseInt(displayHistory[key]) || 0;
            
            const pct = seconds > 0 ? Math.max((seconds / maxVal) * 75, 5) : 0;
            
            let timeLabel = '';
            if (seconds > 0) {
                if (seconds < 60) timeLabel = '<1m';
                else if (seconds >= 3600) timeLabel = (seconds / 3600).toFixed(1).replace('.0','') + 'h';
                else timeLabel = Math.floor(seconds / 60) + 'm'; 
            }

            const col = document.createElement('div'); 
            col.className = 'chart-col';
            
            const isToday = (i === 0);
            
            col.innerHTML = `
                <div class="chart-value">${timeLabel}</div>
                <div class="chart-bar ${isToday ? 'today' : ''}" style="height: ${pct}%"></div>
                <div class="chart-label">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
            `;
            
            this.els.chartContainer.appendChild(col);
        }
    },
    
    buildMenu() {
        if(!this.els.menu.container) return;
        this.els.menu.container.innerHTML = '';
        // --- NEW: Inject the floating highlight line ---
        const highlightLine = document.createElement('div');
        highlightLine.id = 'presetHighlightLine';
        highlightLine.className = 'preset-highlight-line';
        this.els.menu.container.appendChild(highlightLine);
        // -----------------------------------------------

        Config.PRESETS.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'preset-pill';
            btn.textContent = p.label;
            btn.dataset.m = p.minutes;
            btn.onclick = () => { 
                Sound.play('click'); 
                Timer.set(0, p.minutes, 0, p.label); 
            };
            this.els.menu.container.appendChild(btn);
        });
        
        const custom = document.createElement('button');
        custom.className = 'preset-pill';
        custom.id = 'btnCustomOpen';
        custom.textContent = 'Custom'; 
        custom.onclick = () => { Sound.play('click'); this.toggleModal(true); };
        this.els.menu.container.appendChild(custom);
        
        this.els.presets = document.querySelectorAll('.preset-pill');
    },

    updateTitle(timeStr, state = 'running') {
        const isTimer = document.body.classList.contains('mode-timer');
        let task = this.els.taskInput ? this.els.taskInput.value.trim() : '';
        const defaultLabel = isTimer ? "Focus" : "Stopwatch";

        if (state === 'paused') {
            document.title = task ? `Paused • ${task}` : `Paused • ${defaultLabel}`;
        } else if (state === 'ready') {
            document.title = this.defaultTitle; 
        } else {
            document.title = task ? `${timeStr} • ${task}` : `${timeStr} • ${defaultLabel}`;
        }
    },

    toggleSettingsModal(show) {
        if (show) this.updateSettingsUI(); 
        if (this.els.settingsModal) this.els.settingsModal.classList.toggle('hidden', !show);
    },

    updateSettingsUI() {
        const themePref = Storage.get(Storage.KEYS.THEME_PREF, 'auto');
        if (this.els.themeBtns) {
            this.els.themeBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.val === themePref);
            });
        }
        
        const soundOn = Storage.get(Storage.KEYS.SOUND_ON, true);
        if (this.els.toggleSound) this.els.toggleSound.classList.toggle('active', soundOn);
        
        const hapticsOn = Storage.get(Storage.KEYS.HAPTICS_ON, true);
        if (this.els.toggleHaptics) this.els.toggleHaptics.classList.toggle('active', hapticsOn);

        // <-- NEW AWAKE TOGGLE LOGIC -->
        const awakeOn = Storage.get(Storage.KEYS.AWAKE_ON, true);
        if (this.els.toggleAwake) this.els.toggleAwake.classList.toggle('active', awakeOn);
        
        const autoFlowOn = Storage.get(Storage.KEYS.AUTOFLOW_ENABLED, false);
        if (this.els.toggleAutoFlow) this.els.toggleAutoFlow.classList.toggle('active', autoFlowOn);
        
        if (this.els.breakRow) {
            if (autoFlowOn) {
                this.els.breakRow.style.opacity = '1';
                this.els.breakRow.style.pointerEvents = 'auto';
            } else {
                this.els.breakRow.style.opacity = '0.5';
                this.els.breakRow.style.pointerEvents = 'none';
            }
        }

        const breakPref = Storage.get(Storage.KEYS.BREAK_PREF, 5);
        if (this.els.breakBtns) {
            this.els.breakBtns.forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.val) === breakPref);
            });
        }

        // BGM UI Update
        const bgmPref = Storage.get(Storage.KEYS.BGM_TRACK, 'none');
        if (this.els.bgmBtns) {
            this.els.bgmBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.val === bgmPref);
            });
        }
    },

    toggleConfirmModal(show) {
        if (this.els.confirmModal) {
            this.els.confirmModal.classList.toggle('hidden', !show);
        }
    },

    startStreakRotator() {
        const el = this.els.statsText;
        if (!el) return;
        
        let showStreak = false;

        setInterval(() => {
            if (document.body.classList.contains('is-deep-focus')) return;

            el.style.opacity = '0';
            el.style.transform = 'translateY(5px)'; 
            
            setTimeout(() => {
                showStreak = !showStreak;
                
                if (showStreak) {
                    const days = Timer.getStreak();
                    
                    if (days > 0) {
                        const label = days === 1 ? "Day" : "Days";
                        el.innerHTML = `<span style="color:#FF9500">🔥</span> ${days} ${label} Streak`;
                    } else {
                        const sec = Timer.dailySeconds;
                        const h = Math.floor(sec / 3600);
                        const m = Math.floor((sec % 3600) / 60);
                        const timeStr = (sec > 0 && h === 0 && m === 0) ? "< 1m" : `${h}h ${m}m`;
                        el.textContent = `Today: ${timeStr}`;
                        showStreak = false; 
                    }
                } else {
                    const sec = Timer.dailySeconds;
                    const h = Math.floor(sec / 3600);
                    const m = Math.floor((sec % 3600) / 60);
                    const timeStr = (sec > 0 && h === 0 && m === 0) ? "< 1m" : `${h}h ${m}m`;
                    el.textContent = `Today: ${timeStr}`;
                }
                
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 500); 
            
        }, 15000); 
    },

    renderInsights(range = 'today') {
        const logs = Storage.get(Storage.KEYS.JOURNAL_LOG, []);
        
        // 1. Filter Data by Date
        let filteredLogs = [];
        const today = new Date();
        const todayStr = today.toDateString();
        
        if (range === 'today') {
            filteredLogs = logs.filter(l => l.date === todayStr);
        } else {
            const weekAgo = new Date();
            weekAgo.setDate(today.getDate() - 7);
            filteredLogs = logs.filter(l => new Date(l.date) >= weekAgo);
        }

        // 2. THE FIX: Separate Focus vs Recovery
        const focusLogs = filteredLogs.filter(l => l.bucket !== 'Recovery');
        const recoveryLogs = filteredLogs.filter(l => l.bucket === 'Recovery');

        const fmtStr = (sec) => {
            if (sec === 0) return "0h 00m";
            if (sec < 60) return "< 1m";
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            if (h === 0) return `${m}m`;
            return `${h}h ${m.toString().padStart(2, '0')}m`;
        };

        // 3. THE FIX: Hero Stats calculates Total Time (Focus + Break)
        const totalFocusSec = focusLogs.reduce((acc, l) => acc + l.duration, 0);
        const totalRecoverySec = recoveryLogs.reduce((acc, l) => acc + l.duration, 0);
        const totalTimeSec = totalFocusSec + totalRecoverySec;
        
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        const yesterdaySec = logs.filter(l => l.date === yesterdayStr).reduce((acc, l) => acc + l.duration, 0);
        
        const deltaSec = totalTimeSec - yesterdaySec;
        const deltaEl = document.getElementById('insightDelta');
        if (deltaEl) {
            if (range === 'week') {
                deltaEl.innerHTML = `Showing last 7 days`;
                deltaEl.className = 'hero-delta negative';
            } else if (deltaSec >= 0) {
                deltaEl.innerHTML = `▲ +${fmtStr(deltaSec)} vs yesterday`;
                deltaEl.className = 'hero-delta';
            } else {
                deltaEl.innerHTML = `▼ -${fmtStr(Math.abs(deltaSec))} vs yesterday`;
                deltaEl.className = 'hero-delta negative';
            }
        }
        
        const totalEl = document.getElementById('insightTotalTime');
        if (totalEl) totalEl.textContent = fmtStr(totalTimeSec);

        // 4. Goal & Quality Math (Strictly uses Focus Time)
        const goalSec = Timer.dailyGoal || (6 * 3600);
        const goalTarget = range === 'week' ? goalSec * 7 : goalSec; 
        const goalPct = Math.round((totalFocusSec / goalTarget) * 100);
        const goalH = Math.round(goalTarget / 3600);
        
        // --- NEW GOAL CARD UI ---
        const goalEl = document.getElementById('insightGoalText');
        const goalBarEl = document.getElementById('insightGoalBar');
        
        if (goalEl) {
            goalEl.textContent = `${goalH}h target • ${goalPct}% Completed`;
        }
        if (goalBarEl) {
            // Caps the visual bar at 100% so it doesn't break out of the card
            goalBarEl.style.width = `${Math.min(goalPct, 100)}%`; 
        }

        // THE FIX: Time-Weighted Quality Algorithm
        let deepSec = 0, ratedSec = 0;
        focusLogs.forEach(l => {
            if (l.quality !== 'unrated') {
                ratedSec += l.duration;
                if (l.quality === 'deep') deepSec += l.duration;
            }
        });
        
        let qPct = 0;
        let qLabel = "Pending";
        if (ratedSec > 0) {
            qPct = Math.round((deepSec / ratedSec) * 100);
            qLabel = "Distracted";
            if (qPct >= 80) qLabel = "Strong";
            else if (qPct >= 60) qLabel = "Good";
        }

        // --- NEW QUALITY CARD UI ---
        const qualityEl = document.getElementById('insightQualityText');
        const qualityBadgeEl = document.getElementById('insightQualityBadge');
        
        if (qualityEl) {
            qualityEl.textContent = ratedSec > 0 ? `${qPct}% • ${qLabel}` : "Pending";
        }
        
        if (qualityBadgeEl) {
            if (ratedSec > 0) {
                qualityBadgeEl.classList.remove('hidden'); 
                
                // Dynamic styling - Minimalist Edition (No borders, softer tints)
                if (qPct >= 80) {
                    qualityBadgeEl.textContent = 'Excellent';
                    qualityBadgeEl.style.color = '#4CAF50';
                    qualityBadgeEl.style.background = 'rgba(76, 175, 80, 0.1)'; 
                    qualityBadgeEl.style.border = 'none';
                } else if (qPct >= 60) {
                    qualityBadgeEl.textContent = 'Good';
                    qualityBadgeEl.style.color = '#F5A623';
                    qualityBadgeEl.style.background = 'rgba(245, 166, 35, 0.1)';
                    qualityBadgeEl.style.border = 'none';
                } else {
                    qualityBadgeEl.textContent = 'Needs Work';
                    qualityBadgeEl.style.color = '#FF453A';
                    qualityBadgeEl.style.background = 'rgba(255, 69, 58, 0.1)';
                    qualityBadgeEl.style.border = 'none';
                }
            } else {
                qualityBadgeEl.classList.add('hidden');
            }
        }

        // 5. Data Buckets
        const macros = { "Study": 0, "Work": 0, "Others": 0 };
        const micros = {};
        
        focusLogs.forEach(l => {
            const cleanBucket = l.bucket.replace(/📚 |💼 |🎯 /g, '');
            if (macros[cleanBucket] !== undefined) macros[cleanBucket] += l.duration;
            else macros["Others"] += l.duration;
            
            // THE FIX: Merge safety nets into a single clean bar
            let displaySubject = l.subject;
            if (displaySubject === "Deep Focus" || displaySubject === "Deep Work") {
                displaySubject = "Uncategorized"; 
            }
            
            micros[displaySubject] = (micros[displaySubject] || 0) + l.duration;
        });

        const buildBars = (dataObj, totalSec, forceShowAll, maxItems = null) => {
            if (totalSec === 0) return '<div style="color:#666; font-size:13px; margin-bottom:15px;">No data yet.</div>';
            
            let sorted = Object.entries(dataObj);
            if (!forceShowAll) sorted = sorted.sort((a, b) => b[1] - a[1]); 

            // 🛑 THE FIX: Slice the array if a maxItems limit is provided
            let filtered = sorted.filter(a => a[1] > 0 || forceShowAll);
            if (maxItems) filtered = filtered.slice(0, maxItems);

            return filtered.map(([name, sec], index) => {
                const pct = totalSec > 0 ? Math.round((sec / totalSec) * 100) : 0;
                const isTop = !forceShowAll && index === 0 && sec > 0;
                
                return `
                    <div class="insight-row">
                        <span class="row-label">${name}</span>
                        <span>${fmtStr(sec)} (${pct}%)</span>
                    </div>
                    <div class="insight-bar-bg">
                        <div class="insight-bar-fill ${(isTop || (forceShowAll && index === 0 && sec > 0)) ? 'accent' : ''}" style="width: ${pct}%"></div>
                    </div>
                `;
            }).join('');
        };

        const macroEl = document.getElementById('insightMacroBars');
        if (macroEl) macroEl.innerHTML = buildBars(macros, totalFocusSec, true);

        const microEl = document.getElementById('insightMicroBars');
        // 🛑 THE FIX: Pass "12" as the maxItems parameter
        if (microEl) microEl.innerHTML = buildBars(micros, totalFocusSec, false, 12);
        
        // THE FIX: Efficiency now measures Focus vs Recovery
        const efficiencyEl = document.getElementById('insightEfficiencyBars');
        if (efficiencyEl) {
            const effObj = { "Focus": totalFocusSec, "Recovery": totalRecoverySec };
            efficiencyEl.innerHTML = buildBars(effObj, totalTimeSec, true);
        }

        const topSubjectArr = Object.entries(micros).sort((a,b) => b[1]-a[1]);
        const highlightEl = document.getElementById('insightHighlight');
        if (highlightEl) {
            if (topSubjectArr.length > 0 && topSubjectArr[0][1] > 0) {
                highlightEl.innerHTML = `Most time spent: <strong style="color: var(--text-main);">${topSubjectArr[0][0]}</strong>`;
            } else {
                highlightEl.innerHTML = `Most time spent: —`;
            }
        }

        // 6. Recent Sessions List (Only shows Focus, ignores Breaks!)
        const journalEl = document.getElementById('insightJournalList');
        if (journalEl) {
            if (focusLogs.length === 0) {
                journalEl.innerHTML = '<div style="color: var(--text-dim); font-size:13px; padding-bottom: 20px;">No sessions logged yet.</div>';
            } else {
                journalEl.innerHTML = focusLogs.slice(0, 20).map(log => {
                    let displayTask = log.task;
                    
                    // 🛑 THE FIX: If it's uncategorized, just show "Focus Session" (or whatever they typed)
                    if (log.subject !== "Uncategorized") {
                         displayTask = `${log.subject} — ${log.task}`;
                    }
                    
                    return `
                    <div class="journal-item">
                        <div class="journal-meta">
                            ${log.time} <span style="opacity: 0.3; margin: 0 4px;">|</span> ${Math.round(log.duration/60)}m
                        </div>
                        <div class="journal-task">${displayTask}</div>
                    </div>
                    `;
                }).join('');
            }
        }
    }

}; // UI Object Ends


// ==========================================
// 🚀 PWA BACKGROUND CATCH-UP ENGINE
// ==========================================
// Forces the timer to mathematically update the exact millisecond the user 
// switches back to the tab, before the browser's setInterval even wakes up.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && typeof Timer !== 'undefined' && Timer.isRunning) {
        
        if (Timer.isMomentum) {
            const now = Date.now();
            Timer.momentumSeconds = Math.floor((now - Timer.momentumStartTime) / 1000);
            Timer.render();
            
        } else if (Timer.endTime) {
            const delta = Timer.endTime - Date.now();
            
            if (delta > 0) {
                Timer.remaining = Math.ceil(delta / 1000);
                Timer.render();
            } else {
                // If time ran out while the app was minimized, instantly trigger completion!
                clearInterval(Timer.interval);
                Timer.remaining = 0;
                
                if (Timer.isMomentumMode) {
                    // THE FIX: Recover the exact background momentum seconds so we don't lose them!
                    const overTime = Math.abs(Math.floor(delta / 1000));
                    Timer.triggerMomentumTransition(overTime);
                } else {
                    Timer.finish();
                }
            }
        }
    }
});