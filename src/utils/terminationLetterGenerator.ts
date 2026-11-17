import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { loadLogoForPDF } from "./logoLoader";

export const generateTerminationLetter = async (data: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Force crisp white background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // 1. Fetch Company Settings
    let settings = {
        company_name: 'Electric Complaint Solutions',
        company_address: '1st Floor, Zain Plaza, Islamabad',
        company_phone: '+92 310 1111 327',
        company_email: 'ecs.isbpak@gmail.com',
        authorized_signatory: 'Muhammad Aamir',
        signatory_designation: 'Chief Executive Officer'
    };

    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/company_settings`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
        });
        if (res.ok) {
            const settingsData = await res.json();
            const comp = Array.isArray(settingsData) ? settingsData[0] : settingsData;
            if (comp) {
                settings = { 
                    ...settings, 
                    ...comp,
                    authorized_signatory: comp.authorized_signatory || 'Muhammad Aamir',
                    signatory_designation: comp.signatory_designation || 'Chief Executive Officer'
                };
            }
        }
    } catch (err) {
        console.error("Error fetching company settings:", err);
    }

    const logoBase64 = await loadLogoForPDF('/LOGO.png');

    // --- Header Section ---
    if (logoBase64) {
        try { doc.addImage(logoBase64, 'PNG', margin, 12, 38, 18); } catch { /* fallback */ }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // Deep Navy Blue
    doc.text(settings.company_name.toUpperCase(), pageWidth - margin, 16, { align: "right" });
    
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(settings.company_address, pageWidth - margin, 21.5, { align: "right" });
    doc.text(`Tel: ${settings.company_phone} | Email: ${settings.company_email}`, pageWidth - margin, 26, { align: "right" });

    // Header Accent Line
    doc.setDrawColor(220, 38, 38); // Red
    doc.setLineWidth(0.8);
    doc.line(margin, 33, pageWidth - margin, 33);

    let y = 43;

    // QR Code for online verification
    const empCode = data.employee_id || data.id || "ECS-STF-000";
    const qrData = `${window.location.origin}/verify?id=${empCode}`;
    try {
        const qrCodeUrl = await QRCode.toDataURL(qrData);
        doc.addImage(qrCodeUrl, 'PNG', pageWidth - margin - 24, y - 6, 24, 24);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(120);
        doc.text("Scan to Verify Notice", pageWidth - margin - 12, y + 21, { align: "center" });
    } catch (err) {
        console.error("QR Generation failed in termination letter", err);
    }

    const terminationDate = data.terminated_at 
        ? new Date(data.terminated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const refId = `ECS/HR/TERM/${new Date().getFullYear()}/${(empCode || '000').slice(-4).toUpperCase()}`;

    doc.setFontSize(9.5);
    doc.setTextColor(40);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${terminationDate}`, margin, y);
    y += 5;
    doc.text(`Ref No: ${refId}`, margin, y);
    y += 10;

    // Document Title Banner
    doc.setFillColor(254, 242, 242); // Light red
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 10, 2, 2, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(185, 28, 28); // Dark Red
    doc.text("FORMAL EMPLOYMENT TERMINATION NOTICE", pageWidth / 2, y + 6.8, { align: "center" });
    y += 18;

    // Employee Meta Info Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 26, 2, 2, 'FD');

    const col1X = margin + 5;
    const col2X = margin + 90;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("Employee Name:", col1X, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(String(data.full_name || 'N/A'), col1X + 32, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("Father's Name:", col1X, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(String(data.father_name || 'N/A'), col1X + 32, y + 12);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("CNIC Number:", col1X, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(String(data.cnic || 'N/A'), col1X + 32, y + 18);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("Designation:", col2X, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(String(data.designation || 'N/A'), col2X + 30, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("Employee ID:", col2X, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(String(empCode), col2X + 30, y + 12);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("Branch / Office:", col2X, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(String(data.branch_name || data.branches?.name || 'Islamabad Branch'), col2X + 30, y + 18);

    y += 34;

    // Body Text
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30);

    const salutation = `Dear ${data.full_name || 'Employee'},`;
    doc.text(salutation, margin, y);
    y += 8;

    const openingText = `This letter serves as formal written notification that your employment with Electric Complaint Solutions (ECS) (Pvt.) Ltd. as ${data.designation || 'Staff'} has been terminated effective as of ${terminationDate}.`;
    const lines1 = doc.splitTextToSize(openingText, pageWidth - (margin * 2));
    doc.text(lines1, margin, y, { lineHeightFactor: 1.5 });
    y += (lines1.length * 5.5) + 6;

    // Reason for Termination Callout Box
    const reasonText = data.termination_reason || 'Administrative decision / Internal policy violation';
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.4);
    
    const reasonLines = doc.splitTextToSize(`Reason for Termination: ${reasonText}`, pageWidth - (margin * 2) - 10);
    const boxHeight = Math.max(14, (reasonLines.length * 5) + 6);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), boxHeight, 2, 2, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    doc.text("Reason for Termination:", margin + 5, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);
    doc.text(doc.splitTextToSize(reasonText, pageWidth - (margin * 2) - 48), margin + 46, y + 6);
    y += boxHeight + 8;

    // Policy & Return of Assets Notice
    const policyText = `Effective immediately, your authority to represent Electric Complaint Solutions (ECS) in any official capacity or interact with customers, partners, and vendors is revoked. You are required to immediately return all company-owned properties, including your Employee ID Card, keys, tools, equipment, documentation, and digital credentials in your possession.\n\nYour final financial settlement, along with any applicable service records, will be computed in accordance with the corporate employment terms upon complete clearance from your respective Branch Manager and the Accounts Department.`;
    const lines2 = doc.splitTextToSize(policyText, pageWidth - (margin * 2));
    doc.text(lines2, margin, y, { lineHeightFactor: 1.5 });
    y += (lines2.length * 5.5) + 16;

    // Signatures
    const sigY = y;
    // Left: Authorized Issuer
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30);
    doc.text("Issued & Authorized By:", margin, sigY);
    doc.line(margin, sigY + 16, margin + 55, sigY + 16);
    doc.setFontSize(9);
    doc.text(String(data.terminated_by || settings.authorized_signatory || 'Management Authority'), margin, sigY + 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Human Resources / Competent Authority", margin, sigY + 25);
    doc.text("Electric Complaint Solutions (ECS)", margin, sigY + 29);

    // Right: Employee Acknowledgment
    const rightSigX = pageWidth - margin - 60;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30);
    doc.text("Employee Acknowledgment:", rightSigX, sigY);
    doc.line(rightSigX, sigY + 16, rightSigX + 60, sigY + 16);
    doc.setFontSize(9);
    doc.text("Signature: ___________________", rightSigX, sigY + 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Name: ${data.full_name || 'Employee'}`, rightSigX, sigY + 25);
    doc.text(`Date: ________________________`, rightSigX, sigY + 29);

    // Footer
    const footerY = pageHeight - 14;
    doc.setDrawColor(220, 226, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Head Office: ${settings.company_address} | Phone: ${settings.company_phone} | Email: ${settings.company_email}`, pageWidth / 2, footerY, { align: "center" });
    doc.text(`This is a system generated and digitally verified termination document. Ref: ${refId}`, pageWidth / 2, footerY + 4, { align: "center" });

    doc.save(`Termination_Letter_${data.full_name?.replace(/\s+/g, '_') || 'Employee'}.pdf`);
};
