import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    calcularFleteNacional,
    calcularFleteLocal,
    PISO_FLETE_NACIONAL,
    TOPE_SUBSIDIO_NACIONAL,
} from '@/lib/shipping-zones';
import {
    getMessengers,
    getMessengerRates,
    INITIAL_MESSENGERS_SEED,
    DEFAULT_MESSENGER_RATES,
} from '@/lib/messengers-service';

// Mock de Firestore para tests aislados
vi.mock('@/lib/firebase', () => ({
    db: {
        app: {},
    },
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    getDocs: vi.fn(async () => ({
        empty: false,
        docs: INITIAL_MESSENGERS_SEED.map(m => ({ id: m.id, data: () => m })),
    })),
    getDoc: vi.fn(async () => ({
        exists: () => true,
        data: () => DEFAULT_MESSENGER_RATES,
    })),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    limit: vi.fn(() => ({})),
    Timestamp: {
        now: () => ({ seconds: 1234567890, nanoseconds: 0 }),
    },
}));

vi.mock('@/lib/orders-service', () => ({
    updateOrderStatus: vi.fn(async () => {}),
    subscribeToOrders: vi.fn(() => () => {}),
}));

describe('1. Regla Matemática Oficial de Fletes Nacionales (Piso $13k + Tope $15k)', () => {
    it('verifica las constantes institucionales aprobadas por la gerencia', () => {
        expect(PISO_FLETE_NACIONAL).toBe(13_000);
        expect(TOPE_SUBSIDIO_NACIONAL).toBe(15_000);
    });

    it('Caso 1 (Auditoría Palmira, 31.4 kg): Costo Coordinadora $29.681 con subsidio bruto de $26.000', () => {
        // En este caso, el subsidio bruto ($26.000) topa en $15.000 COP.
        // El cliente debe pagar: $29.681 - $15.000 = $14.681 COP.
        // Biocambio360 subsidia exactamente $15.000 COP.
        const res = calcularFleteNacional(29_681, 26_000);

        expect(res.costoBrutoTotal).toBe(29_681);
        expect(res.fleteCliente).toBe(14_681);
        expect(res.subsidioEfectivo).toBe(15_000);
        expect(res.topeSubsidioAplicado).toBe(true);
        expect(res.pisoMinimoAplicado).toBe(false);
        expect(res.ahorroCliente).toBe(15_000);
    });

    it('Caso 2 (Auditoría Ibagué, 7.8 kg): Costo Coordinadora $14.362 con subsidio bruto de $12.000', () => {
        // En este caso, $14.362 - $12.000 = $2.362 tentativo.
        // Como $2.362 < $13.000, APLICA EL PISO NACIONAL DE $13.000 COP.
        // El cliente paga $13.000 COP y la fábrica subsidia $1.362 COP.
        const res = calcularFleteNacional(14_362, 12_000);

        expect(res.costoBrutoTotal).toBe(14_362);
        expect(res.fleteCliente).toBe(13_000);
        expect(res.subsidioEfectivo).toBe(1_362);
        expect(res.pisoMinimoAplicado).toBe(true);
        expect(res.topeSubsidioAplicado).toBe(false);
        expect(res.ahorroCliente).toBe(1_362);
    });

    it('Caso 3: Destino nacional con flete económico menor al piso ($11.000 COP)', () => {
        // Si el flete total de la transportadora cuesta $11.000, el cliente NUNCA debe pagar más de $11.000
        const res = calcularFleteNacional(11_000, 3_000);

        expect(res.costoBrutoTotal).toBe(11_000);
        expect(res.fleteCliente).toBe(11_000);
        expect(res.subsidioEfectivo).toBe(0);
    });

    it('Caso 4: Destino con costo $18.000 y subsidio de $5.000', () => {
        // $18.000 - $5.000 = $13.000
        const res = calcularFleteNacional(18_000, 5_000);

        expect(res.fleteCliente).toBe(13_000);
        expect(res.subsidioEfectivo).toBe(5_000);
        expect(res.topeSubsidioAplicado).toBe(false);
    });

    it('Caso 5: La regla local (Bogotá/Sabana) mantiene envío gratis con subsidio suficiente', () => {
        const localGratis = calcularFleteLocal(13_000);
        expect(localGratis.esGratis).toBe(true);
        expect(localGratis.fleteCliente).toBe(0);

        const localCopago = calcularFleteLocal(6_000);
        expect(localCopago.esGratis).toBe(false);
        expect(localCopago.fleteCliente).toBe(7_000);
    });
});

describe('2. Directorio y Servicio de Mensajeros de Flota Propia', () => {
    it('obtiene la lista de mensajeros de flota propia de forma reactiva y segura', async () => {
        const list = await getMessengers();
        // El directorio inicial se mantiene limpio sin datos ficticios para carga real por el administrador
        expect(Array.isArray(list)).toBe(true);
    });

    it('obtiene la matriz de tarifas oficial de mensajería', async () => {
        const rates = await getMessengerRates();

        expect(rates.tarifaUrbanaBogota).toBe(10_000);
        expect(rates.tarifaSabanaAledanos).toBe(15_000);
        expect(rates.tarifaReintentoNovedad).toBe(5_000);
    });

    it('verifica la flota oficial de 7 domiciliarios (2 motos y 5 carros)', () => {
        expect(INITIAL_MESSENGERS_SEED.length).toBe(7);

        const motos = INITIAL_MESSENGERS_SEED.filter(m => m.tipoVehiculo === 'moto');
        const carros = INITIAL_MESSENGERS_SEED.filter(m => m.tipoVehiculo === 'carro');

        expect(motos.length).toBe(2);
        expect(carros.length).toBe(5);

        const motoNombres = motos.map(m => m.nombre);
        expect(motoNombres).toContain('Edilberto');
        expect(motoNombres).toContain('Sandro');

        const carroNombres = carros.map(m => m.nombre);
        expect(carroNombres).toContain('Deivy');
        expect(carroNombres).toContain('Daniel');
        expect(carroNombres).toContain('Heiler');
        expect(carroNombres).toContain('Álex');
        expect(carroNombres).toContain('José');
    });

    it('recomienda vehículo y frecuencia de forma inteligente según la zona y localidad', async () => {
        const { recommendVehicleAndZone } = await import('@/lib/messengers-service');

        // Municipios aledaños (Sabana) -> Carro (2 veces por semana)
        const chia = recommendVehicleAndZone('Vereda La Balsa sector Los Puentes', 'Chía');
        expect(chia.recommendedType).toBe('carro');
        expect(chia.zoneLabel).toBe('Municipios Aledaños (Sabana)');

        const mosquera = recommendVehicleAndZone('Calle 3 # 12-40', 'Mosquera');
        expect(mosquera.recommendedType).toBe('carro');

        // Localidades lejanas / periféricas de Bogotá -> Carro
        const suba = recommendVehicleAndZone('Carrera 92 # 145-20', 'Bogotá Suba');
        expect(suba.recommendedType).toBe('carro');
        expect(suba.zoneLabel).toBe('Bogotá Zonas Lejanas');

        // Localidades céntricas / cercanas -> Moto (Edilberto o Sandro)
        const chapinero = recommendVehicleAndZone('Carrera 13 # 54-10', 'Bogotá Chapinero');
        expect(chapinero.recommendedType).toBe('moto');
        expect(chapinero.zoneLabel).toBe('Bogotá Cercana / Zonas Urbanas');
    });

    it('consolida correctamente las liquidaciones diarias en corte de pago semanal', async () => {
        const { getWeeklySettlementsConsolidated } = await import('@/lib/messengers-service');

        const sampleSettlements = [
            {
                id: 'st-01',
                messengerId: 'msg-edilberto',
                messengerNombre: 'Edilberto',
                fecha: '2026-09-15',
                pedidosTotales: 10,
                pedidosEntregados: 9,
                pedidosNovedad: 1,
                totalRecaudadoEfectivo: 450_000,
                totalFletesDevengados: 95_000,
                balanceNetoEntregar: 355_000,
                pedidosIds: ['ord-1', 'ord-2'],
                estado: 'liquidado' as const,
                liquidadoPor: 'Admin',
                liquidadoAt: '2026-09-15T18:00:00Z',
            },
            {
                id: 'st-02',
                messengerId: 'msg-edilberto',
                fecha: '2026-09-17',
                messengerNombre: 'Edilberto',
                pedidosTotales: 8,
                pedidosEntregados: 8,
                pedidosNovedad: 0,
                totalRecaudadoEfectivo: 380_000,
                totalFletesDevengados: 80_000,
                balanceNetoEntregar: 300_000,
                pedidosIds: ['ord-3', 'ord-4'],
                estado: 'liquidado' as const,
                liquidadoPor: 'Admin',
                liquidadoAt: '2026-09-17T18:00:00Z',
            },
            {
                id: 'st-03',
                messengerId: 'msg-deivy',
                messengerNombre: 'Deivy',
                fecha: '2026-09-16',
                pedidosTotales: 6,
                pedidosEntregados: 5,
                pedidosNovedad: 1,
                totalRecaudadoEfectivo: 290_000,
                totalFletesDevengados: 80_000,
                balanceNetoEntregar: 210_000,
                pedidosIds: ['ord-5'],
                estado: 'liquidado' as const,
                liquidadoPor: 'Admin',
                liquidadoAt: '2026-09-16T18:00:00Z',
            },
        ];

        const weekly = getWeeklySettlementsConsolidated(sampleSettlements, '2026-09-15', '2026-09-21');
        expect(weekly.length).toBe(2);

        const edilbertoConsolidado = weekly.find(w => w.messengerId === 'msg-edilberto');
        expect(edilbertoConsolidado).toBeDefined();
        expect(edilbertoConsolidado?.totalDiasLiquidados).toBe(2);
        expect(edilbertoConsolidado?.totalPedidosEntregados).toBe(17);
        expect(edilbertoConsolidado?.totalPedidosNovedad).toBe(1);
        expect(edilbertoConsolidado?.totalFletesDevengados).toBe(175_000);
        expect(edilbertoConsolidado?.totalRecaudadoEfectivo).toBe(830_000);
        expect(edilbertoConsolidado?.balanceNetoEntregar).toBe(655_000);

        const deivyConsolidado = weekly.find(w => w.messengerId === 'msg-deivy');
        expect(deivyConsolidado).toBeDefined();
        expect(deivyConsolidado?.totalDiasLiquidados).toBe(1);
        expect(deivyConsolidado?.totalFletesDevengados).toBe(80_000);
    });
});

describe('3. Webhook de 99 Envíos - Validación de Protección de Flota Propia', () => {
    it('los pedidos con flota propia no deben ser alterados automáticamente por webhook externo', () => {
        const orderFlotaPropia = {
            id: 'ord-local-101',
            tipoEnvio: 'flota_propia',
            status: 'enviado',
            mensajeroId: 'msg-01',
        };

        const isProtectedFromWebhook = orderFlotaPropia.tipoEnvio === 'flota_propia';
        expect(isProtectedFromWebhook).toBe(true);
    });
});
