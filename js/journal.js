const Journal = {
    // Limits history to 500 sessions to keep localStorage blazing fast (months of data)
    MAX_ENTRIES: 500, 
    _compiledDict: null,

    // THE MASTER DICTIONARY (3-Bucket Architecture)
    // Completely decoupled into individual, independent subjects for accurate tracking
    Dictionary: {
        "📚 Study": {
            "Mathematics": ["math", "maths", "algebra", "calculus", "geometry", "trigonometry", "topology", "arithmetic", "quant", "quantitative", "statistics", "probability", "discrete math"],
            "Physics": ["physics", "kinematics", "thermodynamics", "optics", "mechanics", "electromagnetism", "quantum", "astronomy", "astrophysics"],
            "Chemistry": ["chemistry", "organic chemistry", "inorganic chemistry", "physical chemistry", "biochemistry"],
            "Biology": ["biology", "zoology", "botany", "anatomy", "physiology", "pathology", "ecology"],
            "Genetics": ["genetics", "dna", "heredity", "mutation"],
            "Medicine": ["medicine", "surgery", "mbbs", "neet", "pharmacology", "nursing", "clinical", "pharmacy", "dentistry"],
            "Accounting": ["accounting", "accountancy", "audit", "tax", "taxation"],
            "Economics": ["economics", "macroeconomics", "microeconomics", "economy"],
            "Business": ["business", "commerce", "mba", "marketing", "management", "corporate", "supply chain"],
            "Finance": ["finance", "banking", "investment", "portfolio"],
            "History": ["history", "ancient history", "medieval history", "modern history", "world history", "archaeology"],
            "Geography": ["geography", "human geography", "physical geography", "mapping", "gis"],
            "Polity": ["polity", "constitution", "civics", "governance", "public administration"],
            "Law": ["law", "legal", "jurisprudence", "criminal law", "civil law", "clat", "llb", "corporate law", "litigation"],
            "Sociology": ["sociology", "anthropology", "society", "criminology"],
            "Psychology": ["psychology", "behavioral", "cognitive", "therapy", "psychiatry"],
            "Philosophy": ["philosophy", "ethics", "theology", "logic"],
            "English": ["english", "grammar", "vocab", "vocabulary", "comprehension", "reading", "essay", "eng"],
            "Literature": ["literature", "poetry", "prose", "fiction"],
            "Languages": ["linguistics", "language", "translation", "spanish", "french", "german", "hindi", "sanskrit"],
            "Computer Science": ["computer science", "cs", "algorithm", "data structures", "dsa", "os", "operating system", "dbms", "networking", "cybersecurity"],
            "General Studies (GS)": ["gs", "general studies", "gk", "general knowledge", "current affairs"],
            "Aptitude & Reasoning": ["aptitude", "reasoning", "syllogism", "puzzle", "logical reasoning"],
            "Earth Sciences": ["earth science", "geology", "meteorology", "oceanography", "environmental science"],
            "Fine Arts": ["arts", "fine arts", "painting", "sculpture", "music", "theater", "film"],
            "Architecture & Design": ["architecture", "design", "drawing", "cad", "drafting"]
        },
        "💼 Work": {
            "Software & Tech": ["code", "coding", "programming", "java", "python", "c++", "cpp", "c#", "javascript", "js", "react", "html", "css", "node", "frontend", "backend", "fullstack", "bug", "debug", "dev", "project", "git", "api", "sql", "database", "machine learning", "ml", "ai", "data science"],
            "Admin & Operations": ["email", "meeting", "write", "draft", "report", "edit", "planning", "excel", "presentation", "research", "admin", "strategy", "review", "proposal", "client", "pitch", "sales"],
            "Creative Work": ["designing", "figma", "video editing", "premiere", "photoshop", "illustrator", "animation", "content creation", "youtube", "blogging", "seo"]
        },
        "🎯 Others": {
            "Mindfulness & Personal": ["meditate", "journal", "breathe", "reflection", "plan", "organize", "read", "book", "chores", "hobby", "music practice", "workout", "fitness"]
        }
    },

    init() {
        // 1. Ensure the journal database exists
        if (!Storage.get(Storage.KEYS.JOURNAL_LOG)) {
            Storage.set(Storage.KEYS.JOURNAL_LOG, []);
        }

        // 2. The Auto-Compiler (Converts words into high-speed Regex)
        this._compiledDict = {};
        for (const [bucket, subjects] of Object.entries(this.Dictionary)) {
            this._compiledDict[bucket] = {};
            for (const [subject, keywords] of Object.entries(subjects)) {
                
                // HUMAN-ERROR SAFEGUARD: Ignore empty arrays and trim accidental spaces
                if (!keywords || !Array.isArray(keywords) || keywords.length === 0) continue;
                const validKeywords = keywords.map(kw => kw.trim()).filter(kw => kw.length > 0);
                if (validKeywords.length === 0) continue;

                // Escape special characters (like C++) and join with OR (|)
                const pattern = validKeywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                
                // \b ensures exact word matches (so "aftermath" doesn't trigger "math")
                // 'i' makes it case-insensitive (React = react)
                this._compiledDict[bucket][subject] = new RegExp('\\b(' + pattern + ')\\b', 'i'); 
            }
        }
    },

    categorize(taskText) {
        const cleanTask = (taskText || '').trim();
        
        // Safety Net 1: User started a timer without typing anything
        if (cleanTask === '') {
            return { bucket: "🎯 Others", subject: "Uncategorized" };
        }

        // Scan against the pre-compiled regex dictionary
        for (const [bucket, subjects] of Object.entries(this._compiledDict)) {
            for (const [subject, regex] of Object.entries(subjects)) {
                if (regex.test(cleanTask)) {
                    return { bucket, subject };
                }
            }
        }

        // Safety Net 2: User typed something, but it's not in the dictionary
        return { bucket: "🎯 Others", subject: "Uncategorized" };
    },

    // Instantly save the session when the timer hits zero (Protects against closing the app early)
    recordSession(durationSeconds, taskText) {
        // We do not record tiny test/accidental sessions (< 60s)
        if (durationSeconds < 60) return; 

        const cleanTask = (taskText || '').trim();
        const { bucket, subject } = this.categorize(cleanTask);
        
        const entry = {
            id: Date.now(),
            date: new Date().toDateString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
            duration: durationSeconds,
            task: cleanTask || "Focus Session",
            bucket: bucket,
            subject: subject,
            quality: 'unrated' // Default state! Updated if they click a reflection pill.
        };

        let logs = Storage.get(Storage.KEYS.JOURNAL_LOG, []);
        logs.unshift(entry); // Add to the very top

        // Enforce the Cap to keep app blazing fast
        if (logs.length > this.MAX_ENTRIES) {
            const overflow = logs.pop(); 
            let archive = Storage.get(Storage.KEYS.JOURNAL_ARCHIVE, []);
            archive.unshift(overflow);
            Storage.set(Storage.KEYS.JOURNAL_ARCHIVE, archive);
        }

        Storage.set(Storage.KEYS.JOURNAL_LOG, logs);
    },

    // HELPER: Fetches both Active Memory and Cold Storage for Exporting
    getAllLogs() {
        const active = Storage.get(Storage.KEYS.JOURNAL_LOG, []);
        const archive = Storage.get(Storage.KEYS.JOURNAL_ARCHIVE, []);
        return [...active, ...archive];
    },

    // Update the most recent session(s) when the user clicks 🔥, ⚖️, or 🌀
    updateLastReflection(qualityRating) {
        let logs = Storage.get(Storage.KEYS.JOURNAL_LOG, []);
        if (logs.length === 0) return;

        const todayStr = new Date().toDateString();

        // THE FIX: Loop backwards to catch ALL blocks from a continuous Auto Flow session!
        for (let i = 0; i < logs.length; i++) {
            if (logs[i].date === todayStr && logs[i].quality === 'unrated') {
                logs[i].quality = qualityRating;
            } else if (logs[i].date !== todayStr || logs[i].quality !== 'unrated') {
                // Stop searching the moment we hit a session that is already rated
                break; 
            }
        }
        
        Storage.set(Storage.KEYS.JOURNAL_LOG, logs);
    }
};