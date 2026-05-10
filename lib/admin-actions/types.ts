export interface RewardLevel {
    id?: string;
    title: string;
    description?: string;
    onetime_reward_xp: number;
    payment_commision: number;
    min_xp: number;
    max_xp: number;
}

export interface UserRecord {
    uid: string;
    name: string | null;
    email: string | null;
    photoURL: string | null;
    isOwner: boolean;
    country: string;
    lastLoginAt?: string | null;
    createdAt?: string | null;
    isAnonymous?: boolean;
    ruleId: string | null;
    xp: number;
    affiliateLevel: string;
    affiliateId?: string | null;
}

export interface PaymentRecord {
    id: string;
    userId: string;
    game: string;
    payerEmail: string;
    amount: string;
    status: string;
    purchaseDate: string;
    steamKey: string | null;
    paypalOrderId: string | null;
    coupon: string | null;
    source: "payment" | "offerPayment";
}

export interface AdminDashboardData {
    users: UserRecord[];
    payments: PaymentRecord[];
    offers: any[];
    games: any[];
    coupons: any[];
}