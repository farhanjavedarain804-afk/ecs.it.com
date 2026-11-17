import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { loadLogoForPDF } from "./logoLoader";

export const generatePDF = async (type: 'welcome_note' | 'complaint_receipt' | 'employee_letter' | 'invoice' | 'salary_slip' | 'employee_record', data: any) => {
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
            if (data) {
                const comp = Array.isArray(data) ? data[0] : data;
                if (comp) settings = { ...settings, ...comp };
            }
        }
    } catch (err) {
        console.error("Error fetching company settings:", err);
    }

    // 2. Add Branding (Skip for invoice as it has a custom header)
    if (type !== 'invoice' && type !== 'salary_slip' && type !== 'complaint_receipt' && type !== 'employee_record') {
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
        // --- 1. HEADER SECTION ---
        // Left Side: Company Official Logo
        addLogo(15, 10, 42, 17);

        // Center: Company Name & Subtitle
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138); // Deep Navy Blue #1e3a8a
        doc.text((settings.company_name || "ELECTRIC COMPLAINT SOLUTIONS").toUpperCase(), pageWidth / 2, 18, { align: "center" });

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(110);
        doc.text("Your Satisfaction is Our Responsibility | Technical Service Acknowledgment", pageWidth / 2, 23, { align: "center" });

        // Center: COMPLAINT RECEIPT banner
        doc.setFillColor(30, 58, 138);
        doc.roundedRect(pageWidth / 2 - 38, 26, 76, 7.5, 2, 2, 'F');
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("COMPLAINT RECEIPT", pageWidth / 2, 31.2, { align: "center" });

        // Right Side: Dynamic QR Code with Verification Link
        const vId = data.verification_id || data.complaint_number || "ECS-VERIFY-000";
        const qrData = `${window.location.origin}/verify?id=${vId}`;
        try {
            const qrCodeUrl = await QRCode.toDataURL(qrData);
            doc.addImage(qrCodeUrl, 'PNG', pageWidth - 42, 10, 27, 27);
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(120);
            doc.text("Scan to Verify", pageWidth - 28.5, 39, { align: "center" });
        } catch (err) {
            console.error("QR Generation failed", err);
        }

        // Header Accent Divider Line
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.7);
        doc.line(15, 43, pageWidth - 15, 43);

        // --- 2. COMPLAINT SUMMARY BAR ---
        const bannerY = 47;
        doc.setFillColor(245, 248, 252);
        doc.roundedRect(15, bannerY, pageWidth - 30, 14, 2, 2, 'F');
        doc.setDrawColor(215, 225, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, bannerY, pageWidth - 30, 14, 2, 2, 'S');

        // Column 1: Complaint Number
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("COMPLAINT NUMBER", 20, bannerY + 5);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text(String(data.complaint_number || 'N/A'), 20, bannerY + 10.5);

        // Column 2: Date & Time
        const complaintDate = data.created_at ? new Date(data.created_at).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
        }) : new Date().toLocaleString();
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("DATE & TIME", 80, bannerY + 5);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30);
        doc.text(complaintDate, 80, bannerY + 10.5);

        // Column 3: Status
        const statusText = (data.status || 'Registered').replace(/_/g, ' ').toUpperCase();
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("STATUS", 135, bannerY + 5);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        if (data.status === 'solved' || data.status === 'completed') {
            doc.setTextColor(16, 120, 72);
        } else if (data.status === 'in_progress') {
            doc.setTextColor(180, 83, 9);
        } else {
            doc.setTextColor(30, 58, 138);
        }
        doc.text(statusText, 135, bannerY + 10.5);

        // Column 4: Verification ID
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("VERIFICATION ID", pageWidth - 20, bannerY + 5, { align: "right" });
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(String(vId), pageWidth - 20, bannerY + 10.5, { align: "right" });

        // --- 3. TWO-COLUMN DETAILS CARDS ---
        const cardsY = 66;
        const colWidth = (pageWidth - 30 - 6) / 2; // 87 mm each
        const leftColX = 15;
        const rightColX = 15 + colWidth + 6;
        const cardHeight = 63;

        // --- Left Card: Customer Information ---
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(leftColX, cardsY, colWidth, cardHeight, 2, 2, 'F');
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(leftColX, cardsY, colWidth, cardHeight, 2, 2, 'S');

        // Left Card Header
        doc.setFillColor(30, 58, 138);
        doc.roundedRect(leftColX, cardsY, colWidth, 7, 2, 2, 'F');
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("CUSTOMER INFORMATION", leftColX + 5, cardsY + 5);

        let cY = cardsY + 13;
        const renderField = (label: string, value: string, xPos: number, currentY: number, maxW: number = 55) => {
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100);
            doc.text(label, xPos + 5, currentY);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(20);
            const truncated = doc.splitTextToSize(String(value || 'N/A'), maxW)[0] || 'N/A';
            doc.text(truncated, xPos + 31, currentY);
        };

        const custName = data.customer_name || data.customers?.name || 'Valued Customer';
        const custPhone = data.customer_phone || data.customers?.phone || data.phone || 'N/A';
        const custEmail = data.customer_email || data.customers?.email || data.email || 'N/A';
        const custCity = data.customer_city || data.customers?.city || data.branches?.city || 'N/A';
        const custAddress = data.customer_address || data.customers?.address || data.address || '';
        const fullCustAddr = custAddress ? (custCity && !custAddress.toLowerCase().includes(custCity.toLowerCase()) ? `${custAddress}, ${custCity}` : custAddress) : (custCity || 'N/A');

        renderField("Full Name:", custName, leftColX, cY); cY += 7.5;
        renderField("Phone No:", custPhone, leftColX, cY); cY += 7.5;
        renderField("Email Addr:", custEmail, leftColX, cY); cY += 7.5;
        renderField("City:", custCity, leftColX, cY); cY += 7.5;
        renderField("Address:", fullCustAddr, leftColX, cY, 52); cY += 7.5;
        renderField("Cust ID:", data.customers?.customer_id || data.customer_id || 'N/A', leftColX, cY);

        // --- Right Card: Service & Branch Details ---
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(rightColX, cardsY, colWidth, cardHeight, 2, 2, 'F');
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(rightColX, cardsY, colWidth, cardHeight, 2, 2, 'S');

        // Right Card Header
        doc.setFillColor(30, 58, 138);
        doc.roundedRect(rightColX, cardsY, colWidth, 7, 2, 2, 'F');
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("SERVICE & ASSIGNMENT DETAILS", rightColX + 5, cardsY + 5);

        let sY = cardsY + 13;
        const branchDisplay = data.branch_name || data.branches?.name || 'Main Branch';
        const branchCity = data.branch_city || data.branches?.city || '';
        const fullBranch = branchCity ? `${branchDisplay} (${branchCity})` : branchDisplay;
        const sType = (data.complaint_type || 'repair').toUpperCase();
        const warrantyDisplay = data.warranty_type === 'warranty' ? 'Under Warranty' : 'Non-Warranty / Standard';
        const techName = data.technician_name || data.staff?.full_name || 'Assigned to Branch Team';
        const helperName = data.helper_name || data.helper?.full_name || 'N/A';
        const priorityText = (data.priority || 'medium').toUpperCase();

        renderField("Service Branch:", fullBranch, rightColX, sY, 52); sY += 7.5;
        renderField("Service Type:", sType, rightColX, sY); sY += 7.5;
        renderField("Warranty:", warrantyDisplay, rightColX, sY); sY += 7.5;
        renderField("Serial Number:", String(data.serial_number || 'N/A'), rightColX, sY); sY += 7.5;
        renderField("Priority Level:", priorityText, rightColX, sY); sY += 7.5;
        renderField("Technician:", techName, rightColX, sY); sY += 7.5;
        renderField("Helper / Asst:", helperName, rightColX, sY);

        // --- 4. DESCRIPTION & COMPLAINT DETAILS BOX ---
        const descY = cardsY + cardHeight + 6; // ~135 mm
        const descBoxH = 40;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, descY, pageWidth - 30, descBoxH, 2, 2, 'F');
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, descY, pageWidth - 30, descBoxH, 2, 2, 'S');

        // Header for Description
        doc.setFillColor(245, 248, 252);
        doc.roundedRect(15, descY, pageWidth - 30, 7, 2, 2, 'F');
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("FAULT DESCRIPTION & CUSTOMER REMARKS", 20, descY + 5);

        // Description text
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40);
        const descLines = doc.splitTextToSize(String(data.description || 'No specific fault description provided.'), pageWidth - 40);
        doc.text(descLines.slice(0, 4), 20, descY + 13);

        // Special Notes if present
        if (data.notes) {
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100);
            doc.text("Notes / Remarks:", 20, descY + 32);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(60);
            const notesLines = doc.splitTextToSize(String(data.notes), pageWidth - 70);
            doc.text(notesLines[0] || '', 47, descY + 32);
        }

        // --- 5. AUTHORIZATION & SIGNATURE SECTION ---
        const signY = descY + descBoxH + 8; // ~183 mm
        const signW = (pageWidth - 30 - 25) / 2;

        // Customer Signature Box
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(20, signY + 16, 20 + signW, signY + 16);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80);
        doc.text("Customer Signature & Date", 20 + (signW / 2), signY + 20, { align: "center" });

        // Authorized Officer / Stamp Box
        doc.line(pageWidth - 20 - signW, signY + 16, pageWidth - 20, signY + 16);
        doc.text("Authorized ECS Officer / Branch Stamp", (pageWidth - 20 - signW) + (signW / 2), signY + 20, { align: "center" });

        // --- 6. FOOTER (EXACT SAME AS INVOICE) ---
        let footerY = doc.internal.pageSize.getHeight() - 55;
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor("#1e3a8a");
        doc.text("Terms & Conditions:", 15, footerY);
        footerY += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(80);
        const termsText = "1. Technical inspection will be conducted as per ECS standard quality guidelines. 2. Real-time complaint progress can be tracked anytime by scanning the QR code above or visiting our official portal. 3. Please retain this official receipt for device collection and future warranty reference.";
        doc.text(termsText, 15, footerY, { maxWidth: pageWidth - 30 });

        // Divider Line
        footerY = doc.internal.pageSize.getHeight() - 35;
        doc.setLineWidth(0.1);
        doc.setDrawColor(200);
        doc.line(15, footerY, pageWidth - 15, footerY);
        footerY += 5;

        // Head Office Line
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Head Office: ${settings.company_address || '1st Floor, Zain Plaza, Islamabad'} | Tel: ${settings.company_phone || '+92 310 1111 327'} | Email: ${settings.company_email || 'ecs.isbpak@gmail.com'}`, pageWidth / 2, footerY, { align: "center" });

        // Devionic Attribution Line
        footerY += 6;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.setFont("helvetica", "bold");
        doc.text("This Software is Developed by Devionic ( Private ) Limited | +92-317-7121841 | devionic.com", pageWidth / 2, footerY, { align: "center" });
    }
    else if (type === 'employee_record') {
        // --- 1. HEADER SECTION ---
        // Left Side: Company Official Logo
        addLogo(15, 10, 42, 17);

        // Center: Company Name & Subtitle
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138); // Deep Navy Blue #1e3a8a
        doc.text((settings.company_name || "ELECTRIC COMPLAINT SOLUTIONS").toUpperCase(), pageWidth / 2, 18, { align: "center" });

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(110);
        doc.text("Human Resources Department | Employee Master Profile & Service Record", pageWidth / 2, 23, { align: "center" });

        // Center: Document Title Banner
        doc.setFillColor(30, 58, 138);
        doc.roundedRect(pageWidth / 2 - 45, 26, 90, 7.5, 2, 2, 'F');
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("EMPLOYEE PROFILE & SERVICE RECORD", pageWidth / 2, 31.2, { align: "center" });

        // Right Side: Dynamic QR Code
        const empCode = data.employee_id || data.id || "ECS-STF-000";
        const qrData = `${window.location.origin}/verify?id=${empCode}`;
        try {
            const qrCodeUrl = await QRCode.toDataURL(qrData);
            doc.addImage(qrCodeUrl, 'PNG', pageWidth - 42, 10, 27, 27);
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(120);
            doc.text("Scan to Verify", pageWidth - 28.5, 39, { align: "center" });
        } catch (err) {
            console.error("QR Generation failed", err);
        }

        // Header Accent Divider Line
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.7);
        doc.line(15, 43, pageWidth - 15, 43);

        // --- 2. PRIMARY IDENTIFIER BANNER ---
        const bannerY = 47;
        doc.setFillColor(245, 248, 252);
        doc.roundedRect(15, bannerY, pageWidth - 30, 14, 2, 2, 'F');
        doc.setDrawColor(215, 225, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, bannerY, pageWidth - 30, 14, 2, 2, 'S');

        // Column 1: Employee ID
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("EMPLOYEE ID", 20, bannerY + 5);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text(String(data.employee_id || 'N/A'), 20, bannerY + 10.5);

        // Column 2: Joining Date
        const joinDate = data.joining_date ? new Date(data.joining_date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: '2-digit'
        }) : 'N/A';
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("JOINING DATE", 80, bannerY + 5);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30);
        doc.text(joinDate, 80, bannerY + 10.5);

        // Column 3: Department
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("DEPARTMENT", 135, bannerY + 5);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(String(data.department || 'Operations').toUpperCase(), 135, bannerY + 10.5);

        // Column 4: Status
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("STATUS", pageWidth - 20, bannerY + 5, { align: "right" });
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        if (data.status === 'active') {
            doc.setTextColor(16, 120, 72);
        } else if (data.status === 'terminated') {
            doc.setTextColor(180, 20, 20);
        } else {
            doc.setTextColor(100);
        }
        doc.text(String(data.status || 'Active').toUpperCase(), pageWidth - 20, bannerY + 10.5, { align: "right" });

        // --- 3. TWO-COLUMN PROFILE CARDS ---
        const cardsY = 65;
        const colWidth = (pageWidth - 30 - 6) / 2; // 87 mm each
        const leftColX = 15;
        const rightColX = 15 + colWidth + 6;
        const cardHeight = 68;

        const renderField = (label: string, value: string, xPos: number, currentY: number, maxW: number = 55) => {
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100);
            doc.text(label, xPos + 5, currentY);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(20);
            const truncated = doc.splitTextToSize(String(value || 'N/A'), maxW)[0] || 'N/A';
            doc.text(truncated, xPos + 31, currentY);
        };

        // --- Left Card: Personal & Identity Details ---
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(leftColX, cardsY, colWidth, cardHeight, 2, 2, 'F');
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(leftColX, cardsY, colWidth, cardHeight, 2, 2, 'S');

        doc.setFillColor(30, 58, 138);
        doc.roundedRect(leftColX, cardsY, colWidth, 7, 2, 2, 'F');
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("PERSONAL & IDENTITY DETAILS", leftColX + 5, cardsY + 5);

        let pY = cardsY + 13;
        renderField("Full Name:", data.full_name || 'N/A', leftColX, pY); pY += 6.8;
        renderField("Father Name:", data.father_name || 'N/A', leftColX, pY); pY += 6.8;
        renderField("CNIC Number:", data.cnic || 'N/A', leftColX, pY); pY += 6.8;
        renderField("Date of Birth:", data.dob ? new Date(data.dob).toLocaleDateString() : 'N/A', leftColX, pY); pY += 6.8;
        renderField("Gender:", data.gender || 'Male', leftColX, pY); pY += 6.8;
        renderField("Marital Status:", data.marital_status || 'Single', leftColX, pY); pY += 6.8;
        renderField("Blood Group:", data.blood_group || 'N/A', leftColX, pY); pY += 6.8;
        renderField("Email Address:", data.email || 'N/A', leftColX, pY, 52); pY += 6.8;
        renderField("Contact 1:", data.contact_1 || 'N/A', leftColX, pY);

        // --- Right Card: Job & Payroll Specifications ---
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(rightColX, cardsY, colWidth, cardHeight, 2, 2, 'F');
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(rightColX, cardsY, colWidth, cardHeight, 2, 2, 'S');

        doc.setFillColor(30, 58, 138);
        doc.roundedRect(rightColX, cardsY, colWidth, 7, 2, 2, 'F');
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("JOB, OPERATIONS & PAYROLL", rightColX + 5, cardsY + 5);

        let jY = cardsY + 13;
        const branchTxt = data.branches?.name || data.branch_name || 'Main Office';
        const salaryTxt = data.salary ? `Rs. ${Number(data.salary).toLocaleString()}` : 'Confidential';
        const allowanceTxt = data.allowances ? `Rs. ${Number(data.allowances).toLocaleString()}` : 'N/A';

        renderField("Branch:", branchTxt, rightColX, jY, 52); jY += 6.8;
        renderField("Designation:", data.designation || 'N/A', rightColX, jY); jY += 6.8;
        renderField("Employment:", data.employment_type || 'Full-Time', rightColX, jY); jY += 6.8;
        renderField("Shift Timing:", data.shift_timing || 'Morning', rightColX, jY); jY += 6.8;
        renderField("Supervisor:", data.reporting_manager || 'Branch Manager', rightColX, jY); jY += 6.8;
        renderField("Payment Mode:", data.payment_mode || 'Bank Transfer', rightColX, jY); jY += 6.8;
        renderField("Bank Name:", data.bank_name || 'N/A', rightColX, jY); jY += 6.8;
        renderField("Account/IBAN:", data.account_number || 'N/A', rightColX, jY, 52); jY += 6.8;
        renderField("Basic Salary:", salaryTxt, rightColX, jY);

        // --- 4. ADDRESSES & EMERGENCY CONTACT ROW ---
        const addrY = cardsY + cardHeight + 5; // ~138 mm
        const addrH = 26;

        // Left Box: Addresses
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(leftColX, addrY, colWidth, addrH, 2, 2, 'F');
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(leftColX, addrY, colWidth, addrH, 2, 2, 'S');

        doc.setFillColor(245, 248, 252);
        doc.roundedRect(leftColX, addrY, colWidth, 6, 2, 2, 'F');
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("RESIDENTIAL ADDRESSES", leftColX + 5, addrY + 4.5);

        let adY = addrY + 10;
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("Permanent:", leftColX + 5, adY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30);
        doc.text(doc.splitTextToSize(String(data.address || 'N/A'), colWidth - 28)[0] || 'N/A', leftColX + 26, adY);

        adY += 6.5;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("Current / Temp:", leftColX + 5, adY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30);
        doc.text(doc.splitTextToSize(String(data.current_address || data.address || 'N/A'), colWidth - 32)[0] || 'N/A', leftColX + 30, adY);

        // Right Box: Emergency Contact
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(rightColX, addrY, colWidth, addrH, 2, 2, 'F');
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(rightColX, addrY, colWidth, addrH, 2, 2, 'S');

        doc.setFillColor(245, 248, 252);
        doc.roundedRect(rightColX, addrY, colWidth, 6, 2, 2, 'F');
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("EMERGENCY CONTACT & NEXT OF KIN", rightColX + 5, addrY + 4.5);

        let emY = addrY + 10;
        renderField("Contact Name:", data.emergency_contact_name || 'N/A', rightColX, emY); emY += 6.5;
        renderField("Relationship:", data.emergency_relation || 'N/A', rightColX, emY); emY += 6.5;
        renderField("Emergency Ph:", data.emergency_phone || 'N/A', rightColX, emY);

        // --- 5. DOCUMENTS ON RECORD STRIP ---
        const docStripY = addrY + addrH + 5; // ~169 mm
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, docStripY, pageWidth - 30, 20, 2, 2, 'F');
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, docStripY, pageWidth - 30, 20, 2, 2, 'S');

        doc.setFillColor(245, 248, 252);
        doc.roundedRect(15, docStripY, pageWidth - 30, 6, 2, 2, 'F');
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("VERIFIED DOCUMENTS ON OFFICIAL RECORD (PDF)", 20, docStripY + 4.5);

        const docBoxW = (pageWidth - 30) / 4;
        const docItems = [
            { label: "Profile Photo", status: data.profile_photo ? "On File" : "Pending" },
            { label: "CNIC Document", status: data.doc_cnic ? "Verified (PDF)" : "Pending" },
            { label: "CV / Educational", status: data.doc_resume ? "Verified (PDF)" : "Pending" },
            { label: "Appointment/Contract", status: data.doc_appointment ? "Verified (PDF)" : "Pending" }
        ];

        docItems.forEach((dItem, idx) => {
            const dX = 15 + (idx * docBoxW);
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100);
            doc.text(dItem.label, dX + 5, docStripY + 11);

            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            if (dItem.status.includes("Verified") || dItem.status.includes("On File")) {
                doc.setTextColor(16, 120, 72);
            } else {
                doc.setTextColor(150);
            }
            doc.text(dItem.status, dX + 5, docStripY + 16);
        });

        // --- 6. AUTHORIZATION & SIGNATURE SECTION ---
        const signY = docStripY + 24; // ~198 mm
        const signW = (pageWidth - 30 - 25) / 2;

        // Employee Signature Box
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(20, signY + 16, 20 + signW, signY + 16);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80);
        doc.text("Employee Signature & Declaration", 20 + (signW / 2), signY + 20, { align: "center" });

        // Authorized Officer / Stamp Box
        doc.line(pageWidth - 20 - signW, signY + 16, pageWidth - 20, signY + 16);
        doc.text("Authorized HR Officer / Branch Stamp", (pageWidth - 20 - signW) + (signW / 2), signY + 20, { align: "center" });

        // --- 7. FOOTER (EXACT SAME AS INVOICE & COMPLAINT RECEIPT) ---
        let footerY = doc.internal.pageSize.getHeight() - 55;
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor("#1e3a8a");
        doc.text("Official HR Record & Verification Notice:", 15, footerY);
        footerY += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(80);
        const policyText = "1. This document serves as the official master profile record for Electric Complaint Solutions (ECS) Human Resources. 2. Real-time employee verification can be confirmed anytime by scanning the QR code above. 3. Unauthorized modification or falsification of this document is punishable under company policy and applicable laws.";
        doc.text(policyText, 15, footerY, { maxWidth: pageWidth - 30 });

        // Divider Line
        footerY = doc.internal.pageSize.getHeight() - 35;
        doc.setLineWidth(0.1);
        doc.setDrawColor(200);
        doc.line(15, footerY, pageWidth - 15, footerY);
        footerY += 5;

        // Head Office Line
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Head Office: ${settings.company_address || '1st Floor, Zain Plaza, Islamabad'} | Tel: ${settings.company_phone || '+92 310 1111 327'} | Email: ${settings.company_email || 'ecs.isbpak@gmail.com'}`, pageWidth / 2, footerY, { align: "center" });

        // Devionic Attribution Line
        footerY += 6;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.setFont("helvetica", "bold");
        doc.text("This Software is Developed by Devionic ( Private ) Limited | +92-317-7121841 | devionic.com", pageWidth / 2, footerY, { align: "center" });
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

        // Right Side Title
        doc.setFontSize(30);
        doc.setFont("helvetica", "bold");
        doc.setTextColor("#1e3a8a");
        doc.text("INVOICE", pageWidth - 15, 25, { align: "right" });

        // Two perfectly parallel sections: Left (Verification & Branch) and Right (Invoice & Dates)
        const leftFields = [
            { label: "Digital Verification ID:", value: String(vId) },
            { label: "Branch Name:", value: String(data.branch_name || data.branches?.name || "Main Branch") },
            { label: "Branch Code:", value: String(data.branch_code || data.branches?.branch_code || "N/A") },
            { label: "Address:", value: String(data.branch_address || data.branches?.address || data.branches?.city || "Islamabad") }
        ];

        const rightFields = [
            { label: "Date:", value: String(invoiceDate) },
            { label: "Invoice #:", value: String(data.invoice_number || "Draft") },
            { label: "Complaint #:", value: String(data.complaints?.complaint_number || data.complaint_number || "Direct Billing") },
            { label: "Due Date:", value: String(dueDate) }
        ];

        const parallelY = 44;
        const rowStep = 6.5;
        const rightValueX = pageWidth - 15;

        for (let i = 0; i < 4; i++) {
            const currentY = parallelY + (i * rowStep);

            // Left Side Row
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100);
            doc.text(leftFields[i].label, 15, currentY);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(30);
            const leftVal = doc.splitTextToSize(leftFields[i].value, 46)[0] || '';
            doc.text(leftVal, 56, currentY);

            // Right Side Row (Exact same Y level)
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100);
            doc.text(rightFields[i].label, pageWidth - 80, currentY);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(0);
            doc.text(rightFields[i].value, rightValueX, currentY, { align: "right" });
        }

        y = 75;
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
        const bankAccount = data.bank_account || data.branches?.bank_account || {
            bank_name: settings.bank_name,
            account_title: settings.account_title,
            iban: settings.iban
        };
        doc.text(`Bank: ${bankAccount.bank_name || settings.bank_name}`, pageWidth / 2 + 10, y);

        y += 5;
        const address = String(data.customers?.address || data.address || '');
        const city = data.customers?.city || data.branches?.city || '';
        const fullAddress = city ? `${address}${address ? ', ' : ''}${city}` : address;
        const addrLines = doc.splitTextToSize(fullAddress, 80);
        doc.text(addrLines[0] || '', 15, y);
        doc.text(`A/C Title: ${bankAccount.account_title || settings.account_title}`, pageWidth / 2 + 10, y);

        y += 5;
        doc.text(addrLines[1] || '', 15, y);
        doc.text(`Account/IBAN: ${bankAccount.iban || bankAccount.account_number || settings.iban}`, pageWidth / 2 + 10, y);

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
            const desc = String(item.description || item.name || "Service / Product");
            const rawQty = item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 1);
            const qty = isNaN(Number(rawQty)) || Number(rawQty) <= 0 ? 1 : Number(rawQty);
            const rawPrice = item.unitPrice !== undefined ? item.unitPrice : (item.unit_price !== undefined ? item.unit_price : (item.rate !== undefined ? item.rate : (item.price !== undefined ? item.price : 0)));
            const unitPrice = isNaN(Number(rawPrice)) ? 0 : Number(rawPrice);
            const rawAmount = item.amount !== undefined ? item.amount : (item.total_price !== undefined ? item.total_price : (qty * unitPrice));
            const amount = isNaN(Number(rawAmount)) ? (qty * unitPrice) : Number(rawAmount);

            doc.text(desc, 18, y + 5);
            doc.text(String(qty), pageWidth - 75, y + 5, { align: "center" });
            doc.text(unitPrice.toLocaleString(), pageWidth - 45, y + 5, { align: "right" });
            doc.text(amount.toLocaleString(), pageWidth - 18, y + 5, { align: "right" });
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
        const totalsStartY = y;

        // Position QR Code in the empty space above "Terms & Notes" on the left
        const qrLeftX = 15;
        const qrSize = 25;
        try {
            const qrCodeUrl = await QRCode.toDataURL(qrData);
            doc.addImage(qrCodeUrl, 'PNG', qrLeftX, totalsStartY, qrSize, qrSize);

            // Verification Details beside QR Code
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor("#1e3a8a");
            doc.text("Scan to Verify Invoice", qrLeftX + qrSize + 4, totalsStartY + 6);

            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text("Official Digital Document Verification", qrLeftX + qrSize + 4, totalsStartY + 11.5);

            doc.setFont("helvetica", "bold");
            doc.setTextColor(80);
            doc.text("Verification ID:", qrLeftX + qrSize + 4, totalsStartY + 17);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30);
            doc.text(String(vId), qrLeftX + qrSize + 4, totalsStartY + 21.5);

            doc.setFontSize(6.5);
            doc.setTextColor(120);
            doc.text("Scan using camera to verify authenticity", qrLeftX + qrSize + 4, totalsStartY + 26);
        } catch (err) {
            console.error("QR Generation failed", err);
        }

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
        doc.text(`Head Office: ${settings.company_address || '1st Floor, Zain Plaza, Islamabad'} | Tel: ${settings.company_phone || '+92 310 1111 327'} | Email: ${settings.company_email || 'ecs.isbpak@gmail.com'}`, pageWidth / 2, y, { align: "center" });

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
        doc.text(`Head Office: ${settings.company_address || '1st Floor, Zain Plaza, Islamabad'} | Tel: ${settings.company_phone || '+92 310 1111 327'} | Email: ${settings.company_email || 'ecs.isbpak@gmail.com'}`, pageWidth / 2, y, { align: "center" });
        
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
            if (data) {
                const comp = Array.isArray(data) ? data[0] : data;
                if (comp) settings = { ...settings, ...comp };
            }
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
