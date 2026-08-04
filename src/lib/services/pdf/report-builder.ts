import PDFDocument from "pdfkit";

export function buildPdfReport(params: {
  title: string;
  summaryStats: { label: string; value: string }[];
  tableHeaders: string[];
  tableRows: string[][];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor("#D4AF37").fontSize(18).font("Helvetica-Bold").text("VOLTEX FUNDING");
    doc.fillColor("#000000").fontSize(13).font("Helvetica-Bold").text(params.title);
    doc.fillColor("#666666").fontSize(9).font("Helvetica").text(`Generated ${new Date().toLocaleString()}`);
    doc.moveDown(1);

    if (params.summaryStats.length > 0) {
      doc.fillColor("#000000").fontSize(11).font("Helvetica-Bold").text("Summary");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica");
      for (const stat of params.summaryStats) {
        doc.text(`${stat.label}: ${stat.value}`);
      }
      doc.moveDown(1);
    }

    doc.fontSize(11).font("Helvetica-Bold").text(`Data (${params.tableRows.length} rows)`);
    doc.moveDown(0.3);

    const startX = doc.x;
    let y = doc.y;
    const colWidth = (doc.page.width - startX * 2) / params.tableHeaders.length;

    function drawHeaderRow() {
      doc.fontSize(8).font("Helvetica-Bold");
      params.tableHeaders.forEach((h, i) => {
        doc.text(h, startX + i * colWidth, y, { width: colWidth - 4, ellipsis: true });
      });
      y += 14;
      doc.moveTo(startX, y).lineTo(doc.page.width - startX, y).strokeColor("#D4AF37").lineWidth(0.5).stroke();
      y += 5;
    }

    drawHeaderRow();
    doc.font("Helvetica").fontSize(8);

    for (const row of params.tableRows) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
        drawHeaderRow();
        doc.font("Helvetica").fontSize(8);
      }
      row.forEach((cell, i) => {
        doc.fillColor("#000000").text(cell, startX + i * colWidth, y, { width: colWidth - 4, ellipsis: true });
      });
      y += 13;
    }

    doc.end();
  });
}
