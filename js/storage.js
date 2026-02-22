const Storage = {
    KEYS: { 
        MODE: 'blok_mode', 
        TIMER_DUR: 'blok_timer_dur',
        
        // Persistence
        TIMER_END: 'blok_timer_end',       
        TIMER_REMAINING: 'blok_timer_rem', 
        TIMER_STATE: 'blok_timer_state',
        TIMER_MOMENTUM: 'blok_timer_momentum', // Renamed

        // Stopwatch
        SW_START: 'blok_sw_start',     
        SW_ELAPSED: 'blok_sw_elapsed', 
        SW_STATE: 'blok_sw_state',     
        SW_LAPS: 'blok_sw_laps',

        // Stats & Settings
        DAILY_TOTAL: 'blok_daily_total', 
        DAILY_DATE: 'blok_daily_date',
        DAILY_GOAL: 'blok_daily_goal',
        MOMENTUM_MODE: 'blok_momentum_mode', // Renamed
        HISTORY: 'blok_history',
        JOURNAL_LOG: 'blok_journal_log',
        JOURNAL_ARCHIVE: 'blok_journal_archive', // Archived Journals
        LAST_PRESET: 'blok_last_preset',
        CUSTOM_CFG: 'blok_custom_cfg',

        // Settings
        THEME_PREF: 'blok_theme_pref',
        SOUND_ON: 'blok_sound_on',
        HAPTICS_ON: 'blok_haptics_on',
        AWAKE_ON: 'blok_awake_on',
        BGM_TRACK: 'blok_bgm_track',

        // v10.0 AUTOFLOW TRACKERS
        AUTOFLOW_ENABLED: 'blok_autoflow_enabled',
        BREAK_PREF: 'blok_break_pref', 
        SESSION_PHASE: 'blok_session_phase', 
        SESSION_BASE_DUR: 'blok_session_base_dur',
        SESSION_FOCUS_TALLY: 'blok_session_focus_tally',
        SESSION_BREAK_TALLY: 'blok_session_break_tally'
    },

    get(key, fallback = null) {
        try { 
            const item = localStorage.getItem(key);
            // Only use fallback if the item doesn't exist yet
            if (item === null) return fallback;
            return JSON.parse(item); 
        } catch (e) { 
            return fallback; 
        }
    },
    
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    remove(key) { localStorage.removeItem(key); }
};