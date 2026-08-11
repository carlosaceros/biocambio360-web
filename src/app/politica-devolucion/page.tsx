import type { Metadata } from 'next';
import LegalPageLayout from '@/components/LegalPageLayout';

export const metadata: Metadata = {
    title: 'Política de Devolución | Biocambio360',
    description: 'Condiciones de devolución, cambio y reembolso de productos Biocambio360.',
};

export default function PoliticaDevolucionPage() {
    return (
        <LegalPageLayout title="Política de Devolución y Garantía" lastUpdated="16 de marzo de 2026">
            <h2>1. Derecho de Retracto</h2>
            <p>
                De conformidad con el artículo 47 de la Ley 1480 de 2011 (Estatuto del Consumidor de Colombia),
                usted tiene derecho a retractarse de la compra dentro de los <strong>cinco (5) días hábiles</strong>{' '}
                siguientes a la entrega del producto.
            </p>
            <p>Para ejercer el derecho de retracto, se deben cumplir las siguientes condiciones:</p>
            <ul>
                <li>El producto no debe haber sido abierto ni utilizado.</li>
                <li>Debe conservar su empaque original y etiquetas.</li>
                <li>Debe encontrarse en las mismas condiciones en que fue recibido.</li>
            </ul>

            <h2>2. Productos Defectuosos o Dañados</h2>
            <p>
                Si recibe un producto en mal estado, con defectos de fabricación, derrame durante el transporte
                o diferente al solicitado, tiene derecho a:
            </p>
            <ol>
                <li><strong>Cambio del producto</strong> por uno igual en perfectas condiciones.</li>
                <li><strong>Reembolso total</strong> del valor pagado por el producto defectuoso.</li>
            </ol>
            <p>
                <strong>Importante:</strong> Debe reportar el inconveniente dentro de las{' '}
                <strong>48 horas</strong> siguientes a la recepción del pedido, adjuntando fotografías o video del
                producto y su empaque.
            </p>

            <h2>3. Productos NO admitidos para devolución</h2>
            <p>
                Por razones de higiene y seguridad, <strong>no se aceptan devoluciones</strong> de productos que
                hayan sido abiertos, parcialmente usados o cuyo sello de seguridad haya sido roto, excepto en
                casos de defecto de fabricación comprobado.
            </p>

            <h2>4. Proceso de Devolución</h2>
            <ol>
                <li>
                    <strong>Contáctanos:</strong> Escríbenos por WhatsApp indicando tu número de pedido, el producto
                    a devolver y el motivo (adjunta fotos).
                </li>
                <li>
                    <strong>Evaluación:</strong> Nuestro equipo revisará tu solicitud en un plazo máximo de{' '}
                    <strong>2 días hábiles</strong> y te confirmará si procede.
                </li>
                <li>
                    <strong>Recogida:</strong> Coordinaremos la recolección del producto sin costo para ti
                    (si el motivo es un defecto o error nuestro).
                </li>
                <li>
                    <strong>Resolución:</strong> Una vez recibido y verificado el producto, procederemos con el
                    cambio o reembolso en un plazo máximo de <strong>10 días hábiles</strong>.
                </li>
            </ol>

            <h2>5. Reembolsos</h2>
            <p>Los reembolsos se realizarán por el mismo medio de pago utilizado en la compra:</p>
            <ul>
                <li>
                    <strong>Pago en línea (Wompi):</strong> El reembolso se procesará a la tarjeta o cuenta
                    utilizada. El plazo puede variar según la entidad financiera (5 a 15 días hábiles).
                </li>
                <li>
                    <strong>Pago contraentrega:</strong> El reembolso se realizará mediante transferencia bancaria
                    a la cuenta indicada por el comprador.
                </li>
            </ul>

            <h2>6. Garantía de Productos</h2>
            <p>
                Todos nuestros productos cuentan con garantía de calidad de Biocambio360 S.A.S. conforme al
                Estatuto del Consumidor. Si un producto no cumple con las especificaciones anunciadas, usted tiene
                derecho a hacerlo efectivo contactándonos por cualquiera de los canales disponibles.
            </p>

            <h2>7. Contacto</h2>
            <p>Para iniciar un proceso de devolución o garantía:</p>
            <ul>
                <li><strong>WhatsApp:</strong> +57 300 XXX XXXX</li>
                <li><strong>Correo:</strong> info@biocambio360.com</li>
            </ul>
        </LegalPageLayout>
    );
}
