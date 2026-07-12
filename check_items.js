import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('order_items').select('*').limit(5);
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));

  const { data: oData, error: oError } = await supabase.from('orders').select('id, items:order_items(*)').limit(1);
  console.log("Join Data:", JSON.stringify(oData, null, 2));
}

check();
