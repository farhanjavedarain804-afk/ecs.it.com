
export type ActivityType =
    | "LOGIN"
    | "LOGOUT"
    | "COMPLAINT_CREATED"
    | "COMPLAINT_UPDATED"
    | "COMPLAINT_STATUS_UPDATED"
    | "COMPLAINT_DELETED"
    | "COMPLAINT_SOLVED"
    | "INVOICE_GENERATED"
    | "PAYMENT_STATUS_UPDATED"
    | "INVOICE_DELETED"
    | "STAFF_ADDED"
    | "STAFF_UPDATED"
    | "STAFF_DELETED"
    | "CUSTOMER_ADDED"
    | "CUSTOMER_UPDATED"
    | "CUSTOMER_DELETED"
    | "ATTENDANCE_MARKED"
    | "ATTENDANCE_DELETED"
    | "INVENTORY_ITEM_ADDED"
    | "INVENTORY_ISSUED"
    | "INVENTORY_RECEIVED"
    | "INVENTORY_MOVEMENT"
    | "FINANCIAL_ENTRY_CREATED"
    | "CUSTOMER_REVIEW_SUBMITTED";


interface LogParams {
    userId: string;
    userEmail: string;
    activityType: ActivityType;
    branchId?: string | null;
    metadata?: Record<string, any>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const logActivity = async ({
    userId,
    userEmail,
    activityType,
    branchId,
    metadata = {}
}: LogParams) => {
    try {
        const token = localStorage.getItem('ecs_token');
        if (!token) return;

        const response = await fetch(`${API_URL}/api/activity_logs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                activity_type: activityType,
                metadata: {
                    ...metadata,
                    userEmail, // keep for compatibility
                    branch_id: branchId,
                    timestamp: new Date().toISOString()
                }
            })
        });

        if (!response.ok) {
            console.error("Failed to log activity via API:", response.statusText);
        }
    } catch (err) {
        console.error("Critical logging error:", err);
    }
};


