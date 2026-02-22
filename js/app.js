const App = {
    mode: 'timer',
    wakeLock: null,

    init() {
        document.body.addEventListener('click', () => Sound.init(), { once: true });
        
        Theme.init();
        Journal.init(); //must be before UI & Timer
        UI.init();
        Timer.init(); 
        Stopwatch.init();
        
        this.mode = Storage.get(Storage.KEYS.MODE, 'timer');
        this.renderState();
        this.bindEvents();
        this.setupPWAInstall();
        
        // Smart tab-switching recovery
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                const isRunning = (this.mode === 'timer' && Timer.isRunning) || (this.mode === 'stopwatch' && Stopwatch.isRunning);
                if (isRunning) this.requestWakeLock();
            }
        });
    },

    async requestWakeLock() {
        // 1. Check if user turned it off in settings
        const isAwakeOn = Storage.get(Storage.KEYS.AWAKE_ON, true);
        if (!isAwakeOn) return; 
        
        try {
            if ('wakeLock' in navigator) {
                if (this.wakeLock != null) return; // Already locked
                
                this.wakeLock = await navigator.wakeLock.request('screen');
                
                this.wakeLock.addEventListener('release', () => {
                    this.wakeLock = null;
                });
            }
        } catch (err) {
            console.log("Wake Lock failed:", err);
        }
    },

    setupPWAInstall() {
        // ==========================================
        // 📲 CUSTOM PWA INSTALL ENGINE (With iOS Support)
        // ==========================================
        const installGroup = document.getElementById('installGroup');
        const btnInstallApp = document.getElementById('btnInstallApp');
        
        // 1. Detect if the user is on an iPhone/iPad
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        // Detect if the app is already installed and running standalone
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        // --- APPLE DEVICE LOGIC ---
        if (isIOS && !isStandalone) {
            if (installGroup) installGroup.classList.remove('hidden');
            if (btnInstallApp) {
                // Change the button text for Apple users
                btnInstallApp.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg>
                    How to Install on iOS
                `;
                btnInstallApp.addEventListener('click', () => {
                    Sound.play('click');
                    UI.showToast("Tap the Safari 'Share' icon below, then 'Add to Home Screen'");
                });
            }
            return; // Stop here for iOS
        }

        // --- ANDROID / CHROME LOGIC ---
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (installGroup) installGroup.classList.remove('hidden');
        });

        if (btnInstallApp) {
            btnInstallApp.addEventListener('click', async () => {
                if (deferredPrompt) {
                    Sound.play('click');
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        if (installGroup) installGroup.classList.add('hidden');
                    }
                    deferredPrompt = null;
                }
            });
        }
        
        // Hide the button completely if they install it successfully
        window.addEventListener('appinstalled', () => {
            if (installGroup) installGroup.classList.add('hidden');
        });
    },

    async releaseWakeLock() {
        if (this.wakeLock != null) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
            } catch (err) {}
        }
    },

    switchMode(newMode) {
        if (this.mode === 'timer') Timer.pause(); else Stopwatch.pause();
        this.mode = newMode;
        Storage.set(Storage.KEYS.MODE, newMode);
        this.renderState();
    },

    renderState() {
        UI.switchLayout(this.mode);
        
        let isRunning = false;

        if (this.mode === 'timer') {
            Timer.render(); 
            isRunning = Timer.isRunning;
            UI.setPlayState(isRunning);
            UI.toggleReset(!isRunning && (Timer.remaining !== Timer.duration || Timer.isMomentum));
        } else {
            Stopwatch.render(); 
            isRunning = Stopwatch.isRunning;
            UI.setPlayState(isRunning);
            UI.toggleLap(isRunning);
            UI.toggleReset(!isRunning && Stopwatch.elapsed > 0);
        }

        if (isRunning) this.requestWakeLock(); else this.releaseWakeLock();
    },

    bindEvents() {
        document.getElementById('tabTimer').onclick = () => { Sound.play('click'); this.switchMode('timer'); };
        document.getElementById('tabStopwatch').onclick = () => { Sound.play('click'); this.switchMode('stopwatch'); };

        document.getElementById('btnMain').onclick = () => { 
            if (this.mode === 'timer') {
                Timer.toggle();
            } else {
                Stopwatch.toggle();
            }
        };

        document.getElementById('btnReset').onclick = () => { 
            Sound.play('click'); 
            if (this.mode === 'timer') {
                Timer.handleStopClick(); 
            } else {
                Stopwatch.reset();
            }
        };

        // Trigger Momentum Mode
        document.getElementById('btnMomentum').onclick = () => {
             Sound.play('click');
             Timer.toggleMomentumMode();
        };

        document.getElementById('btnLap').onclick = () => Stopwatch.lap();
        
        document.getElementById('btnCancelModal').onclick = () => UI.toggleModal(false);
        
        document.getElementById('btnStartModal').onclick = () => {
            const h = parseInt(UI.els.inputs.h.value) || 0;
            const m = parseInt(UI.els.inputs.m.value) || 0;
            const s = parseInt(UI.els.inputs.s.value) || 0;
            
            // 🛑 BUG FIX: Prevent 00:00:00 timers
            if (h === 0 && m === 0 && s === 0) {
                Sound.play('click');
                UI.showToast("Please enter a duration greater than 0");
                return; // Stop the function completely
            }
            
            Storage.set(Storage.KEYS.CUSTOM_CFG, { h, m, s });
            UI.buildMenu();
            Timer.set(h, m, s, 'Custom'); 
            UI.toggleModal(false);
            setTimeout(() => UI.highlightPreset(m, h, s), 0);
        };
        
        const btnClose = document.getElementById('btnModalClose');
        if (btnClose) {
            btnClose.onclick = () => {
                Sound.play('click');
                
                if (Timer.isMomentum) {
                    Timer.stopAndSave(false); 
                } else {
                    Timer.reset();
                }
                
                UI.toggleCompleteModal(false);
                UI.setSuccessState(false);
            };
        }

        // 🛑 THE FIX: Click outside to close Settings Modal
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                // If they clicked the dark overlay itself (not the menu inside it)
                if (e.target === settingsModal) {
                    Sound.play('click');
                    UI.toggleSettingsModal(false);
                }
            });
        }

        document.getElementById('dailyStats').onclick = () => { Sound.play('click'); UI.toggleStatsModal(true); };
        document.getElementById('btnCloseStats').onclick = () => UI.toggleStatsModal(false);

        // Allow clicking the dark backdrop to close the Insights modal
        const statsModal = document.getElementById('statsModal');
        if (statsModal) {
            statsModal.addEventListener('click', (e) => {
                // Ensure they clicked EXACTLY on the background, not inside the box
                if (e.target === statsModal) {
                    Sound.play('click'); 
                    UI.toggleStatsModal(false);
                }
            });
        }

        // ==========================================
        // 📊 STATS MODAL TAB SWITCHING (v12.0)
        // ==========================================
        const statsTabs = document.querySelectorAll('#statsTabSelector .seg-btn');
        if (statsTabs.length > 0) {
            statsTabs.forEach(btn => {
                btn.onclick = (e) => {
                    // Ignore the click if we are already on this tab
                    if (e.target.classList.contains('active')) return; 

                    Sound.play('click');
                    
                    const modalEl = document.querySelector('#statsModal .modal');
                    
                    // STEP 1: Measure the exact height BEFORE changing anything
                    const oldHeight = modalEl.getBoundingClientRect().height;
                    
                    // 1. Update active button styling
                    statsTabs.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // 2. Hide all tab content panels
                    document.getElementById('tabOverview').classList.add('hidden');
                    document.getElementById('tabInsights').classList.add('hidden');
                    document.getElementById('tabSync').classList.add('hidden');
                    
                    // 3. Show the targeted panel
                    const targetTab = e.target.dataset.tab; 
                    const targetId = 'tab' + targetTab.charAt(0).toUpperCase() + targetTab.slice(1);
                    document.getElementById(targetId).classList.remove('hidden');

                    // 4. Trigger the data render BEFORE measuring the new height
                    if (targetTab === 'insights' && typeof UI.renderInsights === 'function') {
                        // Keep current subnav range (Today vs Week)
                        const btnWeek = document.getElementById('btnRangeWeek');
                        const isWeek = btnWeek && btnWeek.classList.contains('active');
                        UI.renderInsights(isWeek ? 'week' : 'today'); 
                    }

                    // STEP 2: Measure the new natural height AFTER the data is injected
                    modalEl.style.height = 'auto'; 
                    const newHeight = modalEl.getBoundingClientRect().height;

                    // STEP 3: Animate the difference smoothly!
                    modalEl.getAnimations().forEach(anim => anim.cancel());
                    modalEl.animate([
                        { height: `${oldHeight}px` },
                        { height: `${newHeight}px` }
                    ], {
                        duration: 400,
                        easing: 'cubic-bezier(0.19, 1, 0.22, 1)'
                    }).onfinish = () => {
                        modalEl.style.height = 'auto'; // Hand control back to CSS
                    };
                };
            });
        }

        // ==========================================
        // 📅 INSIGHTS TIME RANGE TOGGLE (v12.0)
        // ==========================================
        const btnToday = document.getElementById('btnRangeToday');
        const btnWeek = document.getElementById('btnRangeWeek');
        
        if (btnToday && btnWeek) {
            btnToday.onclick = () => {
                if (btnToday.classList.contains('active')) return;
                Sound.play('click');
                
                const modalEl = document.querySelector('#statsModal .modal');
                const oldHeight = modalEl.getBoundingClientRect().height;
                
                btnToday.classList.add('active');
                btnWeek.classList.remove('active');
                if (typeof UI.renderInsights === 'function') UI.renderInsights('today');
                
                modalEl.style.height = 'auto';
                const newHeight = modalEl.getBoundingClientRect().height;
                
                modalEl.animate([ { height: `${oldHeight}px` }, { height: `${newHeight}px` } ], {
                    duration: 400, easing: 'cubic-bezier(0.19, 1, 0.22, 1)'
                }).onfinish = () => modalEl.style.height = 'auto';
            };
            
            btnWeek.onclick = () => {
                if (btnWeek.classList.contains('active')) return;
                Sound.play('click');
                
                const modalEl = document.querySelector('#statsModal .modal');
                const oldHeight = modalEl.getBoundingClientRect().height;
                
                btnWeek.classList.add('active');
                btnToday.classList.remove('active');
                if (typeof UI.renderInsights === 'function') UI.renderInsights('week');
                
                modalEl.style.height = 'auto';
                const newHeight = modalEl.getBoundingClientRect().height;
                
                modalEl.animate([ { height: `${oldHeight}px` }, { height: `${newHeight}px` } ], {
                    duration: 400, easing: 'cubic-bezier(0.19, 1, 0.22, 1)'
                }).onfinish = () => modalEl.style.height = 'auto';
            };
        }


        document.getElementById('btnGoalInc').onclick = () => {
            let current = parseInt(UI.els.goalValue.textContent) || 6;
            if (current < 15) { current++; UI.updateGoalUI(current); Timer.setGoal(current); }
        };
        
        document.getElementById('btnGoalDec').onclick = () => {
            let current = parseInt(UI.els.goalValue.textContent) || 6;
            if (current > 1) { current--; UI.updateGoalUI(current); Timer.setGoal(current); }
        };
        
        if (UI.els.btnSettings) {
            UI.els.btnSettings.onclick = () => { Sound.play('click'); UI.toggleSettingsModal(true); };
        }
        if (UI.els.btnCloseSettings) {
            UI.els.btnCloseSettings.onclick = () => { Sound.play('click'); UI.toggleSettingsModal(false); };
        }

        if (UI.els.themeBtns) {
            UI.els.themeBtns.forEach(btn => {
                btn.onclick = (e) => {
                    Sound.play('click');
                    Theme.setPreference(e.target.dataset.val); 
                    UI.updateSettingsUI(); 
                };
            });
        }

        if (UI.els.toggleAutoFlow) {
            UI.els.toggleAutoFlow.onclick = () => {
                Sound.play('click');
                Timer.toggleAutoFlowSetting();
            };
        }

        if (UI.els.breakBtns) {
            UI.els.breakBtns.forEach(btn => {
                btn.onclick = (e) => {
                    Sound.play('click');
                    Timer.setBreakPref(parseInt(e.target.dataset.val));
                };
            });
        }

        if (UI.els.toggleSound) {
            UI.els.toggleSound.onclick = () => {
                const current = Storage.get(Storage.KEYS.SOUND_ON, true);
                Storage.set(Storage.KEYS.SOUND_ON, !current); 
                UI.updateSettingsUI(); 
                Sound.play('click');   
            };
        }

        if (UI.els.toggleNotifications) {
            UI.els.toggleNotifications.onclick = async () => {
                const current = Storage.get(Storage.KEYS.NOTIFICATIONS_ON, false);
                const isTurningOn = !current;
                
                if (isTurningOn) {
                    const granted = await Notify.requestPermission();
                    if (!granted) {
                        UI.showToast("Notification permission denied");
                        return; // Stop here, don't flip the switch
                    }
                }
                
                Storage.set(Storage.KEYS.NOTIFICATIONS_ON, isTurningOn);
                UI.updateSettingsUI();
                Sound.play('click');
            };
        }

        if (UI.els.toggleHaptics) {
            UI.els.toggleHaptics.onclick = () => {
                const current = Storage.get(Storage.KEYS.HAPTICS_ON, true);
                Storage.set(Storage.KEYS.HAPTICS_ON, !current); 
                UI.updateSettingsUI();
                Sound.play('click');
            };
        }

        // ==========================================
        // 🔆 KEEP SCREEN AWAKE TOGGLE LOGIC (v10.5)
        // ==========================================
        if (UI.els.toggleAwake) {
            UI.els.toggleAwake.onclick = () => {
                const current = Storage.get(Storage.KEYS.AWAKE_ON, true);
                const newState = !current;
                Storage.set(Storage.KEYS.AWAKE_ON, newState); 
                UI.updateSettingsUI();
                Sound.play('click');
                
                // Smart Feature: Apply immediately if a timer is currently running!
                const isRunning = (this.mode === 'timer' && Timer.isRunning) || (this.mode === 'stopwatch' && Stopwatch.isRunning);
                if (isRunning) {
                    if (newState) this.requestWakeLock();
                    else this.releaseWakeLock();
                }
            };
        }

        // ==========================================
        // 🎧 BGM TRACK SELECTION (v10.6)
        // ==========================================
        if (UI.els.bgmBtns) {
            UI.els.bgmBtns.forEach(btn => {
                btn.onclick = (e) => {
                    Sound.play('click');
                    const track = e.target.dataset.val;
                    Storage.set(Storage.KEYS.BGM_TRACK, track); 
                    UI.updateSettingsUI();
                    
                    BGM.setTrack(track);

                    // If the timer is actively running, switch the audio instantly.
                    // If it is paused, do nothing (removed the irritating preview).
                    const isRunning = (this.mode === 'timer' && Timer.isRunning) || (this.mode === 'stopwatch' && Stopwatch.isRunning);
                    const isBreak = document.body.classList.contains('mode-break');
                    
                    if (isRunning && !isBreak) {
                        BGM.play();
                    }
                };
            });
        }
        
        if (UI.els.btnResetData) {
            UI.els.btnResetData.onclick = () => {
                Sound.play('click');
                UI.toggleSettingsModal(false); 
                
                setTimeout(() => {
                    UI.toggleConfirmModal(true);
                }, 300); 
            };
        }

        if (UI.els.btnCancelReset) {
            UI.els.btnCancelReset.onclick = () => {
                Sound.play('click');
                UI.toggleConfirmModal(false);
            };
        }

        if (UI.els.btnConfirmReset) {
            UI.els.btnConfirmReset.onclick = () => {
                Sound.play('click');
                localStorage.clear();       
                window.location.reload();   
            };
        }

        // ==========================================
        // 🔄 SYNC, EXPORT & SMART MERGE ENGINE (v12.2)
        // ==========================================

        // 1. CSV SPREADSHEET EXPORT
        const btnCSV = document.getElementById('btnExportCSV');
        if (btnCSV) {
            btnCSV.onclick = () => {
                Sound.play('click');
                const duration = document.getElementById('exportDuration').value;
                const allLogs = typeof Journal !== 'undefined' ? Journal.getAllLogs() : [];
                
                const now = Date.now();
                const cutoff = duration === 'all' ? 0 : now - (parseInt(duration) * 24 * 60 * 60 * 1000);
                const filteredLogs = allLogs.filter(log => log.id >= cutoff);
                
                let csvContent = "Date,Time,Subject,Task,Duration,Focus Quality\n";
                filteredLogs.forEach(log => {
                    const h = Math.floor(log.duration / 3600);
                    const m = Math.floor((log.duration % 3600) / 60);
                    const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                    const safeTask = `"${(log.task || '').replace(/"/g, '""')}"`;
                    const safeSubject = `"${(log.subject || '').replace(/"/g, '""')}"`;
                    csvContent += `${log.date},${log.time},${safeSubject},${safeTask},${durStr},${log.quality}\n`;
                });

                // Create unique filename with timestamp
                const d = new Date();
                const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(/ /g, '');
                const timeStr = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit' }).replace(':', '');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `blok_data_${dateStr}_${timeStr}.csv`;
                document.body.appendChild(a); 
                a.click(); 
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                UI.showToast("Spreadsheet downloaded!");
            };
        }

        // 2. JSON BACKUP EXPORT (With Unlimited Storage Blob & Timestamp Naming)
        const btnExport = document.getElementById('btnExportSync');
        if (btnExport) {
            btnExport.onclick = () => {
                Sound.play('click');
                const exportData = {
                    history: Storage.get(Storage.KEYS.HISTORY, {}),
                    journal: typeof Journal !== 'undefined' ? Journal.getAllLogs() : []
                };
                
                // Create unique filename with timestamp
                const d = new Date();
                const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(/ /g, '');
                const timeStr = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit' }).replace(':', '');

                // Use a Blob to bypass browser size limits
                const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `blok_backup_${dateStr}_${timeStr}.json`;
                document.body.appendChild(a); 
                a.click(); 
                document.body.removeChild(a);
                URL.revokeObjectURL(url); // Clean up memory
                
                UI.showToast("Backup exported securely");
            };
        }

        // 3. JSON SMART MERGE (ACTIVE vs COLD STORAGE)
        const importInput = document.getElementById('importSyncFile');
        if (importInput) {
            importInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedData = JSON.parse(event.target.result);
                        let currentHistory = Storage.get(Storage.KEYS.HISTORY, {});
                        
                        // Merge History (Keep the highest value for each day)
                        if (importedData.history) {
                            for (const [date, seconds] of Object.entries(importedData.history)) {
                                if (!currentHistory[date] || importedData.history[date] > currentHistory[date]) {
                                    currentHistory[date] = importedData.history[date];
                                }
                            }
                            Storage.set(Storage.KEYS.HISTORY, currentHistory);
                            
                            const todayStr = new Date().toDateString();
                            const todayTotal = currentHistory[todayStr] || 0;
                            Storage.set(Storage.KEYS.DAILY_TOTAL, todayTotal);
                            if (typeof Timer !== 'undefined') {
                                Timer.dailySeconds = todayTotal;
                                UI.updateStats(todayTotal);
                                UI.updateRing(todayTotal, Timer.dailyGoal);
                            }
                        }

                        // Merge Journal, Remove Duplicates, Split into Active/Archive
                        if (importedData.journal && Array.isArray(importedData.journal)) {
                            const currentLogs = typeof Journal !== 'undefined' ? Journal.getAllLogs() : [];
                            const combined = [...currentLogs, ...importedData.journal];
                            
                            const uniqueMap = new Map();
                            combined.forEach(log => {
                                if (!uniqueMap.has(log.id)) uniqueMap.set(log.id, log);
                            });
                            
                            let finalJournal = Array.from(uniqueMap.values());
                            finalJournal.sort((a, b) => b.id - a.id); // Newest first
                            
                            const MAX = typeof Journal !== 'undefined' ? Journal.MAX_ENTRIES : 500;
                            const active = finalJournal.slice(0, MAX);
                            const archive = finalJournal.slice(MAX);
                            
                            Storage.set(Storage.KEYS.JOURNAL_LOG, active);
                            Storage.set(Storage.KEYS.JOURNAL_ARCHIVE, archive);
                        }

                        Sound.play('click');
                        UI.showToast("Data merged successfully!");
                        
                        // Force Insights tab to recalculate
                        if (typeof UI.renderInsights === 'function') {
                            const btnWeek = document.getElementById('btnRangeWeek');
                            const isWeek = btnWeek && btnWeek.classList.contains('active');
                            UI.renderInsights(isWeek ? 'week' : 'today');
                        }

                    } catch (err) {
                        alert("Invalid backup file.");
                        console.error(err);
                    }
                    importInput.value = ''; 
                };
                reader.readAsText(file);
            };
        }

        // ==========================================
        // 🖥️ FULL SCREEN FEATURES (v10.4)
        // ==========================================

        document.body.addEventListener('dblclick', (e) => {
            const target = e.target;
            if (target.tagName.toLowerCase() === 'button' || target.closest('button') || target.tagName.toLowerCase() === 'input') {
                return;
            }
            UI.toggleFullScreen();
        });

        // ==========================================
        // ⌨️ GLOBAL KEYBOARD SHORTCUTS ENGINE
        // ==========================================
        document.addEventListener('keydown', (e) => {
            // 1. Ignore shortcuts if the user is typing a task intent or in a text box
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable) {
                return;
            }

            // 2. SPACEBAR: Play / Pause
            if (e.code === 'Space') {
                e.preventDefault(); // Stop the browser from scrolling down
                
                // Remove focus from any recently clicked buttons to prevent double-firing
                if (document.activeElement && typeof document.activeElement.blur === 'function') {
                    document.activeElement.blur(); 
                }
                
                if (this.mode === 'timer') {
                    Timer.toggle();
                } else {
                    Stopwatch.toggle();
                }
            }

            // 3. 'F' KEY: Toggle Full Screen
            if (e.key.toLowerCase() === 'f') {
                e.preventDefault();
                UI.toggleFullScreen();
            }

            // 4. 'L' KEY: Lap (Stopwatch only)
            if (e.key.toLowerCase() === 'l') {
                if (this.mode === 'stopwatch' && Stopwatch.isRunning) {
                    e.preventDefault();
                    Stopwatch.lap();
                }
            }

            // 5. 'M' KEY: Toggle Settings Menu
            if (e.key.toLowerCase() === 'm') {
                e.preventDefault();
                const settingsModal = document.getElementById('settingsModal');
                if (settingsModal) {
                    const isHidden = settingsModal.classList.contains('hidden');
                    Sound.play('click'); // Add tactile feedback
                    UI.toggleSettingsModal(isHidden); // Opens if hidden, closes if open
                }
            }

            // 6. 'ESCAPE' KEY: Close informational modals safely
            if (e.key === 'Escape') {
                const settingsModal = document.getElementById('settingsModal');
                const statsModal = document.getElementById('statsModal');
                
                // If Settings is open, close it
                if (settingsModal && !settingsModal.classList.contains('hidden')) {
                    e.preventDefault();
                    Sound.play('click');
                    UI.toggleSettingsModal(false);
                } 
                // If Stats is open, close it
                else if (statsModal && !statsModal.classList.contains('hidden')) {
                    e.preventDefault();
                    Sound.play('click');
                    const btnCloseStats = document.getElementById('btnCloseStats');
                    if (btnCloseStats) btnCloseStats.click();
                }
            }
            
        });

        // ==========================================
        // 👆 PREMIUM GESTURES: VIEWPORT SWIPE UP (v12.3)
        // ==========================================
        const swipeZone = document.querySelector('.viewport');
        if (swipeZone) {
            let touchStartY = 0;
            let touchStartX = 0;

            swipeZone.addEventListener('touchstart', (e) => {
                // Safegaurd: Ignore if they are touching a button or typing a task
                const target = e.target;
                if (target.tagName.toLowerCase() === 'button' || target.closest('button') || target.tagName.toLowerCase() === 'input') {
                    return;
                }

                touchStartY = e.touches[0].clientY;
                touchStartX = e.touches[0].clientX;
            }, { passive: true });

            swipeZone.addEventListener('touchend', (e) => {
                const target = e.target;
                if (target.tagName.toLowerCase() === 'button' || target.closest('button') || target.tagName.toLowerCase() === 'input') {
                    return;
                }

                const touchEndY = e.changedTouches[0].clientY;
                const touchEndX = e.changedTouches[0].clientX;

                // Calculate distances
                const deltaY = touchStartY - touchEndY; // Positive = Swiped UP
                const deltaX = Math.abs(touchStartX - touchEndX);

                // 1. deltaY > 40: Must swipe up at least 40 pixels.
                // 2. deltaY > deltaX: Must be a vertical swipe, not horizontal.
                if (deltaY > 40 && deltaY > deltaX) {
                    Sound.play('click');
                    UI.toggleSettingsModal(true);
                }
            }, { passive: true });
        }

        // ==========================================
        // 👇 PREMIUM GESTURES: SWIPE DOWN TO CLOSE MODAL (v12.4)
        // ==========================================
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            let startY = 0;
            let startScrollY = 0;

            modal.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                // Record exactly where the scrollbar is when they touch the screen
                startScrollY = modal.scrollTop; 
            }, { passive: true });

            modal.addEventListener('touchend', (e) => {
                const endY = e.changedTouches[0].clientY;
                const deltaY = endY - startY; // Positive number means they swiped DOWN
                
                // 1. deltaY > 60: They must swipe down a deliberate distance (60px).
                // 2. startScrollY <= 0: They must be at the very top of the modal.
                if (deltaY > 60 && startScrollY <= 0) {
                    
                    // The safest way to close: Find the specific "Close/Cancel" button 
                    // inside this exact modal and secretly click it for them!
                    // This ensures all your existing save/reset logic runs perfectly.
                    const closeBtn = modal.querySelector('.cancel, .modal-close-icon, #btnCloseSettings');
                    if (closeBtn) {
                        closeBtn.click();
                    }
                }
            }, { passive: true });
        });
        
    }

}; 

document.addEventListener('DOMContentLoaded', () => App.init());

// ==========================================
// 🚀 PWA REGISTRATION & UPDATE ENGINE
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        let refreshing = false;

        // Listen for the Service Worker to switch over
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                window.location.reload();
                refreshing = true;
            }
        });

        // Register the worker and look for updates
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('BLOK PWA: Service Worker Registered');

            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    
                    // If a new version is installed and waiting, show the toast!
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        const toast = document.getElementById('toastUpdate');
                        if (toast) {
                            toast.classList.remove('hidden');
                            
                            // When they click the toast, tell sw.js to take over
                            toast.onclick = () => {
                                toast.textContent = "Updating...";
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            };
                        }
                    }
                });
            });
        }).catch(err => console.error('BLOK PWA: Service Worker Error', err));
    });
}