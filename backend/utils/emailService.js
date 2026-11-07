const nodemailer = require('nodemailer');
const pool = require('../config/db');

// Ensure settings table exists
const ensureSettingsTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id VARCHAR(36) PRIMARY KEY,
                \`key\` VARCHAR(100) UNIQUE NOT NULL,
                value JSON NOT NULL,
                updated_by VARCHAR(36),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
    } catch (e) {
        console.error('[EmailService] Error checking settings table:', e.message);
    }
};

// Retrieve SMTP settings from DB
const getSmtpSettings = async () => {
    try {
        await ensureSettingsTable();
        const [rows] = await pool.query("SELECT value FROM settings WHERE `key` = 'smtp_settings'");
        if (rows.length > 0 && rows[0].value) {
            const val = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
            if (val && val.host && val.user && val.pass) {
                return val;
            }
        }
    } catch (e) {
        console.error('[EmailService] Failed to load SMTP settings:', e.message);
    }
    return null;
};

// Retrieve Company Profile and Contact Numbers (same as on PDF invoices)
const getCompanyInfo = async () => {
    let company = {
        name: 'Electric Complaint Solutions',
        phone: '+92 310 1111 327',
        email: 'ecs.isbpak@gmail.com',
        address: '1st Floor, Zain Plaza, Islamabad',
        bank_name: 'Habib Bank Limited',
        account_title: 'ECS (PVT) Ltd',
        iban: '0050417901614255',
        tax_id: '3220139033321',
        terms: 'Payment is due within 7 days. Thank you for your business.'
    };

    try {
        const [rows] = await pool.query("SELECT * FROM company_settings LIMIT 1");
        if (rows.length > 0 && rows[0]) {
            const r = rows[0];
            if (r.company_name) company.name = r.company_name;
            if (r.company_phone) company.phone = r.company_phone;
            if (r.company_email) company.email = r.company_email;
            if (r.company_address) company.address = r.company_address;
            if (r.bank_name) company.bank_name = r.bank_name;
            if (r.account_title) company.account_title = r.account_title;
            if (r.iban) company.iban = r.iban;
            if (r.tax_id) company.tax_id = r.tax_id;
            if (r.terms_and_conditions) company.terms = r.terms_and_conditions;
        }
    } catch (e) {
        console.error('[EmailService] Error fetching company settings:', e.message);
    }

    return company;
};

// Create a nodemailer transporter
const createTransporter = (smtpConfig) => {
    const port = parseInt(smtpConfig.port) || 587;
    const isSecure = smtpConfig.secure === true || port === 465;
    return nodemailer.createTransport({
        host: smtpConfig.host,
        port: port,
        secure: isSecure,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Wrap content in branded HTML template with company contact details
const buildEmailTemplate = (company, title, bodyContent) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
            .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
            .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge-success { background: #dcfce7; color: #15803d; }
            .badge-primary { background: #e0f2fe; color: #0369a1; }
            .badge-warning { background: #fef3c7; color: #b45309; }
            .table-details { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            .table-details td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .table-details td:first-child { color: #64748b; font-weight: 600; width: 38%; }
            .table-details td:last-child { color: #0f172a; font-weight: 600; text-align: right; }
            .contact-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px; margin-top: 28px; }
            .contact-box h3 { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; }
            .contact-item { font-size: 13px; color: #14532d; margin: 5px 0; }
            .contact-item b { color: #166534; }
            .bank-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-top: 16px; font-size: 12px; }
            .bank-box h4 { margin: 0 0 8px; color: #1e40af; font-size: 12px; text-transform: uppercase; }
            .footer { padding: 24px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
            .footer a { color: #0284c7; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${company.name}</h1>
                <p>Official Notification</p>
            </div>
            <div class="content">
                ${bodyContent}

                <div class="contact-box">
                    <h3>Contact & Support Details</h3>
                    <div class="contact-item">📞 <b>Helpline / Phone:</b> ${company.phone}</div>
                    <div class="contact-item">✉️ <b>Support Email:</b> <a href="mailto:${company.email}" style="color: #166534; font-weight: bold;">${company.email}</a></div>
                    ${company.address ? `<div class="contact-item">📍 <b>Office Address:</b> ${company.address}</div>` : ''}
                </div>
            </div>
            <div class="footer">
                <p style="margin: 0 0 4px;">Thank you for choosing <b>${company.name}</b>.</p>
                <p style="margin: 0;">This is an automated system notification. If you have any inquiries, please contact our helpline.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Generic mail sender
const sendMail = async ({ to, subject, html, attachments = [] }) => {
    try {
        if (!to || !to.includes('@')) {
            console.log('[EmailService] Invalid recipient email, skipping send:', to);
            return { skipped: true, reason: 'Invalid recipient email' };
        }

        const smtp = await getSmtpSettings();
        if (!smtp || !smtp.host || !smtp.user || !smtp.pass) {
            console.log('[EmailService] SMTP not configured. Configure SMTP in Settings to enable email delivery.');
            return { skipped: true, reason: 'SMTP not configured' };
        }

        if (smtp.enabled === false) {
            console.log('[EmailService] SMTP is disabled in Settings.');
            return { skipped: true, reason: 'SMTP disabled' };
        }

        const company = await getCompanyInfo();
        const transporter = createTransporter(smtp);

        const senderName = smtp.sender_name || company.name || 'ECS IT Solutions';
        const senderEmail = smtp.sender_email || smtp.user;
        const from = `"${senderName}" <${senderEmail}>`;

        const info = await transporter.sendMail({
            from,
            to,
            subject,
            html,
            attachments
        });

        console.log(`[EmailService] Email sent successfully to ${to} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('[EmailService] Failed to send email:', err.message);
        return { success: false, error: err.message };
    }
};

// 1. Welcome Email to Customer
const sendWelcomeEmail = async (customer) => {
    try {
        if (!customer || !customer.email) return;
        const company = await getCompanyInfo();

        const bodyContent = `
            <p style="font-size: 16px; margin-top: 0;">Dear <b>${customer.name}</b>,</p>
            <p>Welcome to <b>${company.name}</b>! Your customer account has been successfully registered in our system.</p>
            
            <div class="card">
                <div style="font-size: 12px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 8px;">Customer Profile</div>
                <table class="table-details">
                    <tr><td>Customer ID:</td><td><span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${customer.customer_id || 'Registered'}</span></td></tr>
                    <tr><td>Full Name:</td><td>${customer.name}</td></tr>
                    <tr><td>Phone Number:</td><td>${customer.phone}</td></tr>
                    <tr><td>Email Address:</td><td>${customer.email}</td></tr>
                    ${customer.city ? `<tr><td>City:</td><td>${customer.city}</td></tr>` : ''}
                    ${customer.address ? `<tr><td>Address:</td><td>${customer.address}</td></tr>` : ''}
                </table>
            </div>

            <p style="color: #475569; font-size: 13px;">
                You can now log complaints, request technical support, and track service history directly with our team.
            </p>
        `;

        const html = buildEmailTemplate(company, `Welcome to ${company.name}`, bodyContent);
        return await sendMail({
            to: customer.email,
            subject: `Welcome to ${company.name} - Account Registered (${customer.customer_id || customer.name})`,
            html
        });
    } catch (e) {
        console.error('[EmailService] Error in sendWelcomeEmail:', e.message);
    }
};

// 2. Complaint Creation Email
const sendComplaintCreatedEmail = async (complaint, customer, branch) => {
    try {
        const toEmail = customer?.email || complaint?.customer_email;
        if (!toEmail) return;

        const company = await getCompanyInfo();
        const branchName = branch?.name || complaint?.branch_name || 'Main Branch';

        const bodyContent = `
            <p style="font-size: 16px; margin-top: 0;">Dear <b>${customer?.name || 'Valued Customer'}</b>,</p>
            <p>Your service complaint has been successfully registered. Our technical support team is reviewing it and will assist you shortly.</p>

            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 12px; font-weight: 700; color: #0284c7; text-transform: uppercase;">Complaint Information</span>
                    <span class="badge badge-primary">Registered</span>
                </div>
                <table class="table-details">
                    <tr><td>Complaint #:</td><td><b style="color: #0369a1; font-family: monospace;">${complaint.complaint_number}</b></td></tr>
                    ${complaint.verification_id ? `<tr><td>Verification Code:</td><td><b style="font-family: monospace; color: #16a34a;">${complaint.verification_id}</b></td></tr>` : ''}
                    <tr><td>Service Type:</td><td style="text-transform: capitalize;">${complaint.complaint_type || 'Repair'}</td></tr>
                    <tr><td>Priority:</td><td style="text-transform: capitalize;">${complaint.priority || 'Medium'}</td></tr>
                    ${complaint.serial_number ? `<tr><td>Serial Number:</td><td style="font-family: monospace;">${complaint.serial_number}</td></tr>` : ''}
                    <tr><td>Warranty Status:</td><td style="text-transform: uppercase; font-size: 11px;">${complaint.warranty_type === 'warranty' ? 'In Warranty' : 'Non-Warranty'}</td></tr>
                    <tr><td>Branch:</td><td>${branchName}</td></tr>
                    <tr><td>Date Registered:</td><td>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
                </table>

                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Reported Issue:</div>
                    <div style="font-style: italic; color: #334155; font-size: 13px;">"${complaint.description}"</div>
                </div>
            </div>

            <p style="font-size: 13px; color: #475569;">
                Please keep your Complaint Number (<b>${complaint.complaint_number}</b>) handy for verification and status tracking.
            </p>
        `;

        const html = buildEmailTemplate(company, `Complaint #${complaint.complaint_number} Registered`, bodyContent);
        return await sendMail({
            to: toEmail,
            subject: `Complaint Registered: #${complaint.complaint_number} - ${company.name}`,
            html
        });
    } catch (e) {
        console.error('[EmailService] Error in sendComplaintCreatedEmail:', e.message);
    }
};

// 3. Complaint Status Update Email
const sendComplaintStatusEmail = async (complaint, customer, newStatus, notes = '') => {
    try {
        const toEmail = customer?.email || complaint?.customer_email;
        if (!toEmail) return;

        const company = await getCompanyInfo();
        const formattedStatus = (newStatus || complaint.status || 'updated').replace(/_/g, ' ');

        let badgeClass = 'badge-primary';
        if (['solved', 'completed'].includes(newStatus)) badgeClass = 'badge-success';
        else if (['in_progress', 'assigned'].includes(newStatus)) badgeClass = 'badge-warning';

        const bodyContent = `
            <p style="font-size: 16px; margin-top: 0;">Dear <b>${customer?.name || 'Valued Customer'}</b>,</p>
            <p>The status of your service complaint has been updated.</p>

            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 12px; font-weight: 700; color: #0284c7; text-transform: uppercase;">Complaint #${complaint.complaint_number}</span>
                    <span class="badge ${badgeClass}" style="font-size: 12px; padding: 6px 14px;">${formattedStatus.toUpperCase()}</span>
                </div>
                <table class="table-details">
                    <tr><td>Complaint ID:</td><td><b style="font-family: monospace;">${complaint.complaint_number}</b></td></tr>
                    <tr><td>Current Status:</td><td style="text-transform: capitalize; font-weight: bold; color: #0284c7;">${formattedStatus}</td></tr>
                    ${complaint.verification_id ? `<tr><td>Verification ID:</td><td><span style="font-family: monospace;">${complaint.verification_id}</span></td></tr>` : ''}
                    <tr><td>Updated On:</td><td>${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td></tr>
                </table>

                ${notes ? `
                <div style="margin-top: 14px; padding: 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #16a34a; margin-bottom: 4px;">Resolution / Technical Note:</div>
                    <div style="color: #1e293b; font-size: 13px;">${notes}</div>
                </div>
                ` : ''}
            </div>

            <p style="font-size: 13px; color: #475569;">
                If you have any questions or require additional assistance, please reach out via our helpline numbers below.
            </p>
        `;

        const html = buildEmailTemplate(company, `Status Update: Complaint #${complaint.complaint_number}`, bodyContent);
        return await sendMail({
            to: toEmail,
            subject: `Status Update [${formattedStatus.toUpperCase()}]: #${complaint.complaint_number} - ${company.name}`,
            html
        });
    } catch (e) {
        console.error('[EmailService] Error in sendComplaintStatusEmail:', e.message);
    }
};

// 4. Invoice Email with PDF Summary & Bank Details
const sendInvoiceEmail = async (invoice, customer, items = [], branch = null, pdfBuffer = null) => {
    try {
        const toEmail = customer?.email || invoice?.customer_email;
        if (!toEmail) return;

        const company = await getCompanyInfo();
        const branchName = branch?.name || invoice?.branch_name || 'Main Branch';

        const totalFormatted = parseFloat(invoice.total_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
        const subtotalFormatted = parseFloat(invoice.subtotal || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
        const taxFormatted = parseFloat(invoice.tax_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
        const discountFormatted = parseFloat(invoice.discount_amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });

        const itemsRows = items.map((item, idx) => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155;">${idx + 1}. ${item.description || 'Service Work'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px;">${item.quantity || item.qty || 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 12px;">PKR ${(parseFloat(item.unit_price || item.unitPrice || 0)).toLocaleString()}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 12px; font-weight: bold;">PKR ${(parseFloat(item.total_price || item.amount || 0)).toLocaleString()}</td>
            </tr>
        `).join('');

        const bodyContent = `
            <p style="font-size: 16px; margin-top: 0;">Dear <b>${customer?.name || 'Valued Customer'}</b>,</p>
            <p>Your official invoice from <b>${company.name}</b> has been generated. Details are provided below.</p>

            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Invoice Number</span>
                        <div style="font-size: 18px; font-weight: bold; font-family: monospace; color: #0284c7;">${invoice.invoice_number}</div>
                    </div>
                    <span class="badge ${invoice.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}">
                        ${(invoice.payment_status || 'unpaid').toUpperCase()}
                    </span>
                </div>

                <table class="table-details">
                    <tr><td>Customer Name:</td><td>${customer?.name || 'Customer'}</td></tr>
                    <tr><td>Branch:</td><td>${branchName}</td></tr>
                    ${invoice.verification_id ? `<tr><td>Verification ID:</td><td><span style="font-family: monospace; font-size: 11px;">${invoice.verification_id}</span></td></tr>` : ''}
                    <tr><td>Invoice Date:</td><td>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
                    ${invoice.due_date ? `<tr><td>Due Date:</td><td>${new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>` : ''}
                </table>

                ${items.length > 0 ? `
                <div style="margin-top: 16px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Billed Items</div>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                        <thead>
                            <tr style="background: #f1f5f9; text-align: left; font-size: 11px; font-weight: bold; color: #475569;">
                                <th style="padding: 8px;">Description</th>
                                <th style="padding: 8px; text-align: center;">Qty</th>
                                <th style="padding: 8px; text-align: right;">Rate</th>
                                <th style="padding: 8px; text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                <div style="margin-top: 16px; padding-top: 12px; border-top: 2px solid #e2e8f0;">
                    <table class="table-details">
                        <tr><td>Subtotal:</td><td>PKR ${subtotalFormatted}</td></tr>
                        ${parseFloat(invoice.tax_amount || 0) > 0 ? `<tr><td>Sales Tax:</td><td>PKR ${taxFormatted}</td></tr>` : ''}
                        ${parseFloat(invoice.discount_amount || 0) > 0 ? `<tr><td>Discount:</td><td>- PKR ${discountFormatted}</td></tr>` : ''}
                        <tr style="font-size: 16px; border-top: 1px solid #cbd5e1;">
                            <td style="color: #0f172a; font-weight: bold;">Total Amount:</td>
                            <td style="color: #0284c7; font-weight: 900;">PKR ${totalFormatted}</td>
                        </tr>
                    </table>
                </div>

                ${company.bank_name ? `
                <div class="bank-box">
                    <h4>Bank Payment Details</h4>
                    <div><b>Bank Name:</b> ${company.bank_name}</div>
                    <div><b>Account Title:</b> ${company.account_title || company.name}</div>
                    <div><b>IBAN / Account #:</b> <span style="font-family: monospace; font-weight: bold;">${company.iban || 'N/A'}</span></div>
                </div>
                ` : ''}
            </div>
        `;

        const html = buildEmailTemplate(company, `Invoice #${invoice.invoice_number}`, bodyContent);

        const attachments = [];
        if (pdfBuffer) {
            attachments.push({
                filename: `Invoice-${invoice.invoice_number}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            });
        }

        return await sendMail({
            to: toEmail,
            subject: `Invoice #${invoice.invoice_number} from ${company.name} (PKR ${totalFormatted})`,
            html,
            attachments
        });
    } catch (e) {
        console.error('[EmailService] Error in sendInvoiceEmail:', e.message);
    }
};

// 5. Test SMTP connection
const testSmtpConnection = async (smtpConfig, testRecipient) => {
    const transporter = createTransporter(smtpConfig);
    await transporter.verify();

    if (testRecipient && testRecipient.includes('@')) {
        const company = await getCompanyInfo();
        const testHtml = buildEmailTemplate(
            company,
            'SMTP Configuration Test',
            `
            <p>Hello,</p>
            <p>This is a test email sent from <b>${company.name}</b> to confirm that your SMTP email settings are working properly.</p>
            <div class="card">
                <b>SMTP Server:</b> ${smtpConfig.host}:${smtpConfig.port}<br/>
                <b>Authenticated User:</b> ${smtpConfig.user}<br/>
                <b>Encryption:</b> ${smtpConfig.secure ? 'SSL/TLS (Port 465)' : 'STARTTLS (Port 587/25)'}<br/>
                <b>Timestamp:</b> ${new Date().toISOString()}
            </div>
            <p style="color: #16a34a; font-weight: bold;">✅ SMTP credentials are valid and active.</p>
            `
        );

        const senderName = smtpConfig.sender_name || company.name || 'ECS IT Solutions';
        const senderEmail = smtpConfig.sender_email || smtpConfig.user;

        await transporter.sendMail({
            from: `"${senderName}" <${senderEmail}>`,
            to: testRecipient,
            subject: `✅ SMTP Test Email - ${company.name}`,
            html: testHtml
        });
    }

    return { success: true, message: 'SMTP connection verified successfully' };
};

module.exports = {
    getSmtpSettings,
    getCompanyInfo,
    testSmtpConnection,
    sendWelcomeEmail,
    sendComplaintCreatedEmail,
    sendComplaintStatusEmail,
    sendInvoiceEmail,
    sendMail
};
