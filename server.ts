import express from "express";
import path from "path";
import multer from "multer";
import { PDFDocument, degrees, PDFRawStream, PDFName, PDFDict, PDFArray, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import JSZip from "jszip";

import zlib from "zlib";
import * as pdf from 'pdf-parse';
import { Document, Packer, Paragraph, TextRun } from "docx";
import ExcelJS from "exceljs";
import { Builder } from "xml2js";
import mammoth from "mammoth";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Aceita arquivos de até 100MB
});

// --- Endpoints ---

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "PDFTurbo API is running",
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      PORT: process.env.PORT
    }
  });
});

// Otimização (Compressão) - MODO HACKER V10.0 (ULTRA FIDELITY + SMART COMPRESSION)
app.post("/api/optimize", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
      
      console.log(`[V10.0] Iniciando compressão inteligente: ${req.file.originalname} (${req.file.size} bytes)`);
      
      // Carregar o PDF original (vamos modificar este objeto diretamente para garantir ordem e alinhamento)
      const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });

      // V10.0: Limpeza de Metadados Básicos (sem remover XMP para evitar quebra de estrutura)
      pdfDoc.setProducer('PDFTURBO V10.0');
      pdfDoc.setCreator('PDFTURBO V10.0');

      const context = pdfDoc.context;
      const indirectObjects = context.enumerateIndirectObjects();
      let imageCount = 0;
      let optimizedCount = 0;
      
      for (const [ref, obj] of indirectObjects) {
        if (obj instanceof PDFRawStream) {
          const dict = obj.dict;
          const subtype = dict.get(PDFName.of('Subtype'));
          
          if (subtype === PDFName.of('Image')) {
            imageCount++;
            try {
              const filter = dict.get(PDFName.of('Filter'));
              const width = dict.get(PDFName.of('Width'));
              const height = dict.get(PDFName.of('Height'));
              
              const w = typeof width === 'object' && 'value' in width ? (width as any).value : Number(width);
              const h = typeof height === 'object' && 'value' in height ? (height as any).value : Number(height);

              let imageBuffer = obj.contents;

              // PROTEÇÃO ABSOLUTA: Logos, QR Codes e Códigos de Barras
              // Se a imagem for pequena ou tiver proporções típicas de códigos, não tocamos nela.
              if (w < 500 && h < 500) {
                continue; 
              }

              let processedBuffer = imageBuffer;
              const isFlate = filter === PDFName.of('FlateDecode') || 
                             (filter instanceof PDFArray && filter.asArray().some(f => f === PDFName.of('FlateDecode')));

              if (isFlate) {
                try {
                  processedBuffer = zlib.inflateSync(imageBuffer);
                } catch (e) { 
                  processedBuffer = imageBuffer;
                }
              }

              try {
                const sharpInstance = sharp(processedBuffer);
                
                // Otimização de Alta Fidelidade: Mantém cores, alinhamento e nitidez
                const optimized = await sharpInstance
                  .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                  .jpeg({ 
                    quality: 60, // Qualidade aumentada para garantir fidelidade absoluta
                    progressive: true,
                    optimizeScans: true,
                    mozjpeg: true
                  })
                  .toBuffer();

                // Só aplicamos se a redução for realmente vantajosa (> 10%)
                if (optimized.length < imageBuffer.length * 0.9) {
                  const newDict = dict.clone();
                  newDict.set(PDFName.of('Length'), context.obj(optimized.length));
                  newDict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
                  newDict.delete(PDFName.of('DecodeParms'));
                  
                  context.assign(ref, PDFRawStream.of(newDict, optimized));
                  optimizedCount++;
                }
              } catch (sharpError) {}
            } catch (e) {}
          } else {
            // Compressão de streams de conteúdo (texto/vetores) - SEMPRE LOSSLESS
            try {
              const contents = obj.contents;
              const filter = dict.get(PDFName.of('Filter'));
              
              // Se já estiver comprimido com Flate, não re-comprimimos para evitar overhead
              if (filter === PDFName.of('FlateDecode')) continue;

              if (contents.length > 100) { 
                const compressed = zlib.deflateSync(contents, { level: 9 });
                if (compressed.length < contents.length) {
                  const newDict = dict.clone();
                  newDict.set(PDFName.of('Length'), context.obj(compressed.length));
                  newDict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
                  context.assign(ref, PDFRawStream.of(newDict, compressed));
                }
              }
            } catch (e) {}
          }
        }
      }

      console.log(`[V10.0] Imagens: ${imageCount}, Otimizadas: ${optimizedCount}`);

      // Salvar o documento ORIGINAL modificado
      const compressedPdfBytes = await pdfDoc.save({ 
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false
      });

      console.log(`[V10.0] Finalizado: ${compressedPdfBytes.length} bytes (Redução: ${Math.round((1 - compressedPdfBytes.length / req.file.size) * 100)}%)`);

      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Access-Control-Expose-Headers", "X-Original-Size, X-Compressed-Size");
      res.setHeader("X-Original-Size", req.file.size.toString());
      res.setHeader("X-Compressed-Size", compressedPdfBytes.length.toString());
      res.send(Buffer.from(compressedPdfBytes));
    } catch (error: any) {
      console.error("[V10.0] Erro crítico na rota optimize:", error);
      res.status(500).json({ error: "Falha no motor V10.0: " + error.message });
    }
  });

  // Merge (Unir) - MODO HACKER V10.0 (SMART SCALING + FIDELITY)
  app.post("/api/merge", upload.array("files"), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const pageSelectionRaw = req.body.pageSelection;
      const pageSelection = pageSelectionRaw ? JSON.parse(pageSelectionRaw) : null;

      if (!files || files.length < 2) {
        return res.status(400).json({ error: "Envie pelo menos dois arquivos para unir" });
      }

      const mergedPdf = await PDFDocument.create();
      
      // V10.0: Metadados globais limpos
      mergedPdf.setProducer('PDFTURBO V10.0');
      mergedPdf.setCreator('PDFTURBO V10.0');

      let totalOriginalSize = 0;
      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const selectedPages = pageSelection ? pageSelection[i] : null;
        totalOriginalSize += file.size;
        const mimeType = file.mimetype;
        
        try {
          if (mimeType === "application/pdf") {
            const pdf = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
            const indices = selectedPages || pdf.getPageIndices();
            const copiedPages = await mergedPdf.copyPages(pdf, indices);
            
            for (const page of copiedPages) {
              try {
                // Limpeza leve de metadados de página para reduzir tamanho sem tocar em imagens
                page.node.delete(PDFName.of('Thumb'));
                page.node.delete(PDFName.of('PieceInfo'));
              } catch (e) {}

              // SMART SCALING: Garantir que todas as páginas sejam A4
              const { width, height } = page.getSize();
              
              if (Math.abs(width - A4_WIDTH) < 10 && Math.abs(height - A4_HEIGHT) < 10) {
                mergedPdf.addPage(page);
              } else {
                const newPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
                const embeddedPage = await mergedPdf.embedPage(page);
                
                const scale = Math.min(
                  (A4_WIDTH - 40) / width,
                  (A4_HEIGHT - 40) / height,
                  1
                );
                
                const drawWidth = width * scale;
                const drawHeight = height * scale;
                
                newPage.drawPage(embeddedPage, {
                  x: (A4_WIDTH - drawWidth) / 2,
                  y: (A4_HEIGHT - drawHeight) / 2,
                  width: drawWidth,
                  height: drawHeight,
                });
              }
            }
          } else if (mimeType.startsWith("image/")) {
            if (selectedPages && selectedPages.length === 0) continue;

            const optimizedImageBuffer = await sharp(file.buffer)
              .rotate() // Auto-orientar imagem baseada no EXIF
              .flatten({ background: { r: 255, g: 255, b: 255 } }) // Fundo branco para transparência em PNG
              .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 85, progressive: true, mozjpeg: true }) // Qualidade aumentada para 85
              .toBuffer();

            const image = await mergedPdf.embedJpg(optimizedImageBuffer);
            const page = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
            
            // Cálculo de escala para imagens (RG/CPF/Carteiras)
            const scale = Math.min(
              (A4_WIDTH - 60) / image.width, 
              (A4_HEIGHT - 60) / image.height,
              1 // PROTEÇÃO: Não esticar imagens pequenas (RG/CPF) para ocupar a página toda
            );
            
            const imgWidth = image.width * scale;
            const imgHeight = image.height * scale;
            
            page.drawImage(image, {
              x: (A4_WIDTH - imgWidth) / 2,
              y: (A4_HEIGHT - imgHeight) / 2,
              width: imgWidth,
              height: imgHeight,
            });
          }
      } catch (error: any) {
        console.error("[V10.0] Erro ao processar arquivo individual no merge:", error);
      }
    }

      if (mergedPdf.getPageCount() === 0) {
        throw new Error("Nenhuma página válida foi processada dos arquivos enviados.");
      }

      const pdfBytes = await mergedPdf.save({ 
        useObjectStreams: true,
        addDefaultPage: false
      });
      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Access-Control-Expose-Headers", "X-Original-Size, X-Compressed-Size");
      res.setHeader("X-Original-Size", totalOriginalSize.toString());
      res.setHeader("X-Compressed-Size", pdfBytes.length.toString());
      res.send(Buffer.from(pdfBytes));
    } catch (error: any) {
      res.status(500).json({ error: "Erro na união V10.0: " + error.message });
    }
  });

  // Split (Dividir) - Retorna um ZIP com todas as páginas
  app.post("/api/split", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

      console.log(`[V10.0] Iniciando separação: ${req.file.originalname}`);
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });
      } catch (err: any) {
        console.error("[V10.0] Erro ao carregar PDF para separação:", err);
        throw new Error("Não foi possível ler o PDF. O arquivo pode estar corrompido ou protegido por senha.");
      }

      const pageCount = pdfDoc.getPageCount();
      if (pageCount === 0) {
        throw new Error("O PDF não contém nenhuma página.");
      }

      const zip = new JSZip();

      for (let i = 0; i < pageCount; i++) {
        try {
          const newPdf = await PDFDocument.create();
          const [page] = await newPdf.copyPages(pdfDoc, [i]);
          newPdf.addPage(page);
          const pdfBytes = await newPdf.save();
          zip.file(`pagina_${i + 1}.pdf`, pdfBytes);
        } catch (err: any) {
          console.error(`[V10.0] Erro ao separar página ${i + 1}:`, err);
          throw new Error(`Falha ao processar a página ${i + 1} do PDF.`);
        }
      }

      const zipBytes = await zip.generateAsync({ type: "nodebuffer" });
      res.status(200);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="split_pdf.zip"`);
      res.send(zipBytes);
    } catch (error: any) {
      console.error("[V10.0] Erro crítico na rota split:", error);
      res.status(500).json({ error: "Falha na separação: " + error.message });
    }
  });

  // Converter - MODO HACKER V10.0 (PDF <-> DOCX/XLSX/CSV/XML)
  app.post("/api/convert", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        console.error("[V10.0] Erro: Nenhum arquivo recebido na rota convert");
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      
      const targetFormat = req.body.targetFormat || 'docx';
      const originalName = req.file.originalname;
      const extension = originalName.split('.').pop()?.toLowerCase();
      
      if (targetFormat === extension) {
        return res.status(400).json({ error: `O arquivo já está no formato ${targetFormat.toUpperCase()}` });
      }
      
      console.log(`[V10.0] Iniciando conversão: ${originalName} (Ext: ${extension}) -> Alvo: ${targetFormat}`);

      let resultBuffer: Buffer;
      let contentType: string;
      let outputName: string = originalName.replace(/\.[^/.]+$/, "") + "." + targetFormat;

      if (extension === 'pdf') {
        console.log("[V10.0] Extraindo texto de PDF...");
        let text = "";
        try {
          const pdfParser = (pdf as any).default || (pdf as any);
          const data = await pdfParser(req.file.buffer);
          text = data.text || "";
          console.log(`[V10.0] Texto extraído (pdf-parse): ${text.length} caracteres`);
        } catch (pdfErr: any) {
          console.error("[V10.0] Erro no pdf-parse:", pdfErr);
          throw new Error("Falha ao ler o PDF. O arquivo pode estar corrompido ou protegido com senha.");
        }

        if (!text.trim()) {
           throw new Error("Nenhum texto encontrado no PDF. O arquivo parece ser uma imagem ou documento escaneado (requer OCR).");
        }

        if (targetFormat === 'docx') {
          const sanitizedText = text.replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u10000-\u10FFFF]/g, '');
          const doc = new Document({
            sections: [{
              properties: {},
              children: sanitizedText.split('\n').map(line => new Paragraph({
                children: [new TextRun(line.trim() || " ")],
              })),
            }],
          });
          resultBuffer = await Packer.toBuffer(doc);
          contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else if (targetFormat === 'xlsx' || targetFormat === 'csv') {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Sheet 1');
          
          text.split('\n').forEach((line) => {
            const row = line.trim().split(/\t| {2,}/);
            if (row.length > 0 && row[0] !== "") {
              worksheet.addRow(row);
            }
          });

          if (targetFormat === 'xlsx') {
            resultBuffer = await workbook.xlsx.writeBuffer() as Buffer;
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          } else {
            resultBuffer = await workbook.csv.writeBuffer() as Buffer;
            contentType = "text/csv";
          }
        } else if (targetFormat === 'xml') {
          const builder = new Builder();
          const xmlObj = {
            document: {
              content: text,
              timestamp: new Date().toISOString()
            }
          };
          resultBuffer = Buffer.from(builder.buildObject(xmlObj));
          contentType = "application/xml";
        } else {
          throw new Error(`Formato de destino '${targetFormat}' não suportado para PDF`);
        }
      } else if (targetFormat === 'pdf') {
        console.log(`[V10.0] Convertendo ${extension} para PDF...`);
        let text = '';
        if (extension === 'docx') {
          const result = await mammoth.extractRawText({ buffer: req.file.buffer });
          text = result.value;
        } else if (extension === 'xlsx') {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(req.file.buffer);
          const worksheet = workbook.getWorksheet(1);
          worksheet?.eachRow((row) => {
            const rowValues = Array.isArray(row.values) ? row.values.filter(v => v !== null && v !== undefined).join(' ') : '';
            if (rowValues) text += rowValues + '\n';
          });
        } else {
          text = req.file.buffer.toString('utf-8');
        }
        
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        let page = pdfDoc.addPage();
        const { height } = page.getSize();
        
        const lines = text.split('\n');
        let y = height - 50;
        for (const line of lines) {
          if (y < 50) {
            page = pdfDoc.addPage();
            y = height - 50;
          }
          if (line.trim()) {
            // Sanitize for WinAnsi (Standard Fonts in pdf-lib)
            const sanitizedLine = line.substring(0, 100).trim().replace(/[^\x00-\x7F\xA0-\xFF]/g, '?');
            page.drawText(sanitizedLine, { x: 50, y, size: 9, font });
            y -= 12;
          }
        }
        
        resultBuffer = Buffer.from(await pdfDoc.save());
        contentType = "application/pdf";
      } else {
        // Cross-conversion (e.g. DOCX to XLSX) via text extraction
        console.log(`[V10.0] Cross-conversion: ${extension} para ${targetFormat}`);
        let text = '';
        if (extension === 'docx') {
          const result = await mammoth.extractRawText({ buffer: req.file.buffer });
          text = result.value;
        } else if (extension === 'xlsx') {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(req.file.buffer);
          const worksheet = workbook.getWorksheet(1);
          worksheet?.eachRow((row) => {
            const rowValues = Array.isArray(row.values) ? row.values.filter(v => v !== null && v !== undefined).join(' ') : '';
            if (rowValues) text += rowValues + '\n';
          });
        } else {
          text = req.file.buffer.toString('utf-8');
        }

        if (targetFormat === 'docx') {
          const sanitizedText = text.replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u10000-\u10FFFF]/g, '');
          const doc = new Document({
            sections: [{
              properties: {},
              children: sanitizedText.split('\n').map(line => new Paragraph({
                children: [new TextRun(line.trim() || " ")],
              })),
            }],
          });
          resultBuffer = await Packer.toBuffer(doc);
          contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else if (targetFormat === 'xlsx' || targetFormat === 'csv') {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Sheet 1');
          text.split('\n').forEach(line => {
            if (line.trim()) worksheet.addRow(line.trim().split(/\t| {2,}/));
          });
          if (targetFormat === 'xlsx') {
            resultBuffer = await workbook.xlsx.writeBuffer() as Buffer;
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          } else {
            resultBuffer = await workbook.csv.writeBuffer() as Buffer;
            contentType = "text/csv";
          }
        } else if (targetFormat === 'xml') {
          const builder = new Builder();
          resultBuffer = Buffer.from(builder.buildObject({ document: { content: text } }));
          contentType = "application/xml";
        } else {
          throw new Error(`Conversão de ${extension} para ${targetFormat} não suportada.`);
        }
      }

      console.log(`[V10.0] Conversão concluída: ${resultBuffer.length} bytes`);
      res.status(200);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${outputName}"`);
      res.setHeader("Access-Control-Expose-Headers", "X-Original-Size, X-Compressed-Size");
      res.setHeader("X-Original-Size", req.file.size.toString());
      res.setHeader("X-Compressed-Size", resultBuffer.length.toString());
      res.send(resultBuffer);
    } catch (error: any) {
      console.error("[V10.0] Erro na rota convert:", error);
      res.status(500).json({ error: "Falha na conversão V10.0: " + (error.message || error) });
    }
  });

// Catch-all para API para depuração
app.all("/api/*", (req, res) => {
  console.log(`[PDFTurbo] Rota não encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: "Rota da API não encontrada", 
    path: req.path,
    method: req.method,
    availableRoutes: [
      "/api/health",
      "/api/optimize",
      "/api/merge",
      "/api/split",
      "/api/convert"
    ]
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[PDFTurbo] Erro global:", err);
  res.status(500).json({ error: "Erro interno no servidor: " + (err.message || "Erro desconhecido") });
});

async function startServer() {
  const PORT = process.env.PORT || 3000;

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL && (process.env.NODE_ENV !== "production" || process.env.START_SERVER === "true")) {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`[PDFTurbo] Servidor rodando na porta ${PORT}`);
      console.log(`[PDFTurbo] Rotas registradas:`);
      console.log(` - POST /api/optimize`);
      console.log(` - POST /api/merge`);
      console.log(` - POST /api/split`);
      console.log(` - POST /api/convert`);
    });
  }
}

// Apenas inicia se não estiver no Vercel ou se for o arquivo principal
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error("[PDFTurbo] Erro ao iniciar servidor:", err);
  });
}

export default app;
