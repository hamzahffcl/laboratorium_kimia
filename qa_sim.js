const fs = require('fs');

// MOCK BROWSER ENVIRONMENT
let mockLocalStorage = {};
global.localStorage = {
    getItem: (key) => mockLocalStorage[key] || null,
    setItem: (key, value) => mockLocalStorage[key] = value,
    clear: () => mockLocalStorage = {}
};

global.window = { addEventListener: ()=>{} };
global.document = {
    getElementById: (id) => ({ 
        classList: { add:()=>{}, remove:()=>{} }, 
        appendChild: ()=>{}, 
        addEventListener: ()=>{},
        innerHTML: '',
        parentElement: { clientWidth: 800, clientHeight: 600 },
        getContext: () => ({
            save:()=>{}, restore:()=>{}, beginPath:()=>{}, arc:()=>{}, fill:()=>{},
            translate:()=>{}, rotate:()=>{}, fillText:()=>{}, measureText:()=>({width:10}),
            stroke:()=>{}, moveTo:()=>{}, lineTo:()=>{}, createRadialGradient:()=>({addColorStop:()=>{}})
        })
    }),
    createElement: () => ({ classList: { add:()=>{}, remove:()=>{} }, style: {} }),
    querySelector: () => ({ textContent: '', style: {} }),
    body: { addEventListener: ()=>{} }
};
global.Audio = class { play() { return Promise.resolve(); } };

try {
    // 1. LOAD SCRIPTS
    eval(fs.readFileSync('static/data.js', 'utf8'));
    eval(fs.readFileSync('static/quest.js', 'utf8'));
    eval(fs.readFileSync('static/app.js', 'utf8'));
    
    console.log("=== STARTING QA SIMULATION ===");
    
    // 2. INIT ENGINE
    window.QuestEngine.init();
    console.log("1. INIT: state =", JSON.stringify(window.QuestEngine.state));
    
    // 3. SIMULATE DISCOVERY & QUEST (Q1 - H2)
    window.QuestEngine.checkDiscovery("H2 (Gas Hidrogen)");
    
    console.log("2. AFTER Q1: state =", JSON.stringify(window.QuestEngine.state));
    
    // 4. VERIFY COLLECTION
    if (window.QuestEngine.state.discoveredMolecules.includes("H2 (Gas Hidrogen)")) {
        console.log("3. COLLECTION: H2 successfully added.");
    } else {
        console.error("3. COLLECTION: FAILED to add H2.");
    }
    
    // 5. VERIFY SAVE/LOAD
    let savedData = JSON.parse(mockLocalStorage['chemQuestProgress']);
    if (savedData && savedData.completedQuests.includes("Q1")) {
        console.log("4. SAVE: state saved correctly to localStorage.");
    } else {
        console.error("4. SAVE: FAILED to save state.");
    }
    
    // SIMULATE RELOAD
    window.QuestEngine.state = {
        unlockedAtoms: ['H', 'Cl'], 
        discoveredMolecules: [], 
        completedQuests: [], 
        unlockedAchievements: []
    };
    window.QuestEngine.loadProgress();
    if (window.QuestEngine.state.completedQuests.includes("Q1")) {
        console.log("5. LOAD: state loaded correctly from localStorage.");
    } else {
        console.error("5. LOAD: FAILED to load state.");
    }
    
    // 6. CHECK ALL REACTIONS FOR ERRORS
    let reactionErrors = 0;
    window.DB.reactions.forEach((r, idx) => {
        if (!r.reactants || !r.products) {
            console.error(`Reaction [${idx}] is malformed.`);
            reactionErrors++;
        }
    });
    console.log(`6. REACTIONS: Checked ${window.DB.reactions.length} reactions. Errors: ${reactionErrors}`);
    
    // 7. CHECK ALL MOLECULES FOR MISSING DATA
    let molErrors = 0;
    window.DB.molecules.forEach((m) => {
        if (!m.label || !m.atoms_csv) {
            console.error(`Molecule ${m.label || 'Unknown'} is malformed.`);
            molErrors++;
        }
    });
    console.log(`7. MOLECULES: Checked ${window.DB.molecules.length} molecules. Errors: ${molErrors}`);
    
    console.log("=== QA SIMULATION COMPLETED ===");

} catch(e) {
    console.error("SIMULATION ERROR:", e);
}
