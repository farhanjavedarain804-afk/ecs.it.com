import { jsPDF } from "jspdf";
import { loadLogoForPDF } from "./logoLoader";


export const generateExperienceLetter = async (data: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Force white background — prevents dark-mode CSS bleeding into PDF
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
            if (settingsData) {
                settings = { 
                    ...settings, 
                    ...settingsData,
                    authorized_signatory: 'Muhammad Aamir', // User specifically requested this name
                    signatory_designation: 'Chief Executive Officer'
                };
            }
        }
    } catch (err) {
        console.error("Error fetching company settings:", err);
    }

    // Load logo with white background compositing (prevents black on transparent PNG)
    const logoBase64 = await loadLogoForPDF('/LOGO.png');

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
        doc.text(`Electric Complaint Solutions (ECS) | System Generated Experience Certificate | ID: ${data.employee_id || data.id || 'N/A'}`, pageWidth / 2, footerY + 10, { align: "center" });
        
        doc.setFontSize(7);
        doc.setTextColor(180);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY + 10, { align: "right" });
    };

    // --- Page 1 ---
    drawHeader();

    let y = 50;
    const today = new Date().toLocaleDateString('en-GB');
    const refId = `ECS/EXP/${new Date().getFullYear()}/${(data.employee_id || data.id || '000').slice(-3).toUpperCase()}`;
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${today}`, margin, y);
    doc.text(`Ref: ${refId}`, pageWidth - margin, y, { align: "right" });
    y += 25;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("TO WHOM IT MAY CONCERN", pageWidth / 2, y, { align: "center" });
    doc.line(pageWidth / 2 - 35, y + 1, pageWidth / 2 + 35, y + 1);
    y += 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    const joiningDate = data.joining_date ? new Date(data.joining_date).toLocaleDateString('en-GB') : "________________";
    const leavingDate = (data.status !== 'active' && (data.status_changed_at || data.updated_at)) 
        ? new Date(data.status_changed_at || data.updated_at).toLocaleDateString('en-GB') 
        : "________________";

    const mainText = `This is to certify that Mr. ${data.full_name || "________________"} S/O ${data.father_name || "________________"} holding CNIC # ${data.cnic || "________________"} has joined Electric Complaint Solutions (Pvt.) Ltd. On ${joiningDate}.`;
    const positionText = `He was Holding the Position of ${data.designation || "________________"} when he left the company on ${leavingDate}.`;
    const closingText = `He has shown himself to be hard working and dedicated to his responsibilities.\n\nThis certificate is issued upon his request.`;

    const lines1 = doc.splitTextToSize(mainText, pageWidth - (margin * 2));
    doc.text(lines1, margin, y, { lineHeightFactor: 1.6 });
    y += (lines1.length * 8) + 10;

    const lines2 = doc.splitTextToSize(positionText, pageWidth - (margin * 2));
    doc.text(lines2, margin, y, { lineHeightFactor: 1.6 });
    y += (lines2.length * 8) + 15;

    const lines3 = doc.splitTextToSize(closingText, pageWidth - (margin * 2));
    doc.text(lines3, margin, y, { lineHeightFactor: 1.6 });
    y += (lines3.length * 8) + 40;

    // Signature Block
    doc.setFont("helvetica", "bold");
    doc.text("________________________", margin, y);
    y += 8;
    doc.text("Muhammad Aamir,", margin, y);
    y += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Chief Executive Officer,", margin, y);
    y += 5;
    doc.text("ECS.", margin, y);

    // Final pass for footers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
    }

    doc.save(`Experience_Letter_${data.full_name?.replace(/\s+/g, '_') || 'Employee'}.pdf`);
};
