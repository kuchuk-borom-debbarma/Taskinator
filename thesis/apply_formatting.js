const fs = require('fs');

let code = fs.readFileSync('create_thesis.js', 'utf-8');

// 1. Change left margin to 1.5 inches (2160 DXA)
code = code.replace(/margin:\s*\{\s*top:\s*1440,\s*right:\s*1440,\s*bottom:\s*1440,\s*left:\s*1440\s*\}/g, 'margin: { top: 1440, right: 1440, bottom: 1440, left: 2160 }');

// 2. Change all text size 22 to 24 (12pt font)
code = code.replace(/size:\s*22/g, 'size: 24');

// 3. Change all text size 20 to 22 (11pt font for captions)
code = code.replace(/size:\s*20/g, 'size: 22');

// 4. Change all text size 24 to 28 for headings that were previously 24
code = code.replace(/size:\s*24,\s*font:\s*"Times New Roman"\s*\}\)\]/g, 'size: 28, font: "Times New Roman" })]');

// 5. Add 1.5 line spacing (line: 360) to paragraph spacings
// Match spacing: { ... } and inject line: 360 if it doesn't have it
code = code.replace(/spacing:\s*\{([^}]*)\}/g, (match, p1) => {
    if (p1.includes('line:')) return match;
    return `spacing: {${p1}, line: 360 }`;
});

fs.writeFileSync('create_thesis.js', code);
console.log("Formatting applied to create_thesis.js");
