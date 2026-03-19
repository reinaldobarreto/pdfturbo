import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { PDFDocument } from 'pdf-lib';

async function test() {
  try {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    page.drawText('Hello World');
    const bytes = await doc.save();
    
    const data = await pdfParse(Buffer.from(bytes));
    console.log("Success:", data.text);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
