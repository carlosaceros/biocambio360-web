import type { Metadata } from 'next';
import LegalPageLayout from '@/components/LegalPageLayout';

export const metadata: Metadata = {
    title: 'Términos y Condiciones | Biocambio360',
    description: 'Términos y condiciones de uso de la tienda virtual Biocambio360 S.A.S.',
};

export default function TerminosPage() {
    return (
        <LegalPageLayout title="Términos y Condiciones" lastUpdated="16 de marzo de 2026">
            <h2>1. Información General</h2>
            <p>
                El presente documento establece los Términos y Condiciones de uso del sitio web{' '}
                <strong>www.biocambio360.com</strong> (en adelante, "la Plataforma"), propiedad de{' '}
                <strong>Biocambio360 S.A.S.</strong>, sociedad comercial identificada con NIT 901.XXX.XXX-X, con domicilio
                principal en la Cra. 7C #44-17 Sur, Soacha, Cundinamarca, Colombia.
            </p>
            <p>
                Al acceder y utilizar esta Plataforma, usted acepta de manera íntegra y sin reservas los presentes Términos
                y Condiciones. Si no está de acuerdo con alguno de ellos, le solicitamos abstenerse de utilizar nuestros servicios.
            </p>

            <h2>2. Definiciones</h2>
            <ul>
                <li><strong>Usuario:</strong> Toda persona natural o jurídica que acceda, navegue o utilice la Plataforma.</li>
                <li><strong>Comprador:</strong> Usuario que realice una compra a través de la Plataforma.</li>
                <li><strong>Productos:</strong> Los bienes de aseo industrial y doméstico ofrecidos en la Plataforma.</li>
                <li><strong>Pedido:</strong> La solicitud que el Comprador realiza a través de la Plataforma para adquirir Productos.</li>
            </ul>

            <h2>3. Capacidad Legal</h2>
            <p>
                Para realizar compras en la Plataforma, el Usuario debe ser mayor de edad (18 años) y tener capacidad legal
                para celebrar contratos conforme a la legislación colombiana vigente.
            </p>

            <h2>4. Productos y Precios</h2>
            <p>
                Los precios exhibidos en la Plataforma incluyen el Impuesto al Valor Agregado (IVA) cuando aplique y están
                expresados en Pesos Colombianos (COP). Biocambio360 S.A.S. se reserva el derecho de modificar los precios
                sin previo aviso, sin que ello afecte los pedidos ya confirmados.
            </p>
            <p>
                Las imágenes de los productos son de carácter ilustrativo. El empaque real puede variar ligeramente sin afectar
                la calidad o composición del producto.
            </p>

            <h2>5. Proceso de Compra</h2>
            <ol>
                <li>El Usuario selecciona los productos y presentaciones deseadas.</li>
                <li>Agrega los productos al carrito de compras.</li>
                <li>Diligencia el formulario de datos de envío (nombre, cédula, dirección, teléfono).</li>
                <li>Selecciona el método de pago: <strong>Pago contraentrega</strong> o <strong>Pago en línea</strong> (Wompi).</li>
                <li>Confirma el pedido.</li>
                <li>Recibe confirmación por WhatsApp con el resumen de su pedido.</li>
            </ol>

            <h2>6. Métodos de Pago</h2>
            <p>La Plataforma acepta los siguientes métodos de pago:</p>
            <ul>
                <li><strong>Pago Contraentrega:</strong> El Comprador paga en efectivo al momento de recibir su pedido.</li>
                <li><strong>Pago en Línea:</strong> A través de la pasarela de pagos Wompi (tarjetas de crédito, débito, PSE, Nequi y otros medios habilitados).</li>
            </ul>

            <h2>7. Envío y Entrega</h2>
            <p>
                Los pedidos se despachan within los tiempos establecidos en nuestra{' '}
                <a href="/politica-envios">Política de Envíos</a>. El riesgo de pérdida o daño de los productos se
                transfiere al Comprador en el momento de la entrega.
            </p>

            <h2>8. Derecho de Retracto</h2>
            <p>
                Conforme al artículo 47 de la Ley 1480 de 2011 (Estatuto del Consumidor), el Comprador tiene derecho a
                retractarse de la compra dentro de los <strong>cinco (5) días hábiles</strong> siguientes a la entrega del producto,
                siempre que este se encuentre sin uso, en su empaque original y en perfectas condiciones. Para más
                información, consulte nuestra <a href="/politica-devolucion">Política de Devolución</a>.
            </p>

            <h2>9. Propiedad Intelectual</h2>
            <p>
                Todo el contenido de la Plataforma (textos, imágenes, logotipos, diseños, marcas, software) es propiedad
                exclusiva de Biocambio360 S.A.S. o de sus licenciantes. Queda prohibida toda reproducción, distribución
                o comunicación pública sin autorización previa y por escrito.
            </p>

            <h2>10. Limitación de Responsabilidad</h2>
            <p>
                Biocambio360 S.A.S. no será responsable por daños indirectos, incidentales o consecuentes derivados del
                uso de la Plataforma, interrupciones del servicio, virus informáticos o errores en la información publicada
                por terceros.
            </p>

            <h2>11. Protección de Datos Personales</h2>
            <p>
                El tratamiento de datos personales se rige por nuestra <a href="/privacidad">Política de
                Privacidad</a> y por la Ley 1581 de 2012 y sus decretos reglamentarios.
            </p>

            <h2>12. Legislación Aplicable y Jurisdicción</h2>
            <p>
                Los presentes Términos y Condiciones se rigen por las leyes de la República de Colombia. Cualquier
                controversia será sometida a la jurisdicción de los jueces y tribunales de Bogotá D.C., Colombia.
            </p>

            <h2>13. Modificaciones</h2>
            <p>
                Biocambio360 S.A.S. se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento.
                Las modificaciones serán efectivas desde su publicación en la Plataforma. El uso continuado de la
                Plataforma tras la publicación de los cambios constituye aceptación de los mismos.
            </p>

            <h2>14. Contacto</h2>
            <p>
                Para cualquier consulta respecto a estos Términos y Condiciones, puede contactarnos a través de:
            </p>
            <ul>
                <li><strong>WhatsApp:</strong> +57 300 XXX XXXX</li>
                <li><strong>Correo:</strong> info@biocambio360.com</li>
                <li><strong>Dirección:</strong> Cra. 7C #44-17 Sur, Soacha, Cundinamarca</li>
            </ul>
        </LegalPageLayout>
    );
}
