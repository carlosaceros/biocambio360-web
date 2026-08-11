import type { Metadata } from 'next';
import LegalPageLayout from '@/components/LegalPageLayout';

export const metadata: Metadata = {
    title: 'Política de Envíos | Biocambio360',
    description: 'Cobertura, tiempos de entrega y costos de envío de Productos Biocambio360 a nivel nacional.',
};

export default function PoliticaEnviosPage() {
    return (
        <LegalPageLayout title="Política de Envíos" lastUpdated="16 de marzo de 2026">
            <h2>1. Cobertura</h2>
            <p>
                Realizamos envíos a <strong>toda Colombia</strong>. Los tiempos y costos de envío pueden variar
                según la ciudad y departamento de destino.
            </p>

            <h2>2. Tiempos de Entrega</h2>
            <table>
                <thead>
                    <tr>
                        <th>Zona</th>
                        <th>Tiempo Estimado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Bogotá & Soacha</td>
                        <td>1 - 2 días hábiles</td>
                    </tr>
                    <tr>
                        <td>Cundinamarca (otros municipios)</td>
                        <td>2 - 3 días hábiles</td>
                    </tr>
                    <tr>
                        <td>Ciudades principales (Medellín, Cali, Barranquilla)</td>
                        <td>3 - 5 días hábiles</td>
                    </tr>
                    <tr>
                        <td>Resto de Colombia</td>
                        <td>5 - 8 días hábiles</td>
                    </tr>
                </tbody>
            </table>
            <p>
                <strong>Nota:</strong> Los tiempos indicados son estimados y comienzan a contar a partir de la
                confirmación del pedido (no desde su creación). Factores externos como clima, paros o festividades
                pueden generar demoras adicionales.
            </p>

            <h2>3. Costos de Envío</h2>
            <ul>
                <li><strong>Envío gratis:</strong> En pedidos superiores a <strong>$100.000 COP</strong>.</li>
                <li><strong>Pedidos menores a $100.000 COP:</strong> Se aplica una tarifa de envío calculada al
                    momento del checkout según las dimensiones del pedido y la dirección de destino.</li>
            </ul>

            <h2>4. Proceso de Despacho</h2>
            <ol>
                <li><strong>Pedido recibido:</strong> Tu pedido entra a la cola de preparación en nuestra fábrica.</li>
                <li><strong>Preparación:</strong> Se envasa, revisa calidad y empaca para transporte seguro.</li>
                <li><strong>Despacho:</strong> Se entrega a la transportadora asignada.</li>
                <li><strong>En camino:</strong> La transportadora realiza la ruta de entrega.</li>
                <li><strong>Entregado:</strong> El paquete llega a la dirección indicada.</li>
            </ol>
            <p>
                Recibirás notificaciones por <strong>WhatsApp</strong> en cada etapa del proceso para que puedas
                hacer seguimiento en tiempo real.
            </p>

            <h2>5. Empaque y Seguridad</h2>
            <p>
                Todos nuestros productos se embalan con materiales de protección adecuados para productos líquidos
                industriales: caja reforzada, sellos de seguridad y protección contra derrames. Si recibes un
                producto dañado por la transportadora, contáctanos inmediatamente por WhatsApp con fotos del daño.
            </p>

            <h2>6. Dirección Incorrecta</h2>
            <p>
                Es responsabilidad del Comprador asegurarse de que los datos de envío sean correctos y completos.
                En caso de devolución por dirección incorrecta o incompleta, los costos de reenvío correrán por
                cuenta del Comprador.
            </p>

            <h2>7. Intentos de Entrega</h2>
            <p>
                La transportadora realizará hasta <strong>dos (2) intentos de entrega</strong>. Si no se logra la
                entrega en el segundo intento, el paquete será devuelto a nuestra fábrica y se contactará al
                Comprador para coordinar un nuevo envío (con costo adicional de transporte).
            </p>
        </LegalPageLayout>
    );
}
