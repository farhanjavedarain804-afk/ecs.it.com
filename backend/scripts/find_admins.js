const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function findAdmins() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
        console.error('Auth Error:', authErr.message);
        return;
    }

    console.log('--- FETCHING ROLES ---');
    const { data: roles, error: rolesErr } = await supabase.from('user_roles').select('*');
    if (rolesErr) {
        console.error('Roles Error:', rolesErr.message);
        return;
    }

    console.log('--- FETCHING PROFILES ---');
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
    if (profErr) {
        console.error('Profiles Error:', profErr.message);
        return;
    }

    const adminRoles = ['super_admin', 'branch_admin', 'accountant', 'manager'];
    const filteredRoles = roles.filter(r => adminRoles.includes(r.role));

    console.log('\n--- ADMIN ACCOUNTS IN SUPABASE ---');
    filteredRoles.forEach(r => {
        const p = profiles.find(prof => prof.user_id === r.user_id);
        if (p) {
            console.log(`Email: ${p.email}, Name: ${p.full_name}, Role: ${r.role}, UserID: ${r.user_id}`);
        } else {
            console.log(`UserID: ${r.user_id}, Role: ${r.role} (Profile missing!)`);
        }
    });
}

findAdmins();
