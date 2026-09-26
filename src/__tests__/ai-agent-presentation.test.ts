import { describe, it, expect } from 'vitest';
import {
    isClosingAck, farewellText, stripMoreHelpQuestion,
    priceLineToBlock, reformatPriceMessages, stripSizeEnumeration, ensurePaymentList, fixDayPart, stripFarewell, ensureClosingQuestion, injectPriceList, PAYMENT_BLOCK,
} from '@/lib/ai-agent-guard';

describe('agent presentation', () => {
    it('price line → checkmark block', () => {
        expect(priceLineToBlock('Suavizante Floral: 1/2G $19.000 · 3.8L $34.000 · 10L $66.000 · 20L $103.000')).toBe(
            '*Suavizante Floral*\n✅ 1/2 galón: $19.000\n✅ Galón: $34.000\n✅ 10L: $66.000\n✅ 20L: $103.000'
        );
        expect(priceLineToBlock('- Detergente X: 1/2 galón $19.000 · galón $34.000.')).toContain('✅ Galón: $34.000');
        expect(priceLineToBlock('¿Cuál te interesa?')).toBeNull();
        expect(priceLineToBlock('✅ 1/2 galón: $19.000')).toBeNull();
    });
    it('reformat splits products and keeps text', () => {
        const r = reformatPriceMessages(['Estas son las opciones:\nProducto A: 10L $1.000 · 20L $2.000', 'Producto B: 10L $1.500']);
        expect(r.hadBlocks).toBe(true);
        expect(r.messages).toEqual(['Estas son las opciones:', '*Producto A*\n✅ 10L: $1.000\n✅ 20L: $2.000', '*Producto B*\n✅ 10L: $1.500']);
    });
    it('strips size enumeration but not price blocks', () => {
        expect(stripSizeEnumeration(['¿Qué presentación y cuántas? Tenemos 1/2 galón, galón (3.8L), 10L y 20L.'])).toEqual(['¿Qué presentación y cuántas?']);
        expect(stripSizeEnumeration(['*A*\n✅ 1/2 galón: $1\n✅ 10L: $2\n✅ 20L: $3'])).toHaveLength(1);
    });
    it('payment list', () => {
        const asks = ensurePaymentList(['Perfecto.', '¿Cómo te gustaría pagar?'], false);
        expect(asks).toEqual(['Perfecto.', PAYMENT_BLOCK, '¿Cómo te gustaría pagar?']);
        expect(ensurePaymentList(['Perfecto.', '¿Cómo te gustaría pagar?'], true)).toHaveLength(2);
        const inline = ensurePaymentList(['Aceptamos transferencia, ADDI, tarjeta y PSE. ¿Cuál prefieres?'], false);
        expect(inline[0]).toContain('✅ ADDI');
        expect(inline[1]).toBe('¿Cuál prefieres?');
    });
    it('day part coherence', () => {
        expect(fixDayPart('¡Que tengas un lindo día!', 'noche')).toBe('¡Que tengas una linda noche!');
        expect(fixDayPart('Que tengas un buen día', 'tarde')).toBe('Que tengas una buena tarde');
        expect(fixDayPart('Que tengas una linda noche', 'manana')).toBe('Que tengas un lindo día');
        expect(fixDayPart('¡Buenos días! Hola', 'noche')).toBe('¡Buenas noches! Hola');
    });
    it('farewell replaced by closing question', () => {
        const msgs = ensureClosingQuestion(stripFarewell(['Listo, un asesor te contactará en la mañana. ¡Que tengas una linda noche! 😊']));
        expect(msgs[0]).toBe('Listo, un asesor te contactará en la mañana.');
        expect(msgs[1]).toContain('Estaré atenta');
        expect(stripFarewell(['Espero que tengas un buen día con tu pedido.'])).toHaveLength(1);
        expect(ensureClosingQuestion(['¿Cuántas unidades?'])).toHaveLength(1);
    });
    it('detects closing acknowledgements', () => {
        for (const t of ['No muchas gracias', 'Bueno', 'ok', 'Gracias!', 'Listo 👍', '👍', 'No, gracias', 'Igualmente', 'Buenas noches']) expect(isClosingAck(t), t).toBe(true);
        for (const t of ['Quiero 2 galones de suavizante', '¿Cuánto cuesta el desengrasante?', 'no me llegó mi pedido', 'Sí, mi dirección es calle 5 # 3-2']) expect(isClosingAck(t), t).toBe(false);
    });
    it('farewell by time of day and no repeated "algo más"', () => {
        expect(farewellText('noche')).toContain('Feliz noche');
        expect(farewellText('manana')).toContain('Feliz día');
        expect(stripMoreHelpQuestion(['De acuerdo, estaré atenta si necesitas algo más.', '¿Hay algo más en lo que pueda ayudarte? Estaré atenta a resolver tus inquietudes o solicitudes 😊'])).toEqual([]);
        expect(stripMoreHelpQuestion(['Listo, un asesor te contactará. ¿Hay algo más en lo que pueda ayudarte?'])).toEqual(['Listo, un asesor te contactará.']);
    });
    it('inject price list keeps question last', () => {
        const out = injectPriceList(['Hola', '¿Cuál?'], 'Opciones:', '- A: 10L $1.000 · 20L $2.000');
        expect(out).toEqual(['Hola', 'Opciones:', '*A*\n✅ 10L: $1.000\n✅ 20L: $2.000', '¿Cuál?']);
    });
});

import { expandCustomerQuery } from '@/lib/ai-agent-knowledge';
describe('customer wording', () => {
    it('jabón para ropa means detergente, jabón de manos does not', () => {
        expect(expandCustomerQuery('me traen un jabón de 20 litros para ropa')).toMatch(/detergente$/);
        expect(expandCustomerQuery('jabón líquido de manos')).toBe('jabón líquido de manos');
        expect(expandCustomerQuery('quiero detergente')).toBe('quiero detergente');
    });
});
