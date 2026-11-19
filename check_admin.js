async function checkAdmin() {
  const url = "https://uswknwkxdzkrkaimwqvf.supabase.co/rest/v1/users?role=eq.admin&select=full_name,email";
  const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzd2tud2t4ZHprcmthaW13cXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjcyMTUsImV4cCI6MjA4ODY0MzIxNX0.4wj3FC4lgQ_0er8z8xSsIuVXO9VPoexyFQoCSYl67dE";
  
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': apikey,
        'Authorization': `Bearer ${apikey}`
      }
    });
    
    if (!res.ok) {
      console.log(`Failed to fetch: ${res.status} ${res.statusText}`);
      return;
    }
    
    const data = await res.json();
    console.log("Admin Users:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkAdmin();
