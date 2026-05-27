const fs = require('fs');
const path = require('path');

const replacements = {
  '--color-bg-canvas': '--color-paper',
  '--color-bg-subtle': '--color-paper-2',
  '--color-surface-elevated': '--color-paper',
  '--color-surface-muted': '--color-paper-2',
  '--color-surface': '--color-paper', // do this after elevated/muted to avoid partial matches
  '--color-border-soft': '--color-soft',
  '--color-border-default': '--color-ink',
  '--color-border-strong': '--color-ink',
  '--color-text-strong': '--color-ink',
  '--color-text-default': '--color-ink',
  '--color-text-muted': '--color-ink-2',
  '--color-text-soft': '--color-ink-3',

  // Aliases
  '--app-color-surface-elevated': '--color-paper',
  '--app-color-surface-muted': '--color-paper-2',
  '--app-color-surface': '--color-paper',
  '--app-color-bg': '--color-paper',
  '--app-color-border-strong': '--color-ink',
  '--app-color-border': '--color-ink',
  '--app-color-text-primary': '--color-ink',
  '--app-color-text-secondary': '--color-ink',
  '--app-color-text-muted': '--color-ink-2',

  '--bg-app': '--color-paper',
  '--bg-canvas': '--color-paper',
  '--bg-surface-muted': '--color-paper-2',
  '--bg-surface-soft': '--color-paper',
  '--bg-surface': '--color-paper',
  
  '--border-subtle': '--color-soft',
  '--border-default': '--color-ink',
  '--border-strong': '--color-ink',
  
  '--text-primary': '--color-ink',
  '--text-secondary': '--color-ink',
  '--text-muted': '--color-ink-2',
  '--text-soft': '--color-ink-3',
  '--foreground': '--color-ink',
};

// Ensure order based on length descending to avoid partial matches
const keys = Object.keys(replacements).sort((a, b) => b.length - a.length);

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = [...walk('./app'), ...walk('./components'), ...walk('./lib')];
let filesTouched = 0;

files.forEach(file => {
  const originalContent = fs.readFileSync(file, 'utf8');
  let newContent = originalContent;
  
  keys.forEach(k => {
    // Regex to match exact token (avoiding replacing something like --text-primary-hover if it exists)
    const regex = new RegExp(k + '(?![a-zA-Z0-9_-])', 'g');
    newContent = newContent.replace(regex, replacements[k]);
  });
  
  if (originalContent !== newContent) {
    fs.writeFileSync(file, newContent);
    filesTouched++;
  }
});

console.log(`Touched ${filesTouched} files.`);
