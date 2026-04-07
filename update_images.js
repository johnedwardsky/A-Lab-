const SUPABASE_URL = 'https://lvyfuljsvzczuwccktln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eWZ1bGpzdnpjenV3Y2NrdGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTAwMzEsImV4cCI6MjA4NjU2NjAzMX0.juafzih9bbcIsntrAvku2O_77yz7mnIkOqbY8xencIo';

async function updateUrls() {
  // Fetch all projects
  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id,image_url`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const projects = await getRes.json();
  
  for (let p of projects) {
    if (p.image_url && p.image_url.includes('supabase.co')) {
      const filename = p.image_url.split('/').pop();
      const newUrl = `assets/img/${filename}`;
      
      await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${p.id}`, {
        method: 'PATCH',
        headers: { 
            'apikey': SUPABASE_ANON_KEY, 
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image_url: newUrl })
      });
      console.log(`Updated project ${p.id} to ${newUrl}`);
    }
  }
}
updateUrls();
