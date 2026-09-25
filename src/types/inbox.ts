import { Timestamp } from 'firebase/firestore';

export type Channel = 'whatsapp' | 'messenger' | 'instagram';

export type ConversationStatus = 'abierto' | 'cerrado' | 'bot' | 'asignado';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageType = 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'template' | 'status' | 'reaction' | 'interactive';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Biocambio360 WhatsApp phone number IDs
 */
export const WHATSAPP_ACCOUNTS = {
    biocambio360: {
        label: 'Biocambio360',
        phoneNumber: '+57 324 1005353',
        phoneId: '236893662847270',
    },
    totalLimpieza: {
        label: 'Biocambio360 Total Limpieza',
        phoneNumber: '+57 323 6045330',
        phoneId: '879282705263185',
    },
} as const;

export type WhatsAppAccountKey = keyof typeof WHATSAPP_ACCOUNTS;

export interface PreOrderItem {
    producto: string;
    presentacion: string;
    cantidad: number;
}

/** Pre-order built by the after-hours AI agent; a human advisor only confirms it. */
export interface PreOrder {
    items: PreOrderItem[];
    nombreCliente: string;
    direccion: string;
    ciudad: string;
    metodoPago: string;
    notas: string;
    /** Preferred contact window: manana | tarde | 7-9pm */
    horarioContacto?: string;
    estado: 'borrador' | 'listo' | 'confirmado';
    actualizadoAt: string;
}

/** Click-to-WhatsApp ad that started the conversation (Meta `referral` object). */
export interface AdReferral {
    sourceId?: string;
    sourceType?: string;
    sourceUrl?: string;
    headline?: string;
    body?: string;
    mediaType?: string;
    ctwaClid?: string;
    receivedAt?: string;
}

export interface ConversationDoc {
    id: string;
    channel: Channel;
    /** WhatsApp: phone number ID of the business account */
    phoneId: string;
    /** Identifies which WABA account this belongs to */
    accountKey?: WhatsAppAccountKey;
    /** Contact's phone (E.164 without +) — only for WhatsApp */
    contactPhone?: string;
    /** WhatsApp business-scoped user ID (contacts that use a username have no phone) */
    contactUserId?: string | null;
    /** PSID — only for Messenger/Instagram */
    contactPsid?: string;
    contactName: string;
    contactAvatarUrl?: string;
    lastMessage: string;
    lastMessageAt: Timestamp | Date | string;
    unreadCount: number;
    status: ConversationStatus;
    /** uid of the agent assigned to this conversation */
    assignedTo?: string;
    assignedToName?: string;
    /** Timestamp of the last inbound message — used to track 24h window */
    lastInboundAt?: Timestamp | Date | string;
    /** Custom tags */
    tags?: string[];
    /** Pre-order drafted by the AI agent (after hours) */
    preOrder?: PreOrder;
    /** Abandoned-cart reminder that started/tagged this conversation */
    cartToken?: string;
    cartTotal?: number;
    cartSummary?: string;
    cartStep?: number;
    cartSentAt?: string;
    /** A human switched the AI agent on for this conversation (expires after 6 h) */
    agentForced?: boolean;
    agentForcedAt?: string;
    /** One-line note for the advisor written by the AI agent */
    agentSummary?: string;
    /** 'nuevo' | 'continuacion' | 'demanda' — how the agent is treating the conversation */
    botMode?: string;
    /** Ad that originated this conversation, if any */
    adReferral?: AdReferral;
    createdAt?: Timestamp | Date | string;
    updatedAt?: Timestamp | Date | string;
}

export interface MessageDoc {
    id: string;
    direction: MessageDirection;
    type: MessageType;
    content: string;
    mediaUrl?: string;
    mimeType?: string;
    fileName?: string;
    /** Message ID returned by Meta Graph API */
    metaMessageId: string;
    /** Firestore timestamp */
    timestamp: Timestamp | Date | string;
    /** uid of the agent who sent this (outbound only) */
    agentUid?: string;
    agentName?: string;
    status?: MessageStatus;
    /** For template messages */
    templateName?: string;
    /** Reaction emoji */
    reactionEmoji?: string;
    /** WhatsApp status update (sent/delivered/read) references */
    statusFor?: string;
    /** Quick-reply options sent with this message (shown as buttons) */
    options?: string[];
    /** Link button sent with this message */
    cta?: { label: string; url: string };
}

export interface WhatsAppTemplateComponent {
    type: 'header' | 'body' | 'button';
    parameters: Array<{
        type: 'text' | 'image' | 'video' | 'document';
        text?: string;
        image?: { link: string };
    }>;
}

export interface WhatsAppTemplate {
    name: string;
    language: string;
    components?: WhatsAppTemplateComponent[];
}

export interface SendMessagePayload {
    conversationId: string;
    channel: Channel;
    to: string;              // phone (WA) or PSID (messenger/ig)
    phoneId: string;         // business phone number ID
    type: 'text' | 'template' | 'image' | 'document' | 'audio';
    text?: string;
    template?: WhatsAppTemplate;
    mediaUrl?: string;
    mimeType?: string;
    fileName?: string;
}

export interface BulkReminderRequest {
    customerIds: string[];
    templateName: string;
    phoneId: string;
    language?: string;
}

export interface BulkReminderResult {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    estimatedCostUsd: number;
    errors: Array<{ customerId: string; phone: string; error: string }>;
}
