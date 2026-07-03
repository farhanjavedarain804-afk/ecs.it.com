import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { loadLogoForPDF } from "./logoLoader";

export const generatePDF = async (type: 'welcome_note' | 'complaint_receipt' | 'employee_letter' | 'invoice' | 'salary_slip', data: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Force white background — prevents dark-mode CSS bleeding into PDF
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    // Load logo with white background compositing (prevents black on transparent PNG)
    const logoBase64 = await loadLogoForPDF('/LOGO.png');


    const addLogo = (x: number, y: number, w: number, h: number) => {
        if (logoBase64) {
            try { doc.addImage(logoBase64, 'PNG', x, y, w, h); } catch { /* fallback silently */ }
        }
    };

    // 1. Fetch Company Settings with Fallbacks
    let settings = {
        company_name: 'Electric Complaint Solutions',
        company_address: '1st Floor, Zain Plaza, Islamabad',
        company_phone: '+92 310 1111 327',
        company_email: 'ecs.isbpak@gmail.com',
        bank_name: 'Habib Bank Limited',
        account_title: 'ECS (PVT) Ltd',
        iban: '0050417901614255',
        tax_id: '3220139033321',
        terms_and_conditions: 'Payment is due within 7 days. Thank you for your business.'
    };

    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/company_settings`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data) settings = { ...settings, ...data };
        }
    } catch (err) {
        console.error("Error fetching company settings:", err);
    }

    // 2. Add Branding (Skip for invoice as it has a custom header)
    if (type !== 'invoice' && type !== 'salary_slip') {
        addLogo(20, 10, 45, 18);

        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138); // Deep Blue
        doc.text("ELECTRIC COMPLAINT SOLUTIONS", 60, 25);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Your satisfaction is our responsibility", 60, 32);

        // 3. Document Title
        doc.setFontSize(16);
        doc.setTextColor(0);
        const title = type.replace('_', ' ').toUpperCase();
        doc.text(title, pageWidth / 2, 40, { align: "center" });

        // 4. Verification ID & QR Code
        const vId = data.verification_id || "ECS-VERIFY-000";
        doc.setFontSize(9);
        doc.text(`VERIFICATION ID: ${vId}`, 20, 50);

        try {
            const qrData = `${window.location.origin}/verify?id=${vId}`;
            const qrCodeUrl = await QRCode.toDataURL(qrData);
            doc.addImage(qrCodeUrl, 'PNG', pageWidth - 40, 35, 20, 20);
        } catch (err) {
            console.error("QR Generation failed", err);
        }

        doc.setLineWidth(0.5);
        doc.line(20, 60, pageWidth - 20, 60);
    }

    // 5. Content based on type
    doc.setFontSize(11);
    let y = 75;

    if (type === 'welcome_note') {
        doc.text(`Welcome, ${data.name}!`, 20, y);
        y += 10;
        doc.text(`Customer ID: ${data.customer_id}`, 20, y);
        y += 10;
        doc.text(`Phone: ${data.phone}`, 20, y);
        y += 10;
        const city = data.city || data.branches?.city || '';
        const address = data.address || '';
        const fullAddress = city ? `${address}${address ? ', ' : ''}${city}` : address;
        doc.text(`Address: ${fullAddress || 'N/A'}`, 20, y);
        y += 20;
        doc.text("Thank you for choosing ECS. We are committed to providing you with the best service.", 20, y);
    }
    else if (type === 'complaint_receipt') {
        doc.text(`Complaint Number: ${data.complaint_number}`, 20, y);
        y += 10;
        doc.text(`Date & Time: ${new Date(data.created_at).toLocaleString()}`, 20, y);
        y += 10;
        doc.text(`Customer: ${data.customer_name}`, 20, y);
        y += 10;
        const city = data.customer_city || data.branches?.city || '';
        doc.text(`City: ${city || '—'}`, 20, y);
        y += 10;
        doc.text(`Branch: ${data.branch_name}`, 20, y);
        y += 10;
        doc.text(`Type: ${data.complaint_type}`, 20, y);
        y += 10;
        doc.text(`Warranty: ${data.warranty_type === 'warranty' ? 'Yes' : 'No'}`, 20, y);
        y += 10;
        doc.text(`Resolution Time: ${data.resolution_time || '48 Hours'}`, 20, y);
        y += 15;
        doc.text(`Description:`, 20, y); y += 6;
        doc.text(`${data.description}`, 20, y, { maxWidth: pageWidth - 40 });
    }
    else if (type === 'employee_letter') {
        // Header with Official Logo
        addLogo(20, 10, 25, 25);

        doc.setTextColor("#1e3a8a");
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("ELECTRIC COMPLAINT SOLUTIONS", 70, 30);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("RELIABLE, EFFICIENT, PROFESSIONAL", 70, 38);

        y = 65;
        doc.setTextColor(0);
        doc.setFontSize(11);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 20, y, { align: "right" });
        y += 15;

        doc.setFont("helvetica", "bold");
        doc.text(`Subject: Welcome to ECS – Electric Complaint Solutions`, 20, y);
        y += 15;

        doc.setFont("helvetica", "normal");
        doc.text(`Dear ${data.full_name},`, 20, y);
        y += 10;

        const introText = `We are pleased to welcome you to ECS (Electric Complaint Solutions) as our new ${data.designation || 'Team Member'}. On behalf of the entire team, we congratulate you and look forward to working with you.`;
        const lines = doc.splitTextToSize(introText, pageWidth - 40);
        doc.text(lines, 20, y);
        y += (lines.length * 5.5); // Tightened line height

        const missionText = `ECS is committed to providing reliable, efficient, and professional electric complaint handling and technical support services. We believe that your skills, experience, and dedication will contribute significantly to our mission of delivering high-quality solutions to our clients.`;
        const missionLines = doc.splitTextToSize(missionText, pageWidth - 40);
        doc.text(missionLines, 20, y);
        y += (missionLines.length * 5.5) + 3; // Minimal paragraph break


        doc.text(`Your joining date is `, 20, y);
        doc.setFont("helvetica", "bold");
        doc.text(`${data.joining_date}`, 55, y);
        doc.setFont("helvetica", "normal");
        doc.text(`, and you will be reporting to `, 85, y);
        doc.setFont("helvetica", "bold");
        doc.text(`${data.reporting_to || 'the Manager'}`, 140, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.text(`Please report at `, 20, y);
        doc.setFont("helvetica", "bold");
        doc.text(`${data.branches?.address || data.branches?.name || 'the Office'}`, 52, y);
        doc.setFont("helvetica", "normal");
        doc.text(` by `, 140, y);

        y += 6;
        doc.setFont("helvetica", "bold");
        doc.text(`${data.reporting_time || '09:00 AM'}`, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(` on your first day.`, 42, y);
        y += 10;

        doc.setFont("helvetica", "bold");
        doc.text("As part of our team, you are expected to:", 20, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        const expectations = [
            "• Maintain professionalism and integrity.",
            "• Follow company policies and safety standards.",
            "• Provide excellent service to clients.",
            "• Work collaboratively with your team members."
        ];
        expectations.forEach(exp => {
            doc.text(exp, 25, y);
            y += 6;
        });

        y += 3; // Tightened
        const rewardText = "We are confident that you will find your new role both challenging and rewarding. Our team will support you during your onboarding process to ensure a smooth transition.";
        const rewardLines = doc.splitTextToSize(rewardText, pageWidth - 40);
        doc.text(rewardLines, 20, y);
        y += (rewardLines.length * 5.5) + 6; // Reduced break
 
        doc.text("Welcome aboard!", 20, y);
        y += 10;

        doc.setFont("helvetica", "bold");
        doc.text("Best Regards,", 20, y);
        y += 10;
        doc.text("Human Resources Department", 20, y);
        doc.text("Electric Complaint Solutions (ECS)", 20, y + 5);
    }
    else if (type === 'invoice') {
        const invoiceDate = data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString();
        const dueDate = data.due_date ? new Date(data.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : invoiceDate;
        const items = Array.isArray(data.items) ? data.items : [];
        const subtotal = Number(data.subtotal) || 0;
        const taxRate = Number(data.sales_tax_rate) || 0;
        const taxAmount = Number(data.tax_amount) || 0;
        const shipping = Number(data.shipping_handling) || 0;
        const advance = Number(data.advance_paid) || 0;
        const discount = Number(data.discount_amount) || 0;
        const total = Number(data.total_amount) || 0;

        addLogo(15, 10, 45, 18);

        const vId = data.verification_id || data.id || "ECS-VERIFY-000";
        const qrData = `${window.location.origin}/verify?id=${vId}`;
        try {
            const qrCodeUrl = await QRCode.toDataURL(qrData);
            doc.addImage(qrCodeUrl, 'PNG', pageWidth / 2 - 15, 10, 30, 30);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text("Scan to Verify", pageWidth / 2, 42, { align: "center" });
        } catch (err) {
            console.error("QR Generation failed", err);
        }

        let infoY = 50;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50);

        doc.text(`Digital Verification ID:`, 15, infoY);
        doc.setFont("helvetica", "normal");
        doc.text(String(vId), 55, infoY);
        infoY += 5;

        if (data.branch_name) {
            doc.setFont("helvetica", "bold");
            doc.text(`Branch Name:`, 15, infoY);
            doc.setFont("helvetica", "normal");
            doc.text(String(data.branch_name), 55, infoY);
            infoY += 5;

            doc.setFont("helvetica", "bold");
            doc.text(`Branch Code:`, 15, infoY);
            doc.setFont("helvetica", "normal");
            doc.text(String(data.branch_code || "N/A"), 55, infoY);
            infoY += 5;

            doc.setFont("helvetica", "bold");
            doc.text(`Address:`, 15, infoY);
            doc.setFont("helvetica", "normal");
            doc.text(String(data.branch_address || "N/A"), 55, infoY, { maxWidth: 50 });
        }

        doc.setFontSize(32);
        doc.setFont("helvetica", "bold");
        doc.setTextColor("#1e3a8a");
        doc.text("INVOICE", pageWidth - 15, 25, { align: "right" });

        let gridY = 45;
        const gridValueX = pageWidth - 15;
        const metadata = [
            { label: "Date:", value: invoiceDate },
            { label: "Invoice #:", value: data.invoice_number || "Draft" },
            { label: "Complaint #:", value: data.complaints?.complaint_number || data.complaint_number || "Direct Billing" },
            { label: "Due Date:", value: dueDate }
        ];

        doc.setFontSize(9);
        metadata.forEach(m => {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100);
            doc.text(m.label, pageWidth - 80, gridY);
            doc.setTextColor(0);
            doc.text(String(m.value), gridValueX, gridY, { align: "right" });
            gridY += 6;
        });

        y = 85;
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.5);
        doc.line(15, y, pageWidth - 15, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor("#1e3a8a");
        doc.text("BILL TO:", 15, y);
        doc.text("PAYMENT DETAILS:", pageWidth / 2 + 10, y);

        y += 6;
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(String(data.customer_name || 'Valued Customer'), 15, y);
        doc.text(`Bank: ${settings.bank_name}`, pageWidth / 2 + 10, y);

        y += 5;
        const address = String(data.customers?.address || data.address || '');
        const city = data.customers?.city || data.branches?.city || '';
        const fullAddress = city ? `${address}${address ? ', ' : ''}${city}` : address;
        const addrLines = doc.splitTextToSize(fullAddress, 80);
        doc.text(addrLines[0] || '', 15, y);
        doc.text(`A/C Title: ${settings.account_title}`, pageWidth / 2 + 10, y);

        y += 5;
        doc.text(addrLines[1] || '', 15, y);
        doc.text(`Account/IBAN: ${settings.iban}`, pageWidth / 2 + 10, y);

        y += 5;
        doc.text(`Ph: ${data.customers?.phone || data.phone || 'N/A'}`, 15, y);
        doc.text(`NTN: ${settings.tax_id}`, pageWidth / 2 + 10, y);

        y = 120;
        doc.setFillColor("#1e3a8a");
        doc.rect(15, y, pageWidth - 30, 8, 'F');
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
        doc.text("Service / Product Description", 18, y + 5.5);
        doc.text("Qty", pageWidth - 75, y + 5.5, { align: "center" });
        doc.text("Price", pageWidth - 45, y + 5.5, { align: "right" });
        doc.text("Total", pageWidth - 18, y + 5.5, { align: "right" });

        y += 8;
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");

        const rowHeight = 7;
        items.forEach((item: any, i: number) => {
            if (i % 2 === 0) {
                doc.setFillColor(245, 247, 250);
                doc.rect(15, y, pageWidth - 30, rowHeight, 'F');
            }
            doc.text(String(item.description), 18, y + 5);
            doc.text(String(item.qty), pageWidth - 75, y + 5, { align: "center" });
            doc.text(Number(item.unitPrice).toLocaleString(), pageWidth - 45, y + 5, { align: "right" });
            doc.text((item.qty * item.unitPrice).toLocaleString(), pageWidth - 18, y + 5, { align: "right" });
            y += rowHeight;
        });

        const minRows = 8;
        for (let i = items.length; i < minRows; i++) {
            if (i % 2 === 0) {
                doc.setFillColor(245, 247, 250);
                doc.rect(15, y, pageWidth - 30, rowHeight, 'F');
            }
            y += rowHeight;
        }

        doc.line(15, 120, 15, y);
        doc.line(pageWidth - 15, 120, pageWidth - 15, y);
        doc.line(15, y, pageWidth - 15, y);

        y += 10;
        const totalsX = pageWidth - 65;
        const drawTotalRow = (label: string, value: string, isBold = false) => {
            doc.setFont("helvetica", isBold ? "bold" : "normal");
            if (isBold) {
                doc.setTextColor("#1e3a8a");
            } else {
                doc.setTextColor(80);
            }
            doc.text(label, totalsX - 5, y + 4.5, { align: "right" });
            doc.rect(totalsX, y, pageWidth - 15 - totalsX, 7);
            doc.setTextColor(0);
            doc.text("Rs.", totalsX + 2, y + 5);
            doc.text(value, pageWidth - 18, y + 5, { align: "right" });
            y += 7;
        };

        drawTotalRow("Subtotal", subtotal.toLocaleString());
        drawTotalRow(`Sales Tax (${taxRate}%)`, taxAmount.toLocaleString());
        if (shipping > 0) drawTotalRow("S&H Charges", shipping.toLocaleString());
        if (discount > 0) drawTotalRow("Discount", `-${discount.toLocaleString()}`);
        if (advance > 0) drawTotalRow("Advance Paid", `-${advance.toLocaleString()}`);
        drawTotalRow("NET PAYABLE", total.toLocaleString(), true);

        y = doc.internal.pageSize.getHeight() - 60;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor("#1e3a8a");
        doc.text("Terms & Notes:", 15, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text(String(data.notes || settings.terms_and_conditions), 15, y, { maxWidth: pageWidth - 30 });

        y = doc.internal.pageSize.getHeight() - 35;
        doc.setLineWidth(0.1);
        doc.setDrawColor(200);
        doc.line(15, y, pageWidth - 15, y);
        y += 5;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Head Office: 1st Floor, Zain Plaza, Islamabad | Tel: +92 310 1111 327 | Email: ecs.isbpak@gmail.com", pageWidth / 2, y, { align: "center" });

        y += 6;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.setFont("helvetica", "bold");
        doc.text("This Software is Developed by Devionic ( Private ) Limited | +92-317-7121841 | devionic.com", pageWidth / 2, y, { align: "center" });
    }
    else if (type === 'salary_slip') {
        const slipDate = new Date(data.created_at || Date.now()).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        
        const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        };

        // --- 1. Header Section ---
        addLogo(pageWidth - 65, 12, 45, 18);

        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138); // Deep Blue
        doc.setFont("helvetica", "bold");
        doc.text(settings.company_name.toUpperCase(), 20, 22);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(settings.company_address, 20, 27);

        doc.setFontSize(28);
        doc.setTextColor(30);
        doc.setFont("helvetica", "bold");
        doc.text(`PAYSLIP`, 20, 45);
        doc.setFontSize(16);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`${(data.month || '').toUpperCase()} ${data.year}`, 70, 45);

        // --- 2. Employee Info Grid ---
        y = 60;
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(20, y, pageWidth - 20, y);
        y += 5;

        const drawInfoBlock = (label: string, value: string, x: number, yPos: number) => {
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(label.toUpperCase(), x, yPos);
            doc.setFontSize(9);
            doc.setTextColor(30);
            doc.text(String(value || ''), x, yPos + 5);
        };

        const col1 = 20;
        const col2 = 65;
        const col3 = 110;
        const col4 = 155;

        drawInfoBlock("Employee Name", data.staff_name, col1, y + 5);
        drawInfoBlock("Employee ID", data.employee_id, col2, y + 5);
        drawInfoBlock("Designation", data.designation, col3, y + 5);
        drawInfoBlock("Verification ID", data.verification_id || "N/A", col4, y + 5);

        y += 15;
        drawInfoBlock("Date Joined", formatDate(data.joining_date), col1, y);
        drawInfoBlock("Department", data.department || 'Operations', col2, y);
        drawInfoBlock("Branch", data.branch_name || 'Main', col3, y);
        drawInfoBlock("Payment Mode", data.payment_mode || 'Cash/Transfer', col4, y);

        y += 12;
        drawInfoBlock("Slip Number", data.slip_number, col1, y);
        drawInfoBlock("Status", String(data.status).toUpperCase(), col2, y);

        y += 12;
        doc.setDrawColor(220);
        doc.setLineWidth(0.1);
        doc.line(15, y, pageWidth - 15, y);
        y += 8;

        // --- 3. Salary Details Section ---
        doc.setFontSize(11);
        doc.setTextColor(30);
        doc.setFont("helvetica", "bold");
        doc.text("SALARY DETAILS", 20, y);
        y += 3;
        doc.setLineWidth(0.5);
        doc.line(20, y, pageWidth - 20, y);
        y += 8;

        // Two Column Layout for Earnings and Deductions
        const tableTop = y;
        doc.setFontSize(9);
        doc.setTextColor(30);
        doc.text("EARNINGS", 20, y);
        doc.text("DEDUCTIONS", pageWidth / 2 + 10, y);

        y += 6;
        doc.setLineWidth(0.1);
        doc.line(20, y, pageWidth - 20, y);
        y += 8;

        const earnings = [
            { label: "Basic", amount: Number(data.basic_salary) },
            { label: "Allowances", amount: Number(data.allowances) || 0 },
        ];
        const totalEarnings = earnings.reduce((sum, item) => sum + item.amount, 0);

        const deductions = [
            { label: "Manual Deductions", amount: Number(data.deductions) || 0 },
            { label: "Salary Advance", amount: Number(data.advance_deduction) || 0 },
            { label: "Income Tax", amount: 0 },
        ];
        const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);

        let earnY = y;
        earnings.forEach(item => {
            doc.setFont("helvetica", "normal");
            doc.text(item.label, 20, earnY);
            doc.text(item.amount.toLocaleString(), pageWidth / 2 - 5, earnY, { align: "right" });
            earnY += 7;
        });

        let dedY = y;
        deductions.forEach(item => {
            doc.setFont("helvetica", "normal");
            doc.text(item.label, pageWidth / 2 + 10, dedY);
            doc.text(item.amount.toLocaleString(), pageWidth - 20, dedY, { align: "right" });
            dedY += 7;
        });

        y = Math.max(earnY, dedY) + 5;
        doc.setFillColor(245, 247, 250);
        doc.rect(20, y, pageWidth - 40, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.text("Total Earnings (A)", 23, y + 5.5);
        doc.text(totalEarnings.toLocaleString(), pageWidth / 2 - 5, y + 5.5, { align: "right" });

        doc.text("Total Deductions (B)", pageWidth / 2 + 13, y + 5.5);
        doc.text(totalDeductions.toLocaleString(), pageWidth - 23, y + 5.5, { align: "right" });

        y += 15;

        // --- 4. Net Salary Section ---
        doc.setFillColor(30, 58, 138); // Deep Blue
        doc.rect(20, y, pageWidth - 40, 15, 'F');
        doc.setTextColor(255);
        doc.setFontSize(12);
        doc.text(`Net Salary Payable ( A - B )`, 25, y + 9);
        doc.setFontSize(14);
        doc.text(`Rs. ${Number(data.net_salary).toLocaleString()}`, pageWidth - 25, y + 9, { align: "right" });

        y += 20;
        doc.setTextColor(80);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(`**Note: All amounts displayed in this payslip are in PKR`, 20, y);

        // --- 5. QR & Verification ID (Bottom) ---
        y += 15;
        const vId = data.verification_id || "ECS-REF-00000000";
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(`Verification ID: ${vId}`, 20, y);

        try {
            const qrData = `${window.location.origin}/verify?id=${vId}`;
            const qrCodeUrl = await QRCode.toDataURL(qrData);
            doc.addImage(qrCodeUrl, 'PNG', pageWidth - 45, y - 10, 20, 20);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text("Scan to Verify Originality", pageWidth - 35, y + 13, { align: "center" });
        } catch (err) {
            console.error("QR Generation failed", err);
        }

        y += 10;
        doc.setDrawColor(240);
        doc.setFillColor(252, 252, 253);
        doc.rect(20, y, pageWidth - 40, 20, 'F');
        doc.setDrawColor(220);
        doc.rect(20, y, pageWidth - 40, 20, 'S');
        
        doc.setTextColor(30);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("ADMIN NOTES / ADJUSTMENT DETAILS:", 24, y + 7);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.setFontSize(8);
        doc.text(String(data.notes || 'No administrative adjustment notes were recorded for this period.'), 19, y + 13, { maxWidth: pageWidth - 38 });

        y += 15;

        // --- 6. Signatures ---
        y += 25;
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        
        // Administrator Signature
        doc.line(15, y, 70, y);
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.text("Administrator Signature", 42.5, y + 5, { align: "center" });

        // Thumb Impression Box
        const boxSize = 15;
        const boxX = (pageWidth - boxSize) / 2;
        doc.setDrawColor(200);
        doc.rect(boxX, y - 10, boxSize, boxSize, 'S');
        doc.setFontSize(7);
        doc.text("Thumb Impression", boxX + (boxSize/2), y + 5, { align: "center" });

        // Employee Signature 
        doc.line(pageWidth - 70, y, pageWidth - 15, y);
        doc.setFontSize(8);
        doc.text("Employee Signature", pageWidth - 42.5, y + 5, { align: "center" });

        y += 15;
        doc.setTextColor(100);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        // Consolidated Footer - 4 Lines without empty gaps
        y = doc.internal.pageSize.getHeight() - 25;
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Head Office: 1st Floor, Zain Plaza, Islamabad | Tel: +92 310 1111 327 | Email: ecs.isbpak@gmail.com", pageWidth / 2, y, { align: "center" });
        
        y += 4.5;
        doc.setTextColor(100);
        doc.setFont("helvetica", "bold");
        doc.text("This Software is Developed by Devionic ( Private ) Limited | +92-317-7121841 | devionic.com", pageWidth / 2, y, { align: "center" });
        
        y += 4.5;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        const genDate = new Date();
        const genDateStr = `${String(genDate.getDate()).padStart(2, '0')}-${String(genDate.getMonth() + 1).padStart(2, '0')}-${genDate.getFullYear()}`;
        doc.text(`Document Reference: ${data.id || 'N/A'} | Generated on ${genDateStr}`, pageWidth / 2, y, { align: "center" });
        
        y += 4;
        doc.text("This is a system generated salary slip and does not require signature", pageWidth / 2, y, { align: "center" });
    }

    if (type !== 'salary_slip') {
        const genDate = new Date();
        const genDateStr = `${String(genDate.getDate()).padStart(2, '0')}-${String(genDate.getMonth() + 1).padStart(2, '0')}-${genDate.getFullYear()}`;
        doc.setFontSize(7);
        doc.setTextColor(180);
        doc.text(`Document Reference: ${data.id || 'N/A'} | Generated on ${genDateStr}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }

    doc.save(`${type}_${data.invoice_number || data.complaint_number || data.slip_number || data.id || 'doc'}.pdf`);
};

export const generatePaymentsReport = async (history: any[], title: string = "Payments History Report") => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Force white background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');
    
    // Header
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ECS PAYMENTS HUB", margin, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${title} | ${new Date().toLocaleDateString()}`, margin, 28);

    let y = 50;

    // Table Header
    doc.setFillColor(240, 244, 248);
    doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.text("DATE", margin + 2, y + 6.5);
    doc.text("TYPE", margin + 25, y + 6.5);
    doc.text("FROM", margin + 55, y + 6.5);
    doc.text("TO", margin + 95, y + 6.5);
    doc.text("DESCRIPTION", margin + 130, y + 6.5);
    doc.text("AMOUNT (PKR)", pageWidth - margin - 2, y + 6.5, { align: "right" });

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);

    history.forEach((row, i) => {
        if (y > 270) {
            doc.addPage();
            // Force white background on new page
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, 297, 'F');
            y = 20;
            // Redraw header on new page if needed
        }

        if (i % 2 === 0) {
            doc.setFillColor(252, 252, 253);
            doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
        }

        const dateStr = new Date(row.created_at).toLocaleDateString();
        const typeStr = row.transfer_type || 'Manual';
        const fromStr = row.from_branch_name || 'Head Office';
        const toStr = row.to_branch_name || 'Head Office';
        const amountStr = Number(row.amount).toLocaleString();

        doc.text(dateStr, margin + 2, y + 6.5);
        doc.text(typeStr, margin + 25, y + 6.5);
        doc.text(fromStr, margin + 55, y + 6.5);
        doc.text(toStr, margin + 95, y + 6.5);
        doc.text(row.description || '-', margin + 130, y + 6.5, { maxWidth: 35 });
        doc.text(amountStr, pageWidth - margin - 2, y + 6.5, { align: "right" });

        y += 10;
    });

    // Total Summary
    const total = history.reduce((sum, r) => sum + Number(r.amount), 0);
    y += 5;
    doc.setDrawColor(30, 58, 138);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL DISBURSED:", pageWidth - margin - 50, y, { align: "right" });
    doc.text(`Rs. ${total.toLocaleString()}`, pageWidth - margin - 2, y, { align: "right" });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("This is an official system generated payments report | Electric Complaint Solutions", pageWidth / 2, footerY, { align: "center" });

    doc.save(`Payments_Report_${new Date().getTime()}.pdf`);
};

export const generateDetailedReport = async (stats: any) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Force white background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');
    
    // Header
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ECS INTELLIGENCE HUB", margin, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Official Performance & Feedback Report | ${new Date().toLocaleDateString()}`, margin, 28);

    let y = 55;

    // KPI Cards Section
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Strategic KPIs", margin, y);
    y += 10;

    const cards = [
        { label: "Rev Ratio", value: `${stats.complaints.ratio.toFixed(1)}%` },
        { label: "Net Profit", value: `Rs. ${stats.financials.netProfit.toLocaleString()}` },
        { label: "Satisfaction", value: `${stats.satisfaction?.avg || "0.0"} / 5.0` },
        { label: "Reviews", value: String(stats.satisfaction?.total || 0) }
    ];

    const cardWidth = (pageWidth - (margin * 2) - 15) / 4;
    cards.forEach((card, i) => {
        const x = margin + (i * (cardWidth + 5));
        doc.setDrawColor(230);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardWidth, 25, 3, 3, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(card.label.toUpperCase(), x + 5, y + 8);
        doc.setFontSize(11);
        doc.setTextColor(30, 58, 138);
        doc.setFont("helvetica", "bold");
        doc.text(card.value, x + 5, y + 18);
    });

    y += 40;

    // Branch Performance Table
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Branch Performance Metrics", margin, y);
    y += 10;

    // Table Header
    doc.setFillColor(240, 244, 248);
    doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("BRANCH NAME", margin + 5, y + 6.5);
    doc.text("RESOLVED", margin + 60, y + 6.5);
    doc.text("PROFIT", margin + 90, y + 6.5);
    doc.text("RATING", margin + 130, y + 6.5);
    doc.text("INDEX", margin + 155, y + 6.5);

    y += 10;
    stats.branches.forEach((b: any, i: number) => {
        if (i % 2 === 0) {
            doc.setFillColor(252, 252, 253);
            doc.rect(margin, y, pageWidth - (margin * 2), 12, 'F');
        }
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(b.name, margin + 5, y + 7.5);
        doc.setFont("helvetica", "normal");
        doc.text(`${b.resolvedCount}/${b.complaintsCount}`, margin + 60, y + 7.5);
        doc.text(`Rs. ${b.profit.toLocaleString()}`, margin + 90, y + 7.5);
        
        // Rating Stars placeholder text
        doc.text(`${b.avgRating || "0.0"}`, margin + 130, y + 7.5);

        // Progress Bar for Index
        const barW = 25;
        const progress = Math.max(0, b.avgRating || 0) / 5;
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin + 155, y + 4.5, barW, 4);
        doc.setFillColor(b.avgRating > 4 ? 16 : 220, b.avgRating > 4 ? 185 : 38, b.avgRating > 4 ? 129 : 38); // Green or Red
        doc.rect(margin + 155, y + 4.5, barW * progress, 4, 'F');

        y += 12;
    });

    y += 15;

    // Financial Mix Visuals
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Financial Mix Analysis", margin, y);
    y += 10;

    const finData = [
        { label: "Collection Integrity", value: stats.financials.collectedInv, color: [16, 185, 129] }, // Green
        { label: "Salaries / Payroll", value: stats.financials.salaries, color: [239, 68, 68] }, // Red
        { label: "Operational Exp", value: stats.financials.otherExpenses, color: [249, 115, 22] } // Orange
    ];

    const totalFin = finData.reduce((s, f) => s + f.value, 0);
    finData.forEach(f => {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(f.label, margin, y + 5);
        doc.setTextColor(0);
        doc.text(`Rs. ${f.value.toLocaleString()}`, pageWidth - margin - 30, y + 5, { align: "right" });
        
        const barWidth = pageWidth - (margin * 2) - 80;
        doc.setDrawColor(241, 245, 249);
        doc.rect(margin + 40, y + 2, barWidth, 4);
        doc.setFillColor(f.color[0], f.color[1], f.color[2]);
        doc.rect(margin + 40, y + 2, barWidth * (f.value / (totalFin || 1)), 4, 'F');
        y += 10;
    });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("CONFIDENTIAL: This report is for internal ECS management use only.", pageWidth / 2, footerY, { align: "center" });
    doc.text(`Generated by ECS Software Engine v2.0 | Reference: ${Date.now()}`, pageWidth / 2, footerY + 5, { align: "center" });

    doc.save(`ECS_Annual_Report_${new Date().getFullYear()}.pdf`);
};

export const exportTableToPDF = async (title: string, headers: string[], rows: any[][], filename: string) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 45;

    // Force white background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Load logo with white background compositing (prevents black on transparent PNG)
    const logoBase64 = await loadLogoForPDF('/LOGO.png');


    let settings = { company_name: 'Electric Complaint Solutions' };
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/company_settings`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data) settings = { ...settings, ...data };
        }
    } catch (err) {
        console.error("Error fetching company settings:", err);
    }

    const drawHeader = (pageNum: number) => {
        if (logoBase64) {
            try { doc.addImage(logoBase64, 'PNG', margin, 10, 20, 20); } catch { /* ignore */ }
        }

        doc.setFontSize(18);
        doc.setTextColor(30, 58, 138); // ECS Blue
        doc.setFont("helvetica", "bold");
        doc.text(settings.company_name?.toUpperCase() || "ELECTRIC COMPLAINT SOLUTIONS", 40, 18);

        doc.setFontSize(10);
        doc.setTextColor("#1e3a8a");
        doc.setFont("helvetica", "normal");
        doc.text(title.toUpperCase(), 40, 25);

        doc.setFontSize(8);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - margin, 15, { align: "right" });
        doc.text(`Page: ${pageNum}`, pageWidth - margin, 20, { align: "right" });

        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.5);
        doc.line(margin, 32, pageWidth - margin, 32);

        // Header Style (Blue background, White text)
        doc.setFillColor(30, 58, 138);
        doc.rect(margin, 35, pageWidth - (margin * 2), 12, 'F');
        doc.setTextColor(255);
        doc.setFontSize(11); // Larger for visibility
        doc.setFont("helvetica", "bold");

        const colWidth = (pageWidth - (margin * 2)) / headers.length;
        headers.forEach((h, i) => {
            const x = margin + (i * colWidth) + (colWidth / 2);
            // Center horizontally and vertically within the 12mm rect
            doc.text(String(h).toUpperCase(), x, 42.5, { align: "center" });
            
            // Header vertical separators
            doc.setDrawColor(255, 255, 255, 0.4);
            doc.setLineWidth(0.1);
            doc.line(margin + (i * colWidth), 35, margin + (i * colWidth), 47);
        });
        doc.line(pageWidth - margin, 35, pageWidth - margin, 47);
    };

    let currentPage = 1;
    drawHeader(currentPage);

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const rowHeight = 11; // Increased for better padding
    const colWidth = (pageWidth - (margin * 2)) / headers.length;
    y = 56; // Adjusted y-start

    rows.forEach((row, rowIndex) => {
        if (y + rowHeight > pageHeight - margin) {
            doc.addPage('a4', 'l');
            // Force white background on new page
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            currentPage++;
            y = 56;
            drawHeader(currentPage);
            doc.setTextColor(0);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
        }

        // Alternating row highlighting
        if (rowIndex % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 7, pageWidth - (margin * 2), rowHeight, 'F');
        }

        row.forEach((cell, cellIndex) => {
            const text = String(cell || "");
            let truncatedText = text;
            const maxW = colWidth - 4;
            
            if (doc.getTextWidth(text) > maxW) {
                while (truncatedText.length > 0 && doc.getTextWidth(truncatedText + "...") > maxW) {
                    truncatedText = truncatedText.slice(0, -1);
                }
                truncatedText += "...";
            }
            const x = margin + (cellIndex * colWidth) + (colWidth / 2);
            // Vertical centering in row height
            doc.text(truncatedText, x, y - 0.5, { align: "center" });

            // Row vertical separators
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.1);
            doc.line(margin + (cellIndex * colWidth), y - 7, margin + (cellIndex * colWidth), y + (rowHeight - 7));
        });
        doc.line(pageWidth - margin, y - 7, pageWidth - margin, y + (rowHeight - 7));

        // Row horizontal separator
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + (rowHeight - 7), pageWidth - margin, y + (rowHeight - 7));

        y += rowHeight;
    });

    const finalY = pageHeight - 10;
    doc.setFontSize(7);
    doc.setTextColor(180);
    doc.text("System Generated Report | Electric Complaint Solutions (ECS) | Developed by Devionic", pageWidth / 2, finalY, { align: "center" });

    doc.save(`${filename}_${new Date().getTime()}.pdf`);
};
