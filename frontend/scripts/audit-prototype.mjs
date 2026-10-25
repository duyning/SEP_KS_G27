import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { screens } from '../src/routing/screens.js';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(frontend, '../../..');
const matches = (text, expression, group = 1) => [...text.matchAll(expression)].map(match => match[group]);
const unique = values => [...new Set(values)];
const plain = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const inventory = { sourceRoot: 'Code', html: [], css: [], js: [], brokenLocalReferences: [] };
for (const type of ['html', 'css', 'js']) {
  for (const name of fs.readdirSync(path.join(source, type)).sort()) {
    const file = path.join(source, type, name);
    if (!fs.statSync(file).isFile()) continue;
    const buffer = fs.readFileSync(file);
    const content = buffer.toString('utf8');
    const item = { file: `${type}/${name}`, bytes: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') };
    if (type === 'html') {
      Object.assign(item, {
        target: screens.find(screen => screen.source === name)?.path,
        status: ['login.html', 'register.html'].includes(name) ? 'MIGRATED_VISUAL_PARITY_PENDING' : ['home.html', 'host-room-availability.html'].includes(name) ? 'MERGED' : 'BLOCKED_FULL_INTEGRATION',
        title: plain(matches(content, /<title[^>]*>([\s\S]*?)<\/title>/gi)[0] || ''),
        headings: matches(content, /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi).map(plain),
        stylesheets: unique(matches(content, /<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi).filter(value => /css|fonts/.test(value))),
        scripts: unique(matches(content, /<script\b[^>]*src=["']([^"']+)["']/gi)),
        navigation: unique(matches(content, /href=["']([^"']+)["']/gi)),
        assets: unique([...matches(content, /(?:src|poster)=["']([^"']+)["']/gi), ...matches(content, /url\(["']?([^)'"\s]+)["']?\)/gi)]),
        fields: matches(content, /<(?:input|select|textarea)\b([^>]+)>/gi).map(value => value.trim()),
        tableHeaders: matches(content, /<th\b[^>]*>([\s\S]*?)<\/th>/gi).map(plain),
        inlineStyles: matches(content, /<style\b[^>]*>([\s\S]*?)<\/style>/gi).length,
        inlineScripts: matches(content, /<script\s*>([\s\S]*?)<\/script>/gi).length,
        modalReferences: unique(matches(content, /(?:id|class)=["']([^"']*(?:modal|toast|sidebar|topbar)[^"']*)["']/gi)),
      });
    } else if (type === 'js') {
      Object.assign(item, {
        disposition: name === 'leaflet.js' ? 'REUSE_WHEN_MAP_API_EXISTS' : /room-availability/.test(name) ? 'OBSOLETE_MERGED_INTO_ROOMS' : 'REFACTOR_NOT_EXECUTED',
        storage: unique(matches(content, /((?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\([^\n;]+)/g)),
        functions: unique([...matches(content, /function\s+([A-Za-z_$][\w$]*)\s*\(/g), ...matches(content, /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\([^;{}\n]*\)\s*\{/gm).filter(name => !['if', 'for', 'while', 'catch', 'switch', 'function'].includes(name))]),
        networkReferences: unique(matches(content, /(?:fetch|axios\.[a-z]+)\(\s*(["'`][^\n]+)/g)),
        assets: unique(matches(content, /["'`](https?:\/\/[^"'`\s]+)["'`]/g)),
        target: /app\.js|register/.test(name) ? ['src/pages/AuthPage.jsx', 'src/services/auth.js'] : ['src/pages/PortalScreens.jsx', 'src/pages/ProfilePage.jsx'],
      });
    } else {
      Object.assign(item, {
        disposition: name === 'host-room-availability.css' ? 'OBSOLETE_MERGED_INTO_ROOMS' : 'REUSE_DESIGN_REVIEW_PENDING',
        assets: unique(matches(content, /url\(["']?([^)'"\s]+)["']?\)/gi)),
        tokens: unique(matches(content, /(--[\w-]+)\s*:/g)),
        target: name === 'styles.css' ? ['src/styles/auth.css', 'src/styles/portal.css'] : ['src/styles/portal.css'],
      });
    }
    inventory[type].push(item);
    const references = type === 'html' ? [...item.scripts, ...item.stylesheets, ...item.assets] : item.assets || [];
    for (const reference of unique(references)) {
      if (/^(?:https?:|data:|#|\/\/)/.test(reference)) continue;
      const resolved = path.resolve(path.dirname(file), reference.split(/[?#]/)[0]);
      if (!fs.existsSync(resolved)) inventory.brokenLocalReferences.push({ file: item.file, reference });
    }
  }
}
fs.mkdirSync(path.join(frontend, 'migration'), { recursive: true });
fs.writeFileSync(path.join(frontend, 'migration/inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Audited ${inventory.html.length} HTML, ${inventory.css.length} CSS, ${inventory.js.length} JS files. No prototype files modified.`);
