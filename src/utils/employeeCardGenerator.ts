import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { loadLogoForPDF } from "./logoLoader";

export const generateEmployeeCard = async (data: any) => {
    // Standard CR80 ID Card dimensions: 54mm x 86mm (Portrait)
    const cardWidth = 54;
    const cardHeight = 86;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [cardWidth, cardHeight]
    });

    let settings = {
        company_name: 'Electric Complaint Solutions',
        company_address: '1st Floor, Zain Plaza, Islamabad',
        company_phone: '+92 310 1111 327',
        company_email: 'ecs.isbpak@gmail.com'
    };

    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/company_settings`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
        });
        if (res.ok) {
            const compData = await res.json();
            const comp = Array.isArray(compData) ? compData[0] : compData;
            if (comp) settings = { ...settings, ...comp };
        }
    } catch (err) {
        console.error("Error fetching settings for employee card:", err);
    }

    const empCode = data.employee_id || data.id || "ECS-STF-001";
    const qrData = `${window.location.origin}/verify?id=${empCode}`;
    const logoBase64 = await loadLogoForPDF('/LOGO.png');
    const designation = String(data.designation || 'Staff Member');
    const branchName = data.branch_name || data.branches?.name || 'Islamabad';

    // Helper: draw subtle faint grid pattern like template
    const drawGridPattern = () => {
        doc.setDrawColor(245, 247, 250);
        doc.setLineWidth(0.2);
        for (let x = 4; x < cardWidth; x += 4) {
            doc.line(x, 0, x, cardHeight);
        }
        for (let y = 4; y < cardHeight; y += 4) {
            doc.line(0, y, cardWidth, y);
        }
    };

    // =========================================================================
    // PAGE 1: FRONT SIDE (ID CARD FRONT)
    // =========================================================================
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, cardWidth, cardHeight, 'F');
    drawGridPattern();

    // Bold Red Right Vertical Stripe (Matches Template exactly)
    const stripeWidth = 12.5;
    const stripeX = cardWidth - stripeWidth;
    doc.setFillColor(220, 38, 38); // Crimson Brand Red
    doc.rect(stripeX, 0, stripeWidth, cardHeight, 'F');

    // Right Edge Vertical Designation Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    // Truncate designation if very long
    const cleanDesig = designation.length > 20 ? designation.slice(0, 18) + '...' : designation;
    doc.text(cleanDesig.toUpperCase(), stripeX + 7, 10, { angle: 90 });

    // Top-Left: Logo & Company Name
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', 4.5, 4.5, 9, 8);
        } catch {
            // fallback
        }
    }
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("ECS PAKISTAN", 15, 8);
    doc.setFontSize(4.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Complaint Solutions", 15, 11);

    // Profile Photo Box with Red Border Frame
    const photoX = 5.5;
    const photoY = 15;
    const photoW = 30;
    const photoH = 36;

    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.6);
    doc.rect(photoX, photoY, photoW, photoH, 'S');

    // If staff has a photo uploaded, display it
    let photoLoaded = false;
    if (data.profile_photo && typeof data.profile_photo === 'string' && data.profile_photo.startsWith('http')) {
        try {
            const photoImg = await loadLogoForPDF(data.profile_photo);
            if (photoImg) {
                doc.addImage(photoImg, 'JPEG', photoX + 0.4, photoY + 0.4, photoW - 0.8, photoH - 0.8);
                photoLoaded = true;
            }
        } catch (photoErr) {
            console.warn("Could not load employee photo for card:", photoErr);
        }
    }

    if (!photoLoaded) {
        // Draw crisp modern silhouette placeholder
        doc.setFillColor(241, 245, 249);
        doc.rect(photoX + 0.4, photoY + 0.4, photoW - 0.8, photoH - 0.8, 'F');
        
        // Silhouette head
        doc.setFillColor(203, 213, 225);
        doc.circle(photoX + (photoW / 2), photoY + 14, 6.5, 'F');
        // Silhouette shoulders
        doc.roundedRect(photoX + 5, photoY + 23, photoW - 10, 12, 5, 5, 'F');
        
        doc.setFontSize(4);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(148, 163, 184);
        doc.text("PHOTO", photoX + (photoW / 2), photoY + photoH - 2, { align: "center" });
    }

    // Employee Full Name
    let currentY = 55;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28); // Dark Red
    const nameLines = doc.splitTextToSize(String(data.full_name || 'Employee Name'), 33);
    doc.text(nameLines[0] || 'Employee Name', 5.5, currentY);
    if (nameLines[1]) {
        currentY += 3.5;
        doc.text(nameLines[1], 5.5, currentY);
    }
    currentY += 4.5;

    // Metadata Fields
    const cardFields = [
        { label: "ID No", value: empCode },
        { label: "Email", value: data.email || 'ecs.isbpak@gmail.com' },
        { label: "Phone", value: data.contact_1 || data.phone || 'N/A' },
        ...(data.blood_group ? [{ label: "Blood", value: data.blood_group }] : []),
    ];

    cardFields.forEach(f => {
        doc.setFontSize(5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(`${f.label}`, 5.5, currentY);
        doc.text(`:`, 13, currentY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60);
        const valTrunc = doc.splitTextToSize(String(f.value), 26)[0] || '';
        doc.text(valTrunc, 15, currentY);
        currentY += 3;
    });

    // Barcode Pattern at Bottom
    const bcX = 5.5;
    const bcY = 74;
    const bcW = 32;
    const bcH = 6.5;
    const barPattern = [1, 2, 1, 1, 3, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 1, 2, 1, 3, 1];
    let currX = bcX;
    doc.setFillColor(30, 30, 30);
    for (let b = 0; b < barPattern.length && currX < bcX + bcW; b++) {
        const w = barPattern[b] * 0.3;
        if (b % 2 === 0) {
            doc.rect(currX, bcY, w, bcH, 'F');
        }
        currX += w + 0.35;
    }
    doc.setFontSize(4.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(String(empCode), bcX + (bcW / 2), bcY + bcH + 2.5, { align: "center" });

    // Little red accent square at bottom-left corner (Matches template)
    doc.setFillColor(220, 38, 38);
    doc.rect(0, cardHeight - 4, 3.5, 4, 'F');
    doc.rect(3.5, cardHeight - 2, 2, 2, 'F');

    // =========================================================================
    // PAGE 2: BACK SIDE (TERMS & CONDITIONS + VERIFICATION QR)
    // =========================================================================
    doc.addPage([cardWidth, cardHeight], 'p');
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, cardWidth, cardHeight, 'F');
    drawGridPattern();

    // Red Stripe on the Left (Matches Back-side Template exactly)
    const backStripeW = 7;
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, backStripeW, cardHeight, 'F');

    // Top-right decorative red squares (Matches Template)
    doc.rect(cardWidth - 6, 0, 6, 3, 'F');
    doc.rect(cardWidth - 3, 3, 3, 3, 'F');

    // Top-Center: Logo & Company Name
    const backCenterX = (cardWidth + backStripeW) / 2; // ~30.5mm
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', backCenterX - 14, 4.5, 7, 6);
        } catch {
            // fallback
        }
    }
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("ECS PAKISTAN", backCenterX - 5, 7.5);
    doc.setFontSize(4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Electric Complaint Solutions", backCenterX - 5, 10);

    // Title: TERMS & CONDITIONS
    let backY = 16.5;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 30, 60);
    doc.text("TERMS & CONDITIONS", backCenterX, backY, { align: "center" });

    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.4);
    doc.line(backStripeW + 3, backY + 1.5, cardWidth - 3, backY + 1.5);
    backY += 4.5;

    // Terms Text (Exact words from template adapted for ECS)
    const termsList = [
        {
            title: "Identification:",
            body: "Employees are required to keep their ID badge visible or easily accessible during working hours to confirm identity when needed."
        },
        {
            title: "Proper Use:",
            body: "The ID badge is issued solely for company-related activities. It may not be lent, duplicated, or used for any non-official purpose."
        },
        {
            title: "Security:",
            body: "If the badge is misplaced or suspected to be compromised, report it immediately so access can be disabled."
        }
    ];

    const contentW = cardWidth - backStripeW - 6; // ~41mm

    termsList.forEach(t => {
        doc.setFontSize(4.8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20);
        doc.text(t.title, backStripeW + 3, backY);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60);
        const wrapped = doc.splitTextToSize(t.body, contentW);
        doc.text(wrapped, backStripeW + 3, backY + 2.5, { lineHeightFactor: 1.25 });
        backY += (wrapped.length * 2.2) + 4.5;
    });

    // ID Number Line
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text(`ID Number: ${empCode}`, backCenterX, backY, { align: "center" });
    backY += 2.5;

    // QR Code for Instant Verification
    try {
        const qrCodeUrl = await QRCode.toDataURL(qrData);
        const qrSize = 13.5;
        const qrX = backCenterX - (qrSize / 2);
        doc.addImage(qrCodeUrl, 'PNG', qrX, backY, qrSize, qrSize);
        backY += qrSize + 2.5;

        doc.setFontSize(4);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("Scan QR to Verify Official Status Online", backCenterX, backY, { align: "center" });
        backY += 2;
        doc.setFontSize(3.8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Helpline: ${settings.company_phone || '+92 310 1111 327'}`, backCenterX, backY, { align: "center" });
    } catch (qrErr) {
        console.error("QR generation failed for card back:", qrErr);
    }

    // Bottom-right decorative geometric red accent blocks (Matches Template)
    doc.setFillColor(220, 38, 38);
    doc.rect(cardWidth - 10, cardHeight - 8, 4, 4, 'F');
    doc.rect(cardWidth - 6, cardHeight - 4, 6, 4, 'F');
    doc.rect(cardWidth - 14, cardHeight - 4, 4, 4, 'F');

    // Save PDF
    doc.save(`Employee_Card_${data.full_name?.replace(/\s+/g, '_') || 'Card'}.pdf`);
};
