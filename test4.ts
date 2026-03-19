import { PDFParse } from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';

async function test() {
  try {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    page.drawText('Hello World');
    const bytes = await doc.save();
    
    const parser = new PDFParse({ data: Buffer.from(bytes) });
    const text = await parser.getText();
    console.log('Success:', text.text);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();