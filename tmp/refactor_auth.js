const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file.includes('node_modules')) return;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walk(srcDir);
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Replace import
    if (content.includes("import { supabase } from") || content.includes("import { supabase } from")) {
        content = content.replace(/import\s+\{\s*supabase\s*\}\s+from\s+['"]([^'"]+)['"]/g, "import { authApi, apiFetch } from '$1'");
        changed = true;
    }

    // Replace window.supabase.auth
    if (content.includes("window as any).supabase.auth")) {
        content = content.replace(/\(window as any\)\.supabase\.auth/g, "authApi");
        changed = true;
    }

    // Replace exact occurrences
    if (content.includes("supabase.auth")) {
        content = content.replace(/supabase\.auth/g, "authApi");
        changed = true;
    }

    if (changed) {
        // 'auth.ts' doesn't use the same path if the old was lib/supabase. We just mapped '$1', which was like '../../lib/supabase'.
        // We need to change 'supabase' to 'auth' in the path.
        content = content.replace(/from\s+['"](.*)lib\/supabase['"]/g, "from '$1lib/auth'");

        fs.writeFileSync(file, content, 'utf8');
        console.log("Updated", file);
        changedCount++;
    }
});

console.log("Total files updated:", changedCount);
