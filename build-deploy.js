import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Building QR Studio Pro for direct GitHub Pages & local execution...');

// 1. Run Vite build
execSync('npx vite build', { stdio: 'inherit' });

const distDir = path.join(__dirname, 'dist');
const docsDir = path.join(__dirname, 'docs');
const assetsDir = path.join(__dirname, 'assets');

// 2. Locate generated html in dist
let builtHtmlPath = path.join(distDir, 'index.source.html');
if (!fs.existsSync(builtHtmlPath)) {
  builtHtmlPath = path.join(distDir, 'index.html');
}

const htmlContent = fs.readFileSync(builtHtmlPath, 'utf-8');

// 3. Write compiled HTML to root index.html
fs.writeFileSync(path.join(__dirname, 'index.html'), htmlContent, 'utf-8');
console.log('✅ Updated root index.html with compiled production bundle');

// 4. Copy dist/assets to root assets/
if (fs.existsSync(assetsDir)) {
  fs.rmSync(assetsDir, { recursive: true, force: true });
}
fs.cpSync(path.join(distDir, 'assets'), assetsDir, { recursive: true });
console.log('✅ Updated root assets/ directory');

// 5. Update docs/ directory
if (fs.existsSync(docsDir)) {
  fs.rmSync(docsDir, { recursive: true, force: true });
}
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, 'index.html'), htmlContent, 'utf-8');
fs.cpSync(path.join(distDir, 'assets'), path.join(docsDir, 'assets'), { recursive: true });

// Copy public assets if any
if (fs.existsSync(path.join(distDir, 'favicon.svg'))) {
  fs.copyFileSync(path.join(distDir, 'favicon.svg'), path.join(docsDir, 'favicon.svg'));
}
if (fs.existsSync(path.join(distDir, 'icons.svg'))) {
  fs.copyFileSync(path.join(distDir, 'icons.svg'), path.join(docsDir, 'icons.svg'));
}

console.log('✅ Updated docs/ directory for GitHub Pages /docs mode');
console.log('🎉 Production build complete! Ready for direct deployment on root OR /docs.');
