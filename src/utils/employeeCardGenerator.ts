import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { loadLogoForPDF } from "./logoLoader";

/**
 * Loads and auto-adjusts employee photo using an offscreen canvas
 * with proportional cover cropping (object-fit: cover) and subtle
 * face-bias so employee photos never appear squashed or distorted.
 */
const loadAndAdjustEmployeePhoto = (photoUrl: string, targetW: number = 400, targetH: number = 450): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!photoUrl || typeof photoUrl !== 'string') {
            resolve(null);
            return;
        }

        let fullUrl = photoUrl;
        if (!fullUrl.startsWith('data:') && !fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
            const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
            if (fullUrl.startsWith('/')) {
                fullUrl = `${apiBase}${fullUrl}`;
            } else {
                fullUrl = `${apiBase}/uploads/${fullUrl}`;
            }
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, targetW, targetH);

                const srcW = img.naturalWidth || img.width;
                const srcH = img.naturalHeight || img.height;
                const srcRatio = srcW / srcH;
                const targetRatio = targetW / targetH;

                let sWidth = srcW;
                let sHeight = srcH;
                let sx = 0;
                let sy = 0;

                if (srcRatio > targetRatio) {
                    // Image wider than target frame: crop horizontal sides
                    sWidth = srcH * targetRatio;
                    sx = (srcW - sWidth) / 2;
                } else {
                    // Image taller than target frame: crop vertical with upper-center focus for faces
                    sHeight = srcW / targetRatio;
                    sy = (srcH - sHeight) * 0.2; // 20% down from top
                }

                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            } catch (err) {
                console.warn("Canvas crop failed, fallback to direct image", err);
                resolve(null);
            }
        };

        img.onerror = () => {
            // Secondary fallback attempt: fetch blob
            fetch(fullUrl)
                .then(res => res.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const rawData = reader.result as string;
                        const fallbackImg = new Image();
                        fallbackImg.onload = () => {
                            try {
                                const canvas = document.createElement('canvas');
                                canvas.width = targetW;
                                canvas.height = targetH;
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                    ctx.fillStyle = '#ffffff';
                                    ctx.fillRect(0, 0, targetW, targetH);
                                    ctx.drawImage(fallbackImg, 0, 0, targetW, targetH);
                                    resolve(canvas.toDataURL('image/jpeg', 0.95));
                                    return;
                                }
                            } catch {}
                            resolve(rawData);
                        };
                        fallbackImg.onerror = () => resolve(rawData);
                        fallbackImg.src = rawData;
                    };
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                })
                .catch(() => resolve(null));
        };

        img.src = fullUrl;
    });
};

/**
 * Draws a sharp, clear, high-density Code39 barcode vector in jsPDF
 */
const drawCode39Barcode = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, height: number) => {
    const CODE39: Record<string, string> = {
        '0': 'bwbwbwBwb', '1': 'BwbwbwbwB', '2': 'bwBwbwbwB', '3': 'BwBwbwbwb',
        '4': 'bwbwBwbwB', '5': 'BwbwBwbwb', '6': 'bwBwBwbwb', '7': 'bwbwbwBwB',
        '8': 'BwbwbwBwb', '9': 'bwBwbwBwb', 'A': 'BwbwbwbwB', 'B': 'bwBwbwbwB',
        'C': 'BwBwbwbwb', 'D': 'bwbwBwbwB', 'E': 'BwbwBwbwb', 'F': 'bwBwBwbwb',
        'G': 'bwbwbwBwB', 'H': 'BwbwbwBwb', 'I': 'bwBwbwBwb', 'J': 'bwbwBwBwb',
        'K': 'BwbwbwbwB', 'L': 'bwBwbwbwB', 'M': 'BwBwbwbwb', 'N': 'bwbwBwbwB',
        'O': 'BwbwBwbwb', 'P': 'bwBwBwbwb', 'Q': 'bwbwbwBwB', 'R': 'BwbwbwBwb',
        'S': 'bwBwbwBwb', 'T': 'bwbwBwBwb', 'U': 'BwbwbwbwB', 'V': 'bwBwbwbwB',
        'W': 'BwBwbwbwb', 'X': 'bwbwBwbwB', 'Y': 'BwbwBwbwb', 'Z': 'bwBwBwbwb',
        '-': 'bWbwbwbwB', '.': 'Bwbwbwbwb', ' ': 'bwBwbwbwb', '*': 'bWbwBwBwb'
    };

    const clean = '*' + String(text || '').toUpperCase().replace(/[^0-9A-Z\-\.\s]/g, '') + '*';
    let pattern = '';
    for (const ch of clean) {
        pattern += (CODE39[ch] || CODE39['-']) + 'w';
    }

    let totalUnits = 0;
    for (const char of pattern) {
        totalUnits += (char === 'B' || char === 'W') ? 2.5 : 1;
    }
    const unitWidth = maxWidth / totalUnits;

    // Draw crisp white background behind barcode for maximum contrast
    doc.setFillColor(255, 255, 255);
    doc.rect(x - 0.5, y - 0.5, maxWidth + 1, height + 1, 'F');

    let currentX = x;
    doc.setFillColor(15, 23, 42); // Deep rich black
    for (const char of pattern) {
        const isBar = (char === 'b' || char === 'B');
        const isWide = (char === 'B' || char === 'W');
        const w = isWide ? unitWidth * 2.5 : unitWidth;
        if (isBar) {
            doc.rect(currentX, y, w, height, 'F');
        }
        currentX += w;
    }
};

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

    // Bold Red Right Vertical Stripe (Matches Template)
    const stripeWidth = 11.5;
    const stripeX = cardWidth - stripeWidth;
    const stripeCenterX = stripeX + (stripeWidth / 2);
    doc.setFillColor(220, 38, 38); // Crimson Brand Red
    doc.rect(stripeX, 0, stripeWidth, cardHeight, 'F');

    // Right Edge Vertical Title on Red Stripe: "ELECTRIC COMPLAINT SOLUTIONS - ECS"
    // Runs from TOP TO BOTTOM (Uper se nicha), precisely centered both horizontally and vertically
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    const stripTitle = "ELECTRIC COMPLAINT SOLUTIONS - ECS";
    const stripTextW = doc.getTextWidth(stripTitle);
    const startY = (cardHeight - stripTextW) / 2; // Exact vertical center
    const capHeightMm = 7.5 * (25.4 / 72) * 0.7; // Helvetica bold cap height (~1.85mm)
    const textX = stripeCenterX - (capHeightMm / 2); // Exact horizontal center between left and right strip edges
    doc.text(stripTitle, textX, startY, { angle: 270 });

    // Top-Left: Original Logo in exact aspect ratio (Clean alignment above photo frame)
    const photoX = 5.5;
    const photoY = 13;
    const photoW = 31.5;
    const photoH = 35;

    if (logoBase64) {
        try {
            // Original aspect ratio 2.1 : 1
            const logoW = 19;
            const logoH = 9;
            doc.addImage(logoBase64, 'PNG', photoX, 2.5, logoW, logoH);
        } catch {
            // fallback
        }
    }

    // Profile Photo Box with Red Border Frame
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.6);
    doc.rect(photoX, photoY, photoW, photoH, 'S');

    // Auto-adjust uploaded profile photo with aspect-fit cover
    let photoLoaded = false;
    if (data.profile_photo && typeof data.profile_photo === 'string') {
        try {
            const adjustedPhoto = await loadAndAdjustEmployeePhoto(data.profile_photo, 400, 445);
            if (adjustedPhoto) {
                doc.addImage(adjustedPhoto, 'JPEG', photoX + 0.4, photoY + 0.4, photoW - 0.8, photoH - 0.8);
                photoLoaded = true;
            }
        } catch (photoErr) {
            console.warn("Could not load employee photo for card:", photoErr);
        }
    }

    if (!photoLoaded) {
        // Crisp modern silhouette placeholder
        doc.setFillColor(241, 245, 249);
        doc.rect(photoX + 0.4, photoY + 0.4, photoW - 0.8, photoH - 0.8, 'F');
        
        // Silhouette head
        doc.setFillColor(203, 213, 225);
        doc.circle(photoX + (photoW / 2), photoY + 13.5, 6.5, 'F');
        // Silhouette shoulders
        doc.roundedRect(photoX + 5, photoY + 22.5, photoW - 10, 12, 5, 5, 'F');
        
        doc.setFontSize(4);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(148, 163, 184);
        doc.text("PHOTO", photoX + (photoW / 2), photoY + photoH - 2, { align: "center" });
    }

    // Employee Full Name (Bold)
    let currentY = photoY + photoH + 4;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // Bold Brand Red
    const nameLines = doc.splitTextToSize(String(data.full_name || 'Employee Name'), photoW);
    doc.text(nameLines[0] || 'Employee Name', photoX, currentY);
    if (nameLines[1]) {
        currentY += 3.5;
        doc.text(nameLines[1], photoX, currentY);
    }

    // Designation (Semi-bold, under the Name)
    currentY += 3.8;
    doc.setFontSize(6.0);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105); // Slate semi-bold feel
    const cleanDesig = designation.length > 26 ? designation.slice(0, 24) + '...' : designation;
    const desigLines = doc.splitTextToSize(cleanDesig.toUpperCase(), photoW);
    doc.text(desigLines[0] || 'STAFF MEMBER', photoX, currentY);
    if (desigLines[1]) {
        currentY += 3;
        doc.text(desigLines[1], photoX, currentY);
    }

    currentY += 4.2;

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
        doc.text(`${f.label}`, photoX, currentY);
        doc.text(`:`, photoX + 8, currentY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60);
        const valTrunc = doc.splitTextToSize(String(f.value), 22)[0] || '';
        doc.text(valTrunc, photoX + 10, currentY);
        currentY += 2.8;
    });

    // High-Resolution Prominent Barcode
    const bcY = currentY + 1.2;
    const bcH = 5.5;
    drawCode39Barcode(doc, empCode, photoX, bcY, photoW, bcH);

    doc.setFontSize(4.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50);
    doc.text(String(empCode), photoX + (photoW / 2), bcY + bcH + 2.3, { align: "center" });

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

    // Red Stripe on the Left (Matches Back-side Template)
    const backStripeW = 7;
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, backStripeW, cardHeight, 'F');

    // Top-right decorative red squares (Matches Template)
    doc.rect(cardWidth - 6, 0, 6, 3, 'F');
    doc.rect(cardWidth - 3, 3, 3, 3, 'F');

    // Top-Center: Logo in Original Proportion
    const backCenterX = (cardWidth + backStripeW) / 2; // ~30.5mm
    if (logoBase64) {
        try {
            const backLogoW = 15;
            const backLogoH = 7.1;
            doc.addImage(logoBase64, 'PNG', backCenterX - (backLogoW / 2), 4, backLogoW, backLogoH);
        } catch {
            // fallback
        }
    }

    // Title: TERMS & CONDITIONS
    let backY = 15;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 30, 60);
    doc.text("TERMS & CONDITIONS", backCenterX, backY, { align: "center" });

    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.4);
    doc.line(backStripeW + 3, backY + 1.5, cardWidth - 3, backY + 1.5);
    backY += 4.5;

    // Terms Text (Official company badge rules)
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
