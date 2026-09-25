/**
 * Inbox Service (Firestore)
 * Manages conversations and messages for the unified WhatsApp/Messenger/Instagram inbox.
 * Uses onSnapshot for real-time updates without extra WebSocket infrastructure.
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    startAfter,
    serverTimestamp,
    increment,
    Timestamp,
    type Unsubscribe,
    type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
    ConversationDoc,
    MessageDoc,
    ConversationStatus,
    Channel,
    MessageDirection,
    MessageType,
    MessageStatus,
} from '@/types/inbox';

// ─── Collection references ────────────────────────────────────────────────────
const conversationsRef = () => collection(db, 'conversations');
const messagesRef = (conversationId: string) =>
    collection(db, 'conversations', conversationId, 'messages');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToConversation(id: string, data: DocumentData): ConversationDoc {
    return {
        id,
        channel: data.channel ?? 'whatsapp',
        phoneId: data.phoneId ?? '',
        accountKey: data.accountKey,
        contactPhone: data.contactPhone,
        contactPsid: data.contactPsid,
        contactName: data.contactName ?? 'Desconocido',
        contactAvatarUrl: data.contactAvatarUrl,
        lastMessage: data.lastMessage ?? '',
        lastMessageAt: data.lastMessageAt,
        unreadCount: data.unreadCount ?? 0,
        status: data.status ?? 'abierto',
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
        lastInboundAt: data.lastInboundAt,
        tags: data.tags ?? [],
        preOrder: data.preOrder,
        adReferral: data.adReferral,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}

function docToMessage(id: string, data: DocumentData): MessageDoc {
    return {
        id,
        direction: data.direction ?? 'inbound',
        type: data.type ?? 'text',
        content: data.content ?? '',
        mediaUrl: data.mediaUrl,
        mimeType: data.mimeType,
        fileName: data.fileName,
        metaMessageId: data.metaMessageId ?? '',
        timestamp: data.timestamp,
        agentUid: data.agentUid,
        agentName: data.agentName,
        status: data.status,
        templateName: data.templateName,
        reactionEmoji: data.reactionEmoji,
        statusFor: data.statusFor,
        options: data.options,
        cta: data.cta,
    };
}

// ─── Conversation ID generation ───────────────────────────────────────────────

/**
 * Generates a stable conversation ID.
 * WhatsApp: `wa_{phoneId}_{contactPhone}`
 * Messenger/Instagram: `{channel}_{psid}`
 */
export function buildConversationId(
    channel: Channel,
    phoneId: string,
    contactIdentifier: string // phone or PSID
): string {
    const prefix = channel === 'whatsapp' ? 'wa' : channel === 'messenger' ? 'ms' : 'ig';
    // Keep letters/digits: phones stay numeric, and IDs of contacts without a phone (usernames) stay distinct
    return `${prefix}_${phoneId}_${contactIdentifier.replace(/[^A-Za-z0-9_-]/g, '')}`;
}

// ─── Real-time listeners ──────────────────────────────────────────────────────

/**
 * Subscribes to the list of conversations, ordered by lastMessageAt desc.
 * Optionally filter by channel or status.
 */
export function subscribeToConversations(
    callback: (conversations: ConversationDoc[]) => void,
    options?: {
        channel?: Channel;
        status?: ConversationStatus;
        assignedTo?: string;
        maxResults?: number;
    }
): Unsubscribe {
    let q = query(
        conversationsRef(),
        orderBy('lastMessageAt', 'desc'),
        limit(options?.maxResults ?? 100)
    );

    if (options?.channel) {
        q = query(q, where('channel', '==', options.channel));
    }
    if (options?.status) {
        q = query(q, where('status', '==', options.status));
    }
    if (options?.assignedTo) {
        q = query(q, where('assignedTo', '==', options.assignedTo));
    }

    return onSnapshot(q, (snapshot) => {
        const conversations = snapshot.docs.map(d => docToConversation(d.id, d.data()));
        callback(conversations);
    });
}

/**
 * Subscribes to the messages of a single conversation, ordered by timestamp asc.
 */
export function subscribeToMessages(
    conversationId: string,
    callback: (messages: MessageDoc[]) => void,
    maxMessages: number = 100
): Unsubscribe {
    const q = query(
        messagesRef(conversationId),
        orderBy('timestamp', 'asc'),
        limit(maxMessages)
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(d => docToMessage(d.id, d.data()));
        callback(messages);
    });
}

/**
 * Subscribes to total unread count across ALL conversations (for dashboard badge).
 */
export function subscribeToUnreadCount(callback: (count: number) => void): Unsubscribe {
    return onSnapshot(
        query(conversationsRef(), where('unreadCount', '>', 0)),
        (snapshot) => {
            const total = snapshot.docs.reduce(
                (acc, d) => acc + (d.data().unreadCount ?? 0),
                0
            );
            callback(total);
        }
    );
}

// ─── Write operations ─────────────────────────────────────────────────────────

/**
 * Creates or updates a conversation document when an inbound message arrives.
 * Called from the webhook (server-side, via Admin SDK).
 * This client-side version is used for optimistic UI updates only.
 */
export async function upsertConversation(conv: Omit<ConversationDoc, 'id'> & { id: string }): Promise<void> {
    const ref = doc(db, 'conversations', conv.id);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        await updateDoc(ref, {
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageAt ?? serverTimestamp(),
            unreadCount: increment(1),
            contactName: conv.contactName,
            status: conv.status ?? 'abierto',
            updatedAt: serverTimestamp(),
        });
    } else {
        await setDoc(ref, {
            ...conv,
            unreadCount: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessageAt: conv.lastMessageAt ?? serverTimestamp(),
        });
    }
}

/**
 * Adds a message to a conversation's messages subcollection.
 */
export async function addMessage(
    conversationId: string,
    message: Omit<MessageDoc, 'id'>
): Promise<string> {
    const ref = await addDoc(messagesRef(conversationId), {
        ...message,
        timestamp: message.timestamp ?? serverTimestamp(),
    });
    return ref.id;
}

/**
 * Marks all messages in a conversation as read (resets unread count).
 */
export async function markConversationAsRead(conversationId: string): Promise<void> {
    const ref = doc(db, 'conversations', conversationId);
    await updateDoc(ref, {
        unreadCount: 0,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Updates the status of a conversation (abierto, cerrado, bot, asignado).
 */
export async function setConversationStatus(
    conversationId: string,
    status: ConversationStatus,
    assignedTo?: string,
    assignedToName?: string
): Promise<void> {
    const ref = doc(db, 'conversations', conversationId);
    const update: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
    };
    if (assignedTo !== undefined) {
        update.assignedTo = assignedTo;
        update.assignedToName = assignedToName ?? '';
    }
    await updateDoc(ref, update);
}

/**
 * Saves an outbound message sent by an agent to Firestore + updates conversation.
 */
export async function saveOutboundMessage(
    conversationId: string,
    agentUid: string,
    agentName: string,
    content: string,
    metaMessageId: string,
    type: MessageType = 'text',
    extras?: Partial<MessageDoc>
): Promise<void> {
    // Add message to subcollection
    await addDoc(messagesRef(conversationId), {
        direction: 'outbound' as MessageDirection,
        type,
        content,
        metaMessageId,
        agentUid,
        agentName,
        status: 'sent' as MessageStatus,
        timestamp: serverTimestamp(),
        ...extras,
    });

    // Update conversation's last message
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
        lastMessage: type === 'template' ? '📋 Plantilla enviada' : content,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Updates a message's delivery/read status from a webhook status update.
 */
export async function updateMessageStatus(
    conversationId: string,
    metaMessageId: string,
    status: MessageStatus
): Promise<void> {
    const q = query(
        messagesRef(conversationId),
        where('metaMessageId', '==', metaMessageId),
        limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { status });
    }
}

/**
 * Gets the last N conversations (no real-time — for server-side use).
 */
export async function getRecentConversations(
    maxResults: number = 50
): Promise<ConversationDoc[]> {
    const q = query(
        conversationsRef(),
        orderBy('lastMessageAt', 'desc'),
        limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => docToConversation(d.id, d.data()));
}

/**
 * Gets a single conversation by ID.
 */
export async function getConversation(id: string): Promise<ConversationDoc | null> {
    const snap = await getDoc(doc(db, 'conversations', id));
    if (!snap.exists()) return null;
    return docToConversation(snap.id, snap.data());
}


// ─── AI agent (after-hours pre-orders) ───────────────────────────────────────

/** Marks the AI pre-order as confirmed by a human advisor. */
export async function confirmPreOrder(conversationId: string): Promise<void> {
    await updateDoc(doc(db, 'conversations', conversationId), {
        'preOrder.estado': 'confirmado',
        updatedAt: serverTimestamp(),
    });
}

/** Live on/off switch of the after-hours AI agent (default: on). */
export function subscribeToAgentEnabled(callback: (enabled: boolean) => void): Unsubscribe {
    return onSnapshot(
        doc(db, 'bot_config', 'ai_agent'),
        (snap) => callback(snap.exists() ? snap.data()?.enabled !== false : true),
        () => callback(true)
    );
}

/** Switches the AI agent on/off for ONE conversation, even while human advisors are online. */
export async function setConversationAgentForced(conversationId: string, enabled: boolean): Promise<void> {
    await updateDoc(doc(db, 'conversations', conversationId), {
        agentForced: enabled,
        agentForcedAt: enabled ? new Date().toISOString() : null,
        ...(enabled ? {} : { status: 'abierto' }),
        updatedAt: serverTimestamp(),
    });
}

export async function setAgentEnabled(enabled: boolean): Promise<void> {
    await setDoc(doc(db, 'bot_config', 'ai_agent'), { enabled, updatedAt: serverTimestamp() }, { merge: true });
}


/**
 * Next page of older conversations (static read, no listener) after the given lastMessageAt cursor.
 * The newest conversations stay live through subscribeToConversations; this loads the history on demand.
 */
export async function fetchConversationsPage(
    cursor: ConversationDoc['lastMessageAt'] | undefined,
    size: number = 40
): Promise<ConversationDoc[]> {
    const asAny = cursor as unknown as { toDate?: () => Date } | string | Date | undefined;
    const ts =
        cursor instanceof Timestamp
            ? cursor
            : asAny && typeof asAny === 'object' && 'toDate' in asAny && asAny.toDate
            ? Timestamp.fromDate(asAny.toDate())
            : asAny
            ? Timestamp.fromDate(new Date(asAny as string | Date))
            : null;
    if (!ts) return [];
    const q = query(conversationsRef(), orderBy('lastMessageAt', 'desc'), startAfter(ts), limit(size));
    const snap = await getDocs(q);
    return snap.docs.map(d => docToConversation(d.id, d.data()));
}
