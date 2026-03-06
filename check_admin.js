const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
    try {
        const envContent = fs.readFileSync('.env.local', 'utf-8');
        const urlMatch = envContent.match(/PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
        const keyMatch = envContent.match(/PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)/);
        if (!urlMatch || !keyMatch) return;
        
        const sb = createClient(urlMatch[1].trim(), keyMatch[1].trim());
        const { data, error } = await sb.from('residents').select('id, user_id, name, is_admin');
        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.log("Error", e.message);
    }
}
check();
