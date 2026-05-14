const fs = require('fs');
const content = fs.readFileSync('C:\dev\rs-plugkit\src\main.rs', 'utf8');
const lines = content.split('\n');
const mainLine = lines.findIndex(l => l.includes('fn main')) + 1;
console.log(mainLine);
