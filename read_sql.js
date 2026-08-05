import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'fix_crm_tasks.sql');

try {
  const content = fs.readFileSync(filePath, 'utf16le');
  console.log('UTF-16LE Content:');
  console.log(content);
} catch (e) {
  try {
    const contentUtf8 = fs.readFileSync(filePath, 'utf8');
    console.log('UTF-8 Content:');
    console.log(contentUtf8);
  } catch (err) {
    console.error('Failed to read file:', err);
  }
}
