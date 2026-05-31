import fs from 'node:fs';
import path from 'node:path';

const dir = 'sql/patches';
const files = fs.readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();

console.log('Run these SQL patches in Supabase SQL Editor, in order:\n');
for (const file of files) {
  console.log(`- ${path.join(dir, file)}`);
}

console.log('\nFor Supabase CLI:');
console.log('  npx supabase login');
console.log('  npx supabase link --project-ref qmwajaneoohlvyacwerf');
console.log('  npx supabase db push');
