import PDFDocument from 'pdfkit';
import * as PdfKit from 'pdfkit';
// pdfkit exposes these font data modules without TypeScript declarations.
// @ts-expect-error pdfkit package export has no matching declaration
import Courier from 'pdfkit/standard-fonts/Courier';
// @ts-expect-error pdfkit package export has no matching declaration
import Helvetica from 'pdfkit/standard-fonts/Helvetica';
// @ts-expect-error pdfkit package export has no matching declaration
import HelveticaBold from 'pdfkit/standard-fonts/HelveticaBold';
import QRCode from 'qrcode';
import ClorioLogoB64 from '@/assets/ClorioLogoB64.json';
import type {
  PaperWalletPayload,
  StorePaperWalletMessage,
  StorePaperWalletResponse,
} from '@/messages/types';

const MM = 72 / 25.4;
const PDF_PASSWORD_MIN_LENGTH = 8;
const COLORS = {
  ink: '#18231d',
  green: '#2d7253',
  muted: '#536158',
  border: '#b8c2bb',
  line: '#89968e',
  warningText: '#68470d',
  warningBorder: '#9c6c16',
  warningBackground: '#fff9e8',
};

const mm = (value: number) => value * MM;
const registerStandardFonts = (
  PdfKit as unknown as {
    registerStdFonts?: (...fontData: unknown[]) => void;
  }
).registerStdFonts;
registerStandardFonts?.(Courier, Helvetica, HelveticaBold);

export function isValidPaperWalletPdfPassword(password: string): boolean {
  return password.length >= PDF_PASSWORD_MIN_LENGTH;
}

function setColor(doc: PDFKit.PDFDocument, color: string): void {
  doc.fillColor(color).strokeColor(color);
}

function drawText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  color: string,
  font = 'Helvetica',
): void {
  doc
    .font(font)
    .fontSize(fontSize)
    .fillColor(color)
    .text(text, x, y, { width, lineGap: fontSize * 0.5 });
}

function drawLabel(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
): void {
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLORS.green)
    .text(text.toUpperCase(), x, y - mm(2.5));
}

function drawCode(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
): void {
  drawText(doc, text, x, y, width, 9, COLORS.ink, 'Courier');
}

function drawQrCode(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number,
  y: number,
): void {
  const qrData = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const count = qrData.modules.size;
  const moduleSize = mm(43.2) / count;
  const padding = mm(2.4);
  const qrColor = COLORS.ink;

  setColor(doc, '#ffffff');
  doc.roundedRect(x, y, mm(48), mm(48), mm(3)).fill();

  const isDark = (row: number, column: number) =>
    !!qrData.modules.data[row * count + column];
  const isFinderPattern = (row: number, column: number) =>
    (row < 7 && column < 7) ||
    (row < 7 && column >= count - 7) ||
    (row >= count - 7 && column < 7);

  setColor(doc, qrColor);
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (!isDark(row, column) || isFinderPattern(row, column)) continue;
      doc
        .circle(
          x + padding + (column + 0.5) * moduleSize,
          y + padding + (row + 0.5) * moduleSize,
          moduleSize * 0.35,
        )
        .fill();
    }
  }

  const drawFinderPattern = (row: number, column: number) => {
    const finderX = x + padding + (column + 0.5) * moduleSize;
    const finderY = y + padding + (row + 0.5) * moduleSize;
    doc.lineWidth(moduleSize);
    doc
      .roundedRect(
        finderX,
        finderY,
        moduleSize * 6,
        moduleSize * 6,
        moduleSize * 2,
      )
      .stroke();
    doc
      .roundedRect(
        finderX + moduleSize * 1.5,
        finderY + moduleSize * 1.5,
        moduleSize * 3,
        moduleSize * 3,
        moduleSize,
      )
      .fill();
  };

  drawFinderPattern(0, 0);
  drawFinderPattern(0, count - 7);
  drawFinderPattern(count - 7, 0);
}

export async function createPaperWalletPdf(
  data: PaperWalletPayload,
  password: string,
): Promise<Blob> {
  if (!isValidPaperWalletPdfPassword(password)) {
    throw new Error('PDF password must be at least 8 characters long');
  }

  const doc = new PDFDocument({
    size: 'A4',
    userPassword: password,
    ownerPassword: crypto.randomUUID(),
    pdfVersion: '1.7ext3',
    permissions: {
      printing: 'highResolution',
      copying: false,
      modifying: false,
      annotating: false,
    },
  });

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () =>
      resolve(new Blob(chunks as BlobPart[], { type: 'application/pdf' })),
    );

    const left = mm(12);
    const right = mm(198);
    const contentWidth = right - left;
    const columnGap = mm(12);
    const columnWidth = (contentWidth - columnGap) / 2;

    setColor(doc, '#ffffff');
    doc.roundedRect(left, mm(12), mm(38), mm(15), mm(3)).fill();
    setColor(doc, COLORS.border);
    doc.lineWidth(mm(0.25));
    doc.roundedRect(left, mm(12), mm(38), mm(15), mm(3)).stroke();
    doc.image(ClorioLogoB64, left + mm(3), mm(12.6), {
      width: mm(32),
      height: mm(13.9),
    });

    doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.ink);
    doc.text('Mina Paper Wallet', left, mm(31), { width: contentWidth });
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Clorio Wallet', left, mm(34), {
        width: contentWidth,
        align: 'right',
      });

    setColor(doc, COLORS.border);
    doc.lineWidth(mm(0.25)).moveTo(left, mm(47)).lineTo(right, mm(47)).stroke();

    drawLabel(doc, 'Public address', left, mm(57));
    drawText(
      doc,
      'Use this address to receive MINA. It is safe to share.',
      left,
      mm(61),
      mm(116),
      10,
      COLORS.muted,
    );
    drawCode(doc, data.publicKey, left, mm(74), mm(116));
    drawQrCode(doc, data.publicKey, right - mm(48), mm(54));

    setColor(doc, COLORS.line);
    doc.lineWidth(mm(0.25)).dash(mm(1), { space: mm(1) });
    doc.moveTo(left, mm(131)).lineTo(mm(82), mm(131)).stroke();
    doc.moveTo(mm(128), mm(131)).lineTo(right, mm(131)).stroke();
    doc.undash();
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.line);
    doc.text('FOLD HERE', mm(82), mm(129), {
      width: mm(46),
      align: 'center',
    });

    const secretTop = mm(142);
    drawLabel(doc, 'Your Secret Recovery Phrase', left, secretTop);
    drawText(
      doc,
      'Scan or enter this secret to restore the wallet.',
      left,
      secretTop + mm(4),
      columnWidth,
      10,
      COLORS.muted,
    );
    doc.font('Courier').fontSize(10).fillColor(COLORS.ink);
    const words = data.mnemonic?.trim().split(/\s+/) ?? [];
    words.forEach((word, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      doc.text(
        `${index + 1}. ${word}`,
        left + mm(7) + column * mm(26),
        secretTop + mm(16) + row * mm(6),
      );
    });

    const privateKeyX = words.length ? left + columnWidth + columnGap : left;
    drawLabel(doc, 'Your Private Key', privateKeyX, secretTop);
    drawText(
      doc,
      'Scan or enter this secret to restore the wallet.',
      privateKeyX,
      secretTop + mm(4),
      columnWidth,
      10,
      COLORS.muted,
    );
    if (data.privateKey) {
      drawCode(
        doc,
        data.privateKey,
        privateKeyX,
        secretTop + mm(16),
        columnWidth,
      );
    }

    setColor(doc, COLORS.border);
    doc
      .lineWidth(mm(0.25))
      .moveTo(left, mm(198))
      .lineTo(right, mm(198))
      .stroke();

    setColor(doc, COLORS.warningBackground);
    doc.roundedRect(left, mm(206), contentWidth, mm(24), mm(1)).fill();
    setColor(doc, COLORS.warningBorder);
    doc.lineWidth(mm(0.35));
    doc.roundedRect(left, mm(206), contentWidth, mm(24), mm(1)).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.warningText);
    doc.text('Warning:', left + mm(5), mm(210));
    drawText(
      doc,
      'Anyone with this secret can control your funds. Keep this paper private, offline, and protected from loss. If saving a PDF, use an encrypted offline drive and delete extra copies.',
      left + mm(5),
      mm(215),
      contentWidth - mm(10),
      9,
      COLORS.warningText,
    );

    doc.end();
  });
}

export async function openPaperWallet(data: PaperWalletPayload): Promise<void> {
  const token = crypto.randomUUID();
  const message: StorePaperWalletMessage = {
    type: 'STORE_PAPER_WALLET',
    payload: { token, data },
  };
  const response = (await chrome.runtime.sendMessage(
    message,
  )) as StorePaperWalletResponse;

  if (!response?.ok) {
    throw new Error(
      response?.error || 'Reload the Clorio extension, then try again.',
    );
  }

  await chrome.tabs.create({
    url: chrome.runtime.getURL(
      `src/popup/index.html#/paper-wallet?token=${token}`,
    ),
    active: true,
  });
}
