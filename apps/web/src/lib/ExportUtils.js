import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export const exportToExcel = (data, filename, sheetName = 'Sheet1') => {
  if (!data || data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const generatePDF = (title, headers, body, filename) => {
  const doc = new jsPDF();
  const dateStr = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
  
  doc.setFontSize(16);
  const titleWidth = doc.getStringUnitWidth(title) * doc.internal.getFontSize() / doc.internal.scaleFactor;
  doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, 15);
  
  doc.setFontSize(10);
  const dateWidth = doc.getStringUnitWidth(dateStr) * doc.internal.getFontSize() / doc.internal.scaleFactor;
  doc.text(dateStr, (doc.internal.pageSize.width - dateWidth) / 2, 23);

  doc.autoTable({
    head: [headers],
    body: body,
    startY: 30,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  
  doc.save(`${filename}.pdf`);
};

export const printContent = () => {
  window.print();
};