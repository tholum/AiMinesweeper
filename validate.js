const fs = require('fs');
const path = require('path');

function validateJavaScript(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        new Function(content); // This will throw if there's a syntax error
        console.log(`✓ ${path.basename(filePath)} - Syntax is valid`);
        return true;
    } catch (error) {
        console.error(`✗ ${path.basename(filePath)} - Syntax error:`);
        console.error(`  Line ${error.lineNumber}: ${error.message}`);
        return false;
    }
}

// Validate script.js
const scriptPath = path.join(__dirname, 'script.js');
if (!validateJavaScript(scriptPath)) {
    process.exit(1);
}