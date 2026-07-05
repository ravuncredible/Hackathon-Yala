import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file manually
const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Updating Yala Hospital coordinates...');
  const { error: err1 } = await supabase
    .from('hospitals')
    .update({ lat: 6.5442, lng: 101.2725 })
    .eq('hospital_name', 'โรงพยาบาลยะลา');
  
  if (err1) console.error('Error updating hospital:', err1);
  else console.log('Hospital updated successfully.');

  console.log('Updating EMS-1 coordinates...');
  const { error: err2 } = await supabase
    .from('rescue_units')
    .update({ lat: 6.5442, lng: 101.2725 })
    .eq('name', 'รถพยาบาลยะลา EMS-1');

  if (err2) console.error('Error updating rescue unit:', err2);
  else console.log('Rescue unit updated successfully.');
}

main();
