const fs = require('fs');

global.window = {};
global.document = {
    getElementById: () => ({ classList: { add:()=>{}, remove:()=>{} }, appendChild: ()=>{}, addEventListener: ()=>{} }),
    createElement: () => ({ classList: { add:()=>{}, remove:()=>{} }, style: {} }),
    querySelector: () => ({ textContent: '' }),
    body: { addEventListener: ()=>{} }
};
global.Audio = class { play() { return Promise.resolve(); } };

try {
    const dataJs = fs.readFileSync('static/data.js', 'utf8');
    eval(dataJs);
    console.log("data.js OK");
    
    const questJs = fs.readFileSync('static/quest.js', 'utf8');
    eval(questJs);
    console.log("quest.js OK");
    
    const appJs = fs.readFileSync('static/app.js', 'utf8');
    eval(appJs);
    console.log("app.js OK");
} catch(e) {
    console.error("ERROR:", e);
}
