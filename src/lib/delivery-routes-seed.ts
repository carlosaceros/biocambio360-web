/** Initial routes transcribed from the printed delivery format of September 2026 (own fleet). */

import type { DeliveryRoute } from '@/lib/delivery-schedule';

const A = { '2026-09': [1, 3, 7, 9, 11, 15, 17, 21, 23, 25, 29], '2026-10': [1, 5, 7, 9] };
const B = { '2026-09': [2, 4, 8, 10, 14, 16, 18, 22, 24, 28, 30], '2026-10': [2, 6, 8] };
const VALID_BACKUP = { validFrom: '2026-09-03', validTo: '2026-09-10', notes: 'Agendar con Biocambio del 3 al 10 de septiembre. Fuera de Bogotá: junto con Biocambio.', driverName: 'Walter (Chan Chan)', driverPhone: '3112241112' };

export const SEED_ROUTES: DeliveryRoute[] = [
    { id: 'seed-sur-centro-daniel', name: 'Sur y centro (Daniel)', zones: ['Antonio Nariño', 'Rafael Uribe Uribe', 'San Cristóbal', 'Tunjuelito'], mode: 'dates', dates: A, driverName: 'Daniel', driverPhone: '3194514479', active: true },
    { id: 'seed-centro-norte-deyvid', name: 'Centro y norte (Deyvid – Heiler)', zones: ['La Candelaria', 'Los Mártires', 'Santa Fe', 'Puente Aranda (después de Av. 1 de Mayo)', 'Barrios Unidos', 'Usaquén', 'Chapinero', 'Teusaquillo'], mode: 'dates', dates: A, driverName: 'Deyvid / Heiler', driverPhone: '3103443285 / 3133468016', active: true },
    { id: 'seed-sur-oriente-suba', name: 'Ciudad Bolívar, Usme y Suba (Daniel – Deyvid)', zones: ['Ciudad Bolívar', 'Usme', 'Suba'], mode: 'dates', dates: B, driverName: 'Daniel / Deyvid', active: true },
    { id: 'seed-occidente-alex', name: 'Occidente (Alex)', zones: ['Engativá', 'Fontibón'], mode: 'dates', dates: A, driverName: 'Alex', driverPhone: '3173529424', active: true },
    { id: 'seed-sur-diario', name: 'Sur diario (Sandro – Edilberto)', zones: ['Ciudad Bolívar (Estancia, Madelena, Rincón Valvanera, Casa Blanca, Primavera 2, Perdomo Bajo)', 'Sibaté', 'Bosa', 'Kennedy', 'Puente Aranda (antes de Av. 1 de Mayo)'], mode: 'daily', driverName: 'Sandro / Edilberto', driverPhone: '3106899176 / 3126070447', active: true },
    { id: 'seed-miercoles-sabana-occidente', name: 'Sabana occidente – miércoles (Giovanny)', zones: ['Facatativá', 'Madrid', 'Mosquera', 'Funza'], mode: 'dates', dates: { '2026-09': [2, 9, 16, 23, 30], '2026-10': [7, 14] }, driverName: 'Giovanny', driverPhone: '3159284260', active: true },
    { id: 'seed-jueves-sabana-norte', name: 'Sabana norte – jueves (Giovanny)', zones: ['Briceño', 'Sopó', 'Tocancipá', 'Zipaquirá', 'Chía', 'Cajicá'], mode: 'dates', dates: { '2026-09': [3, 10, 17, 24], '2026-10': [1, 8] }, driverName: 'Giovanny', driverPhone: '3159284260', active: true },
    { id: 'seed-cogua', name: 'Cogua (Giovanny)', zones: ['Cogua'], mode: 'dates', dates: { '2026-09': [24] }, driverName: 'Giovanny', active: true },
    { id: 'seed-cota-siberia', name: 'Cota y Siberia (Giovanny)', zones: ['Cota', 'Siberia'], mode: 'dates', dates: { '2026-09': [10, 24] }, driverName: 'Giovanny', active: true },
    { id: 'seed-guaymaral', name: 'Guaymaral (Giovanny)', zones: ['Guaymaral'], mode: 'dates', dates: { '2026-09': [3, 17], '2026-10': [1] }, driverName: 'Giovanny', active: true },
    { id: 'seed-casa-brava', name: 'Casa Brava – viernes (Giovanny)', zones: ['Casa Brava'], mode: 'dates', dates: { '2026-09': [4, 18] }, driverName: 'Giovanny', active: true },
    { id: 'seed-pedidos-grandes', name: 'Pedidos grandes – viernes (Giovanny)', zones: ['Pedidos grandes'], mode: 'dates', dates: { '2026-10': [2, 16] }, driverName: 'Giovanny', active: true },
    { id: 'seed-fusagasuga', name: 'Fusagasugá y alrededores – sábado (Alex)', zones: ['Fusagasugá', 'Silvania', 'Subia', 'Granada'], mode: 'dates', dates: { '2026-09': [5, 26] }, driverName: 'Alex', driverPhone: '3173529424', active: true },
    { id: 'seed-respaldo-mar-jue', name: 'Respaldo martes y jueves (Walter)', zones: ['Antonio Nariño', 'Rafael Uribe Uribe', 'San Cristóbal', 'Tunjuelito', 'La Candelaria', 'Los Mártires', 'Puente Aranda', 'Ciudad Bolívar', 'Santa Fe'], mode: 'weekdays', weekdays: [2, 4], ...VALID_BACKUP, active: true },
    { id: 'seed-respaldo-lun-mie-vie', name: 'Respaldo lunes, miércoles y viernes (Walter)', zones: ['Engativá', 'Fontibón', 'Usaquén', 'Suba', 'Teusaquillo', 'Barrios Unidos', 'Chapinero'], mode: 'weekdays', weekdays: [1, 3, 5], ...VALID_BACKUP, active: true },
    { id: 'seed-respaldo-mar-jue-sab', name: 'Respaldo martes, jueves y sábado (Walter)', zones: ['Kennedy', 'Bosa', 'Soacha'], mode: 'weekdays', weekdays: [2, 4, 6], ...VALID_BACKUP, active: true },
];
