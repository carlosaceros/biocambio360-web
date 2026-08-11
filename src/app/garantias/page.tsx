import type { Metadata } from 'next';
import LegalPageLayout from '@/components/LegalPageLayout';

export const metadata: Metadata = {
    title: 'Garantías | Biocambio360',
    description: 'Garantía de calidad industrial de los productos de aseo fabricados por Biocambio360 S.A.S.',
};

export default function GarantiasPage() {
    return (
        <LegalPageLayout title="Garantías Biocambio360" lastUpdated="16 de marzo de 2026">
            <h2>Nuestro Compromiso de Calidad</h2>
            <p>
                En <strong>Biocambio360 S.A.S.</strong> fabricamos cada producto bajo estrictos estándares
                de calidad industrial. Nuestra garantía respalda que cada producto que sale de nuestra fábrica en
                Soacha cumple con las especificaciones técnicas anunciadas.
            </p>

            <h2>¿Qué cubre nuestra garantía?</h2>
            <ul>
                <li>
                    <strong>Concentración y rendimiento:</strong> Garantizamos que la formulación del producto
                    corresponde a lo descrito en la ficha técnica (pH, concentración de activos, poder limpiador).
                </li>
                <li>
                    <strong>Empaque íntegro:</strong> Sellado hermético sin derrames. Si el producto llega con
                    el envase dañado, lo reemplazamos sin costo.
                </li>
                <li>
                    <strong>Vida útil:</strong> Todos nuestros productos tienen una vida útil mínima de{' '}
                    <strong>12 meses</strong> a partir de la fecha de fabricación indicada en el envase, siempre
                    que se almacenen en condiciones adecuadas (lugar fresco, seco, bajo techo, sin exposición
                    directa al sol).
                </li>
            </ul>

            <h2>¿Qué NO cubre la garantía?</h2>
            <ul>
                <li>Daños causados por uso indebido o mezcla con otros productos químicos.</li>
                <li>Almacenamiento inadecuado (temperaturas extremas, exposición solar directa).</li>
                <li>Productos abiertos con más de 90 días de uso.</li>
                <li>Reacciones a superficies no compatibles (ej. blanqueador en aluminio sin diluir).</li>
            </ul>

            <h2>Certificaciones y Normatividad</h2>
            <ul>
                <li>Cumplimiento con la normatividad <strong>INVIMA</strong> para productos de aseo.</li>
                <li>Formulación con tensoactivos biodegradables según norma <strong>OECD 301D</strong>.</li>
                <li>Fichas Técnicas y Hojas de Seguridad (MSDS) disponibles para clientes institucionales.</li>
            </ul>

            <h2>¿Cómo hacer efectiva la garantía?</h2>
            <ol>
                <li>Escriba por WhatsApp indicando su <strong>número de pedido</strong> y el motivo del reclamo.</li>
                <li>Adjunte <strong>fotos del producto</strong> y una descripción del problema.</li>
                <li>Nuestro equipo técnico evaluará el caso en un plazo máximo de <strong>3 días hábiles</strong>.</li>
                <li>Si procede, coordinaremos la <strong>reposición o reembolso sin costo</strong> para usted.</li>
            </ol>

            <h2>Contacto para Garantías</h2>
            <ul>
                <li><strong>WhatsApp:</strong> +57 300 XXX XXXX</li>
                <li><strong>Correo:</strong> info@biocambio360.com</li>
            </ul>
        </LegalPageLayout>
    );
}
