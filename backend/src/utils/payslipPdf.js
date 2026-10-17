const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Built-in PDF fonts have no ₹ glyph, so amounts use "Rs."
const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigits = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim());

// Indian numbering: crore, lakh, thousand, hundred
const amountInWords = (amount) => {
  let n = Math.floor(Math.abs(amount || 0));
  if (n === 0) return 'Zero Rupees Only';
  const parts = [];
  const units = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [100, 'Hundred']];
  for (const [value, label] of units) {
    if (n >= value) {
      parts.push(`${twoDigits(Math.floor(n / value))} ${label}`);
      n %= value;
    }
  }
  if (n > 0) parts.push(twoDigits(n));
  return `${parts.join(' ')} Rupees Only`;
};

const generatePayslip = (payroll, res, companyInfo = {}) => {
  const emp = payroll.employee || {};
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const company = companyInfo.companyName || process.env.COMPANY_NAME || 'HRMS';
  const addr = companyInfo.address || {};
  const addressLine = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
  // pdfkit embeds only PNG / JPEG logos
  const logoFile = companyInfo.logo && /\.(png|jpe?g)$/i.test(companyInfo.logo)
    ? path.join(__dirname, '../../uploads/photos', companyInfo.logo) : null;
  const left = 40;
  const width = doc.page.width - 80;
  const primary = '#1976d2';

  // Header band
  doc.rect(0, 0, doc.page.width, 90).fill(primary);
  let textLeft = left;
  if (logoFile && fs.existsSync(logoFile)) {
    try {
      doc.image(logoFile, left, 18, { fit: [54, 54] });
      textLeft = left + 64;
    } catch { /* unreadable image: skip the logo */ }
  }
  doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold').text(company, textLeft, addressLine ? 20 : 28);
  if (addressLine) doc.fontSize(9).font('Helvetica').text(addressLine, textLeft, 44, { width: width - (textLeft - left) - 150 });
  const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const period = payroll.periodStart ? ` (${fmtDay(payroll.periodStart)} - ${fmtDay(payroll.periodEnd)})` : '';
  doc.fontSize(11).font('Helvetica').text(`Payslip for ${MONTHS[payroll.month - 1]} ${payroll.year}${period}`, textLeft, addressLine ? 62 : 56);
  doc.fontSize(10).text(`Status: ${String(payroll.status).toUpperCase()}`, left, 56, { width, align: 'right' });

  // Employee details
  let y = 115;
  doc.fillColor('#111');
  const details = [
    ['Employee Name', `${emp.firstName || ''} ${emp.lastName || ''}`.trim()],
    ['Employee ID', emp.employeeId || '-'],
    ['Department', emp.department?.departmentName || '-'],
    ['Designation', emp.designation?.designationName || '-'],
    ['Bank', emp.bankName || '-'],
    ['Account No.', emp.accountNumber ? `XXXX${String(emp.accountNumber).slice(-4)}` : '-'],
    ['PAN', emp.panNumber || '-'],
    ['Paid On', payroll.paidAt ? new Date(payroll.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'],
  ];
  const colW = width / 2;
  details.forEach(([label, value], i) => {
    const x = left + (i % 2) * colW;
    const rowY = y + Math.floor(i / 2) * 20;
    doc.font('Helvetica').fontSize(9).fillColor('#666').text(label, x, rowY);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111').text(value, x + 95, rowY);
  });
  y += Math.ceil(details.length / 2) * 20 + 10;

  // Attendance strip
  doc.roundedRect(left, y, width, 40, 6).fill('#f3f6fb');
  const permMins = payroll.permissionMinutes || 0;
  const att = [
    ['Working Days', payroll.workingDays ?? '-'],
    ['Present', payroll.presentDays ?? '-'],
    ['Paid Leave', payroll.paidLeaveDays ?? 0],
    ['LOP Days', payroll.lopDays ?? payroll.absentDays ?? 0],
    ['Late Days', payroll.lateDays ?? 0],
    ['Permission', `${Math.floor(permMins / 60)}h ${permMins % 60}m`],
  ];
  const cellW = width / att.length;
  att.forEach(([label, value], i) => {
    const x = left + i * cellW;
    doc.font('Helvetica').fontSize(8).fillColor('#666').text(label, x, y + 8, { width: cellW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111').text(String(value), x, y + 20, { width: cellW, align: 'center' });
  });
  y += 60;

  // Earnings & deductions tables side by side
  const earnings = [['Basic Salary', payroll.basicSalary], ...(payroll.allowances || []).map((a) => [a.name, a.amount])];
  if (payroll.overtimePay) earnings.push(['Overtime Pay', payroll.overtimePay]);
  const deductions = (payroll.deductions || []).map((d) => [d.name, d.amount]);

  const tableW = (width - 20) / 2;
  const drawTable = (x, title, rows, total, color) => {
    doc.rect(x, y, tableW, 24).fill(color);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10).text(title, x + 10, y + 7);
    doc.text('Amount', x, y + 7, { width: tableW - 10, align: 'right' });
    let rowY = y + 24;
    const rowCount = Math.max(earnings.length, deductions.length, 1);
    for (let i = 0; i < rowCount; i++) {
      if (i % 2 === 1) doc.rect(x, rowY, tableW, 22).fill('#fafafa');
      const row = rows[i];
      if (row) {
        doc.fillColor('#333').font('Helvetica').fontSize(9).text(row[0] || '-', x + 10, rowY + 7);
        doc.text(money(row[1]), x, rowY + 7, { width: tableW - 10, align: 'right' });
      }
      rowY += 22;
    }
    doc.moveTo(x, rowY).lineTo(x + tableW, rowY).strokeColor('#ddd').stroke();
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(10).text(`Total ${title}`, x + 10, rowY + 8);
    doc.text(money(total), x, rowY + 8, { width: tableW - 10, align: 'right' });
    return rowY + 30;
  };

  const endY1 = drawTable(left, 'Earnings', earnings, payroll.grossSalary, '#10b981');
  const endY2 = drawTable(left + tableW + 20, 'Deductions', deductions, payroll.totalDeductions, '#ef4444');
  y = Math.max(endY1, endY2) + 10;

  // Net pay
  doc.roundedRect(left, y, width, 56, 8).fill(primary);
  doc.fillColor('#fff').font('Helvetica').fontSize(10).text('NET PAY', left + 16, y + 12);
  doc.font('Helvetica-Bold').fontSize(20).text(money(payroll.netSalary), left + 16, y + 26);
  doc.font('Helvetica').fontSize(9).text(amountInWords(payroll.netSalary), left, y + 32, { width: width - 16, align: 'right' });
  y += 80;

  // Employer contributions (Bonus / EL / Gratuity) — informational, not part of net pay
  if (payroll.contributions?.length) {
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(10)
      .text(`Employer Contributions (on Basic + DA ${money(payroll.basicDA)})`, left, y);
    y += 16;
    doc.font('Helvetica').fontSize(9).fillColor('#333')
      .text(payroll.contributions.map((c) => `${c.name}: ${money(c.amount)}`).join('     '), left, y, { width });
    y += 24;
  }

  if (payroll.remarks) {
    doc.fillColor('#666').fontSize(9).text(`Remarks: ${payroll.remarks}`, left, y);
    y += 20;
  }

  doc.fillColor('#999').fontSize(8).text(
    'This is a computer-generated payslip and does not require a signature.',
    left, doc.page.height - 60, { width, align: 'center' }
  );

  doc.end();
};

module.exports = { generatePayslip, amountInWords };
