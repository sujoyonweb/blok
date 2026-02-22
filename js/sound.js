class SoundEngine {
    constructor() {
        this.ctx = null;
        this.hasHaptics = 'vibrate' in navigator;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
    }

    play(type = 'click') {
        // --- 1. CHECK SETTINGS ---
        const isSoundOn = Storage.get(Storage.KEYS.SOUND_ON, true);
        
        if (!isSoundOn && type !== 'alarm') {
            this.triggerHaptic(type);
            return;
        }

        // --- 2. TRIGGER HAPTICS ---
        this.triggerHaptic(type);

        // --- 3. PLAY AUDIO ---
        // THE FIX: If context doesn't exist yet, build it right now before proceeding!
        if (!this.ctx) {
            this.init();
        }

        if (!this.ctx) return; // Failsafe
        
        // Browsers pause audio contexts until user interaction. This wakes it up.
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;

        if (type === 'alarm') {
            /* * PREMIUM ALARM (Extended Version) */
            const notes = [ 523.25, 659.25, 783.99, 987.77, 1046.50, null, 783.99, 659.25, 523.25 ]; 
            
            notes.forEach((freq, i) => {
                if (!freq) return; 

                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'triangle'; 
                const startTime = now + (i * 0.2);
                
                osc.frequency.setValueAtTime(freq, startTime);
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0); 
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start(startTime);
                osc.stop(startTime + 2.0);
            });

        } else if (type === 'click') {
            // Premium Mechanical "Thud"
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'sine';
            
            // 🛑 THE FIX: 400Hz creates a deep, tactile physical sensation
            osc.frequency.setValueAtTime(400, now);
            
            // 🛑 THE FIX: Lower volume (0.02) and ultra-fast fade (0.03s) for a sharp snap
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            
            osc.start(now);
            osc.stop(now + 0.03);
        }
    }

    triggerHaptic(type) {
        // First check if the device even supports vibration
        if (!this.hasHaptics) return;
        
        // --- CHECK SETTINGS ---
        // If the user turned off Haptics in the settings, exit immediately.
        const isHapticsOn = Storage.get(Storage.KEYS.HAPTICS_ON, true);
        if (!isHapticsOn) return;

        try {
            if (type === 'alarm') {
                /*
                 * EXTENDED HEARTBEAT
                 * Matches the new longer sound profile.
                 * Pattern: Thump-Thump ... Thump-Thump ... Thump-Thump
                 */
                navigator.vibrate([
                    200, 100, 200,   // First Heartbeat
                    500,             // Pause
                    200, 100, 200,   // Second Heartbeat
                    500,             // Pause
                    200, 100, 200    // Final Heartbeat
                ]);
            } else {
                navigator.vibrate(10); // Crisp Tick
            }
        } catch (e) {}
    }

} // End of SoundEngine Object

// ==========================================
// 🎧 AUDIOPHILE BGM ENGINE (GAPLESS UPDATE)
// ==========================================
const BGM = {
    ctx: null,
    masterGain: null,
    currentTrack: 'none',
    activeNodes: [],
    rainBuffer: null,  // NEW: Holds the seamless rain audio data
    fadeDuration: 2.0, // 2-second luxurious fade
    maxVolume: 0.3,    // 30% volume - kept soft for focus
    isPlaying: false,
    previewTimeout: null,

    init() {
        this.currentTrack = Storage.get(Storage.KEYS.BGM_TRACK, 'none');
    },

    _initCtx() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // Master Gain controls overall BGM volume smoothly
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0;
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    setTrack(trackName) {
        if (this.currentTrack === trackName) return;
        this.pause(true); // Hard stop current track
        this._stopNodes(); // Instantly nuke old nodes so the new track builds fresh
        this.currentTrack = trackName;
    },

    play() {
        if (this.currentTrack === 'none') return;
        if (this.isPlaying) return;
        
        clearTimeout(this.previewTimeout);
        this._initCtx();
        this.isPlaying = true;

        // If nodes aren't active, build the tracks using Web Audio API
        if (this.activeNodes.length === 0) {
            if (this.currentTrack === 'brown') this._buildBrownNoise();
            if (this.currentTrack === 'alpha') this._buildAlphaDrone();
            if (this.currentTrack === 'rain') this._buildRainNode(); // NEW GAPLESS RAIN
        }

        // Fade in AudioContext smoothly
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(this.maxVolume, now + this.fadeDuration);
    },

    pause(instant = false) {
        if (!this.isPlaying && !instant) return;
        this.isPlaying = false;
        clearTimeout(this.previewTimeout);

        if (!this.ctx || !this.masterGain) return;

        const now = this.ctx.currentTime;
        const fadeOutTime = instant ? 0.1 : 1.0; // 1-second fade out

        // Fade out AudioContext smoothly
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0, now + fadeOutTime);

        // Clean up synth nodes after fade out to save CPU
        setTimeout(() => {
            if (!this.isPlaying) this._stopNodes();
        }, fadeOutTime * 1000 + 100);
    },

    preview() {
        this.play();
        this.previewTimeout = setTimeout(() => {
            this.pause();
        }, 4000); 
    },

    _stopNodes() {
        this.activeNodes.forEach(node => {
            try { node.stop(); node.disconnect(); } catch (e) {}
        });
        this.activeNodes = [];
    },

    // --- GAPLESS TRACK LOADERS & SYNTHESIZERS ---

    async _buildRainNode() {
        if (!this.rainBuffer) {
            try {
                const response = await fetch('assets/rain.mp3');
                const arrayBuffer = await response.arrayBuffer();
                const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                
                // 🛑 THE MASTER FIX: In-Memory "Origami" Crossfade
                // We physically fold the last 2 seconds over the first 2 seconds and blend them
                const fadeTime = 2.0; 
                const fadeSamples = Math.floor(fadeTime * decodedBuffer.sampleRate);
                
                // Create a new, flawlessly seamless buffer
                const seamlessBuffer = this.ctx.createBuffer(
                    decodedBuffer.numberOfChannels,
                    decodedBuffer.length - fadeSamples,
                    decodedBuffer.sampleRate
                );
                
                // Process left and right audio channels
                for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
                    const inData = decodedBuffer.getChannelData(channel);
                    const outData = seamlessBuffer.getChannelData(channel);
                    
                    // 1. Crossfade: Blend the end of the track into the exact beginning
                    for (let i = 0; i < fadeSamples; i++) {
                        const fadeRatio = i / fadeSamples;
                        const startSample = inData[i] * fadeRatio; 
                        const endSample = inData[decodedBuffer.length - fadeSamples + i] * (1 - fadeRatio);
                        outData[i] = startSample + endSample;
                    }
                    
                    // 2. Exact Copy: Fill in the rest of the track normally
                    for (let i = fadeSamples; i < seamlessBuffer.length; i++) {
                        outData[i] = inData[i];
                    }
                }
                
                this.rainBuffer = seamlessBuffer;
            } catch (e) {
                console.log("Rain load failed", e);
                return;
            }
        }
        
        if (!this.isPlaying || this.currentTrack !== 'rain') return;

        const source = this.ctx.createBufferSource();
        
        // Feed the engine our custom-built, mathematically perfect loop
        source.buffer = this.rainBuffer;
        source.loop = true; 
        
        source.connect(this.masterGain);
        source.start(0); 
        this.activeNodes.push(source);
    },

    _buildBrownNoise() {
        const bufferSize = this.ctx.sampleRate * 2; 
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0;
        
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; 
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200; 

        whiteNoise.connect(filter);
        filter.connect(this.masterGain);
        whiteNoise.start();
        this.activeNodes.push(whiteNoise);
    },

    _buildAlphaDrone() {
        const oscLeft = this.ctx.createOscillator();
        const oscRight = this.ctx.createOscillator();
        const oscBass = this.ctx.createOscillator();

        const panLeft = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createPanner();
        const panRight = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createPanner();
        if (panLeft.pan) { panLeft.pan.value = -1; panRight.pan.value = 1; } 
        else { panLeft.setPosition(-1, 0, 0); panRight.setPosition(1, 0, 0); }

        // 🛑 THE FIX: Dropped an entire octave for deep relaxation
        oscLeft.type = 'sine';
        oscLeft.frequency.value = 100; 
        oscLeft.connect(panLeft);
        panLeft.connect(this.masterGain);

        oscRight.type = 'sine';
        oscRight.frequency.value = 110; 
        oscRight.connect(panRight);
        panRight.connect(this.masterGain);

        // 🛑 THE FIX: Changed to 'sine' and dropped to 50Hz (Sub-bass warmth, zero buzz)
        oscBass.type = 'sine';
        oscBass.frequency.value = 50;
        const bassGain = this.ctx.createGain();
        bassGain.gain.value = 0.6; // Slightly louder to compensate for human hearing at low Hz
        oscBass.connect(bassGain);
        bassGain.connect(this.masterGain);

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.125; // 8-second breathing cycle
        
        lfoGain.gain.value = 0.4; 
        lfo.connect(lfoGain);
        lfoGain.connect(this.masterGain.gain);

        oscLeft.start(); oscRight.start(); oscBass.start(); lfo.start();
        this.activeNodes.push(oscLeft, oscRight, oscBass, lfo);
    }
};

// Initialize BGM on load
document.addEventListener('DOMContentLoaded', () => BGM.init());

// Initialize BGM on load
document.addEventListener('DOMContentLoaded', () => BGM.init());

const Sound = new SoundEngine();