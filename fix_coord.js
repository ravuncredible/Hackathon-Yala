import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf-8');
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!url || !key) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function updateDb() {
  const { data, error } = await supabase
    .from('hospitals')
    .update({ lat: 6.5481, lng: 101.2768 })
    .eq('hospital_name', 'โรงพยาบาลยะลา');
  
  if (error) console.error("Error updating hospitals:", error);
  else console.log("Hospitals updated successfully");
}

updateDb();
