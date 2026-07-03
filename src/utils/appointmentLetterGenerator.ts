import { jsPDF } from "jspdf";

export const generateAppointmentLetter = async (data: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // 1. Fetch Company Settings
    let settings = {
        company_name: 'Electric Complaint Solutions',
        company_address: '1st Floor, Zain Plaza, Islamabad',
        company_phone: '+92 310 1111 327',
        company_email: 'ecs.isbpak@gmail.com',
        authorized_signatory: 'Authorized Signatory',
        signatory_designation: 'Human Resources Manager'
    };

    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/company_settings`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("ecs_token")}` }
        });
        if (res.ok) {
            const settingsData = await res.json();
            if (settingsData) settings = { ...settings, ...settingsData };
        }
    } catch (err) {
        console.error("Error fetching company settings:", err);
    }

    // 2. Load Logo
    let logoBase64: string | null = null;
    try {
        const res = await fetch('/LOGO.png');
        const blob = await res.blob();
        logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.warn('Could not load logo:', err);
    }

    const drawHeader = () => {
        if (logoBase64) {
            try { doc.addImage(logoBase64, 'PNG', margin, 10, 40, 20); } catch { /* fallback */ }
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 138); // Deep Blue
        doc.text(settings.company_name, pageWidth - margin, 15, { align: "right" });
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text(settings.company_address, pageWidth - margin, 20, { align: "right" });
        doc.text(`${settings.company_phone} | ${settings.company_email}`, pageWidth - margin, 25, { align: "right" });
    };

    const drawFooter = (pageNum: number, totalPages: number) => {
        const footerY = pageHeight - 15;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Head Office: 1st Floor, Zain Plaza, Islamabad | Tel: +92 310 1111 327 | Email: ecs.isbpak@gmail.com", pageWidth / 2, footerY, { align: "center" });
        doc.setTextColor(100);
        doc.text("This Software is Developed by Devionic ( Private ) Limited | +92-317-7121841 | devionic.com", pageWidth / 2, footerY + 5, { align: "center" });
        doc.setTextColor(150);
        doc.text(`Electric Complaint Solutions (ECS) | System Generated Appointment Letter | ID: ${data.employee_id || data.id || 'N/A'}`, pageWidth / 2, footerY + 10, { align: "center" });
        
        // Page Numbering
        doc.setFontSize(7);
        doc.setTextColor(180);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY + 10, { align: "right" });
    };

    // --- Page 1 ---
    drawHeader();

    let y = 45;
    const today = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
    doc.setFontSize(10);
    doc.setTextColor(0); // Black
    doc.text(`Date: ${today}`, margin, y);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.text("To,", margin, y);
    y += 6;
    doc.text(data.full_name || "Employee Name", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    if (data.cnic) {
        doc.text(`CNIC: ${data.cnic}`, margin, y);
        y += 5;
    }
    const addressLines = doc.splitTextToSize(data.address || "Employee Address", pageWidth / 2);
    doc.text(addressLines, margin, y);
    y += (addressLines.length * 5) + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Subject: Appointment Letter", pageWidth / 2, y, { align: "center" });
    doc.line(pageWidth / 2 - 25, y + 1, pageWidth / 2 + 25, y + 1);
    y += 15;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Dear ${data.full_name || "Employee"},`, margin, y);
    y += 8;

    const introText = `We are pleased to offer you the position of ${data.designation || '[Job Title]'} at ${settings.company_name}. Your skills and experience will be a valuable addition to our organization. Your employment will commence from ${data.joining_date ? new Date(data.joining_date).toLocaleDateString('en-GB') : '[Joining Date]'} under the following terms and conditions:`;
    const introLines = doc.splitTextToSize(introText, pageWidth - (margin * 2));
    doc.text(introLines, margin, y, { lineHeightFactor: 1.4 });
    y += (introLines.length * 6) + 10;

    const points = [
        { title: "1. Position & Duties", content: `You will be employed as ${data.designation || '[Job Title]'} and will report to the department head or assigned supervisor. Your duties and responsibilities will include tasks assigned by management related to your role.` },
        { title: "2. Probation Period", content: "Your employment will be subject to a probation period of 3 months starting from your joining date. During this period, your performance and suitability for the position will be evaluated. The company reserves the right to extend or terminate the probation period if required." },
        { title: "3. Salary & Compensation", content: `Your monthly salary will be ${Number(data.salary || 0).toLocaleString()} PKR, payable on a monthly basis. Any additional allowances, bonuses, or benefits will be provided in accordance with company policies.` },
        { title: "4. Working Hours", content: "Your normal working hours will be 09:00 AM – 09:00 PM, 6 days a week. The company may require you to work additional hours when necessary to meet business needs." },
        { title: "5. Leave Policy", content: "You will be entitled to leave as per the company’s leave policy, including annual leave, sick leave, and public holidays." },
        { title: "6. Confidentiality", content: "You are required to maintain strict confidentiality regarding all company information, documents, clients, and internal matters during and after your employment." },
        { title: "7. Code of Conduct", content: "You are expected to follow the company’s policies, rules, and professional standards at all times." },
        { title: "8. Termination", content: "Either party may terminate this employment by providing 30 days written notice or salary in lieu of notice. The company reserves the right to terminate employment immediately in case of misconduct or violation of company policies." },
        { title: "9. Company Property", content: "Any company property provided to you (including documents, devices, or equipment) must be returned upon termination of employment." },
        { title: "10. Acceptance of Offer", content: "Please sign and return a copy of this letter as confirmation of your acceptance of the above terms and conditions." }
    ];

    // --- Draw First 5 Points on Page 1 ---
    doc.setTextColor(0);
    for (let i = 0; i < 5; i++) {
        const point = points[i];
        doc.setFont("helvetica", "bold");
        doc.text(point.title, margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(point.content, pageWidth - (margin * 2) - 5);
        doc.text(lines, margin + 5, y, { lineHeightFactor: 1.3 });
        y += (lines.length * 5.5) + 6;
    }

    // --- Start Page 2 ---
    doc.addPage();
    drawHeader();
    y = 45; // Same Y start for secondary pages

    // --- Draw Remaining 5 Points on Page 2 ---
    doc.setTextColor(0);
    for (let i = 5; i < 10; i++) {
        const point = points[i];
        doc.setFont("helvetica", "bold");
        doc.text(point.title, margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(point.content, pageWidth - (margin * 2) - 5);
        doc.text(lines, margin + 5, y, { lineHeightFactor: 1.3 });
        y += (lines.length * 5.5) + 6;
    }

    y += 10;
    doc.text("We welcome you to ECS and look forward to a successful and productive working relationship.", margin, y);
    y += 15;

    doc.text("Sincerely,", margin, y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text(settings.authorized_signatory || "Authorized Signatory", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(settings.signatory_designation || "Manager", margin, y);
    doc.text(settings.company_name, margin, y + 5);

    y += 20;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Employee Acceptance", pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const acceptanceText = `I, ${data.full_name || "[Employee Name]"}, have read and understood the above terms and conditions and agree to accept the appointment.`;
    doc.text(acceptanceText, margin, y);
    y += 12;

    doc.text("Signature: ______________________", margin, y);
    doc.text("Date: _________________________", pageWidth - 80, y);
    y += 8;
    doc.text(`Name: ${data.full_name || "_________________________"}`, margin, y);

    // Final pass for footers (including page numbering)
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
    }

    doc.save(`Appointment_Letter_${data.full_name?.replace(/\s+/g, '_') || 'Employee'}.pdf`);
};
