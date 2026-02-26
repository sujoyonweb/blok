const Journal = {
    // Limits history to 500 sessions to keep localStorage blazing fast (months of data)
    MAX_ENTRIES: 500, 
    _compiledDict: null,

    // THE MASTER DICTIONARY (3-Bucket Architecture)
    // ORDERED BY PRIORITY: Hyper-specific subjects at the top, broad "safety net" subjects at the bottom.
    Dictionary: {
        "📚 Study": {
            // Tier 1: Highly Niche & Technical (Unlikely to share words)
            "AI & ML": ["artificial intelligence", "ai", "machine learning", "ml", "deep learning", "robotics"],
            "Computer Science": ["computer science", "cs", "computing and it", "algorithm", "data structures", "dsa", "os", "operating system", "dbms", "networking", "cybersecurity", "cryptography", "compiler"],
            "Genetics": ["genetics", "dna", "heredity", "mutation", "evolution"],
            "Medicine": ["medicine", "surgery", "mbbs", "neet", "pharmacology", "clinical", "pharmacy", "dentistry", "usmle", "medical", "epidemiology"],
            "Nursing": ["nursing", "nursing and healthcare", "healthcare", "patient care", "health and social care", "health sciences"],
            "Electronics": ["electronic engineering", "electrical engineering", "circuit design", "microelectronics"],
            "Engineering": ["engineering", "mechanical engineering", "civil engineering", "aerospace", "chemical engineering"],
            "Accounting": ["accounting", "accountancy", "audit", "tax", "taxation", "cpa"],
            "Finance": ["finance", "banking", "investment", "portfolio", "cfa"],
            "Law": ["law", "legal", "jurisprudence", "criminal law", "civil law", "clat", "llb", "corporate law", "litigation"],
            
            // Tier 2: Standard Core Subjects
            "Economics": ["economics", "eco", "macroeconomics", "microeconomics", "economy", "econometrics", "game theory", "fiscal policy"],
            "Business": ["business", "business and management", "commerce", "mba", "management", "corporate", "supply chain", "bba", "entrepreneurship"],
            "Marketing": ["marketing", "sales", "branding", "seo", "social media marketing"],
            "Chemistry": ["chemistry", "chem", "organic chemistry", "inorganic chemistry", "physical chemistry", "biochemistry", "polymers", "stoichiometry", "titration", "thermo", "kinetics", "spectroscopy", "molecular"],
            "Physics": ["physics", "phys", "kinematics", "thermodynamics", "optics", "mechanics", "electromagnetism", "quantum", "astronomy", "astrophysics", "relativity", "fluid mechanics", "dynamics", "acoustics", "nuclear physics"],
            "Biology": ["biology", "bio", "zoology", "botany", "anatomy", "physiology", "pathology", "ecology", "cell division", "mitosis", "meiosis", "science", "marine biology", "biotech"],
            "Psychology": ["psychology", "psych", "behavioral", "cognitive", "neuropsychology", "clinical psychology", "developmental psychology"],
            "Mental Health": ["mental health", "counselling", "therapy", "psychiatry", "health and wellbeing"],
            "Sociology": ["sociology", "anthropology", "society", "social sciences", "demography", "gender studies", "cultural studies", "arts and humanities"],
            "Social Work": ["social work", "criminology", "social care"],
            "Polity": ["polity", "constitution", "civics", "governance", "public administration", "politics", "political science"],
            "History": ["history", "ancient history", "medieval history", "modern history", "world history", "archaeology", "cold war", "renaissance", "industrial revolution", "antiquity", "art history"],
            "Geography": ["geography", "geo", "human geography", "physical geography", "mapping", "gis", "topography", "climatology"],
            "Environment": ["environment", "environmental science", "earth science", "geology", "meteorology", "oceanography"],
            "Mathematics": ["math", "maths", "mathematics", "algebra", "calculus", "geometry", "trigonometry", "topology", "arithmetic", "quant", "quantitative", "discrete math", "set theory", "integration", "derivatives", "matrix", "matrices", "vectors", "differential equations", "linear algebra"],
            "Statistics": ["statistics", "stats", "probability", "data analysis"],
            "Philosophy": ["philosophy", "ethics", "logic", "epistemology", "metaphysics"],
            "Religion": ["religious studies", "theology", "mythology", "religion"],
            "Languages": ["linguistics", "language", "languages", "translation", "spanish", "french", "german", "hindi", "sanskrit", "mandarin", "japanese", "korean", "arabic", "latin"],
            
            // Tier 3: Broad Catch-Alls
            "Literature": ["literature", "lit", "poetry", "prose", "fiction", "novel", "classical studies"],
            "Writing": ["writing", "creative writing", "journalism", "composition", "copywriting"],
            "Design": ["design", "graphic design", "interior design", "cad", "drafting", "textiles", "fashion"],
            "Education": ["education", "early years", "pedagogy", "teaching", "combined studies"],
            "Arts": ["arts", "fine art", "painting", "sculpture", "drawing", "illustration"],
            "Media": ["media", "film", "film and media", "theater", "photography", "visual communications", "visual arts"],
            "Aptitude": ["aptitude", "reasoning", "syllogism", "puzzle", "logical reasoning", "lr", "di", "data interpretation"],
            "English": ["english", "eng", "grammar", "vocab", "vocabulary", "comprehension", "reading", "essay"],
            "General Studies": ["gs", "general studies", "gk", "general knowledge", "current affairs", "upsc", "ssc"]
        },
        "💼 Work": {
            // Highly Specific Professions
            "Software": ["code", "coding", "programming", "software engineering", "java", "python", "c++", "cpp", "c#", "javascript", "js", "typescript", "react", "html", "css", "node", "frontend", "backend", "fullstack", "bug", "debug", "dev", "project", "git", "api", "sql", "database", "refactor", "deployment", "docker", "aws", "cloud", "sysadmin", "qa", "testing"],
            "Clinical": ["patient care", "charting", "rounds", "diagnostics", "lab work", "clinical trials", "therapy session"],
            "Trades": ["construction", "carpentry", "plumbing", "electrical", "welding", "manufacturing", "mechanic", "automotive", "repair", "maintenance", "architecture", "surveying", "farming", "agriculture"],
            "Creative": ["designing", "ui", "ux", "ui/ux", "figma", "video editing", "premiere", "photoshop", "illustrator", "animation", "content creation", "youtube", "blogging", "render", "export", "podcast"],
            "HR & Ops": ["hr", "recruiting", "payroll", "logistics", "inventory", "management"],
            // Broadest Catch-All Work
            "Administration": ["email", "meeting", "write", "draft", "report", "edit", "planning", "excel", "presentation", "deck", "research", "admin", "strategy", "review", "proposal", "client", "pitch", "sync", "onboarding"]
        },
        "🎯 Others": {
            "Fitness": ["sport and fitness", "sport", "fitness", "gym", "workout", "yoga", "running", "jogging", "cycling", "swimming", "lifting", "cardio", "pilates", "martial arts", "stretch", "hiking", "walking"],
            "Mindfulness": ["meditate", "meditation", "journal", "journaling", "breathe", "reflection", "prayer", "spiritual"],
            "Hobbies": ["hobby", "music", "music practice", "guitar", "piano", "singing", "gaming", "video games", "board games", "woodworking", "knitting", "sewing", "crafts", "diy", "gardening", "baking", "cooking"],
            // Broadest Catch-All Life Items
            "Life Admin": ["plan", "organize", "chores", "cleaning", "cook", "groceries", "finances", "budgeting", "taxes", "errands", "laundry", "driving", "commute", "packing", "moving"],
            "Reading": ["read", "book", "reading"]
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