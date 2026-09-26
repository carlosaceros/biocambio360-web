import { describe, it, expect } from 'vitest';
import { parseBracketForm, extractOutgoing } from '@/lib/kommo';

describe('kommo webhook parsing', () => {
    const raw =
        'account%5Bsubdomain%5D=biocambio&message%5Badd%5D%5B0%5D%5Bid%5D=abc1&message%5Badd%5D%5B0%5D%5Btype%5D=outgoing&message%5Badd%5D%5B0%5D%5Btext%5D=Hola%20Ana&message%5Badd%5D%5B0%5D%5Bcontact_id%5D=777' +
        '&message%5Badd%5D%5B0%5D%5Bcreated_at%5D=1790000000&message%5Badd%5D%5B0%5D%5Bauthor%5D%5Bid%5D=55&message%5Badd%5D%5B0%5D%5Bauthor%5D%5Bname%5D=Laura' +
        '&message%5Badd%5D%5B1%5D%5Bid%5D=abc2&message%5Badd%5D%5B1%5D%5Btype%5D=incoming&message%5Badd%5D%5B1%5D%5Btext%5D=Hola&message%5Badd%5D%5B1%5D%5Bcontact_id%5D=777';
    it('parses bracket keys and keeps only outgoing messages', () => {
        const events = extractOutgoing(parseBracketForm(raw));
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ id: 'abc1', text: 'Hola Ana', contactId: '777', authorName: 'Laura', authorId: '55', createdAt: 1790000000 });
    });
    it('ignores payloads without chat messages', () => {
        expect(extractOutgoing(parseBracketForm('leads%5Badd%5D%5B0%5D%5Bid%5D=1'))).toEqual([]);
    });
});
