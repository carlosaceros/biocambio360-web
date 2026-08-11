import type { Metadata } from 'next';
import LegalPageLayout from '@/components/LegalPageLayout';

export const metadata: Metadata = {
    title: 'Política de Privacidad | Biocambio360',
    description: 'Política de privacidad y tratamiento de datos personales de Biocambio360 S.A.S.',
};

export default function PrivacidadPage() {
    return (
        <LegalPageLayout title="Política de Privacidad y Tratamiento de Datos" lastUpdated="16 de marzo de 2026">
            <h2>1. Responsable del Tratamiento</h2>
            <p>
                <strong>Biocambio360 S.A.S.</strong>, identificada con NIT 901.XXX.XXX-X, con domicilio en la
                Cra. 7C #44-17 Sur, Soacha, Cundinamarca, Colombia, es la responsable del tratamiento de los datos
                personales recolectados a través de la plataforma <strong>www.biocambio360.com</strong>.
            </p>

            <h2>2. Marco Normativo</h2>
            <p>
                Esta política se rige por la Constitución Política de Colombia (Art. 15), la Ley Estatutaria 1581 de 2012,
                el Decreto Reglamentario 1377 de 2013 (compilado en el Decreto 1074 de 2015), y demás normatividad
                concordante vigente sobre protección de datos personales en Colombia.
            </p>

            <h2>3. Datos Personales Recolectados</h2>
            <p>Recolectamos los siguientes datos personales cuando usted realiza una compra o interactúa con nuestra plataforma:</p>
            <ul>
                <li><strong>Datos de identificación:</strong> Nombre completo, número de cédula de ciudadanía.</li>
                <li><strong>Datos de contacto:</strong> Número de celular, correo electrónico (opcional).</li>
                <li><strong>Datos de ubicación:</strong> Departamento, ciudad, dirección de entrega.</li>
                <li><strong>Datos de transacción:</strong> Historial de pedidos, montos, métodos de pago seleccionados.</li>
                <li><strong>Datos de navegación:</strong> Dirección IP, tipo de navegador, páginas visitadas (mediante cookies y herramientas de analítica).</li>
            </ul>

            <h2>4. Finalidades del Tratamiento</h2>
            <p>Sus datos personales serán utilizados para las siguientes finalidades:</p>
            <ol>
                <li>Procesar, gestionar y entregar sus pedidos.</li>
                <li>Contactarlo respecto al estado de su pedido (vía WhatsApp o correo electrónico).</li>
                <li>Generar facturación y cumplir obligaciones tributarias.</li>
                <li>Mejorar nuestros productos y la experiencia de usuario en la plataforma.</li>
                <li>Enviar comunicaciones comerciales y promocionales (solo con su consentimiento previo).</li>
                <li>Atender peticiones, quejas, reclamos y sugerencias (PQRS).</li>
                <li>Cumplir con obligaciones legales, contractuales y regulatorias.</li>
            </ol>

            <h2>5. Derechos del Titular</h2>
            <p>
                Como titular de datos personales, usted tiene derecho a:
            </p>
            <ul>
                <li>Conocer, actualizar y rectificar sus datos personales.</li>
                <li>Solicitar prueba de la autorización otorgada.</li>
                <li>Ser informado sobre el uso que se le da a sus datos personales.</li>
                <li>Revocar la autorización y/o solicitar la supresión de sus datos cuando no se respeten los principios, derechos y garantías constitucionales y legales.</li>
                <li>Acceder gratuitamente a sus datos personales que hayan sido objeto de tratamiento.</li>
            </ul>

            <h2>6. Procedimiento para Ejercer sus Derechos</h2>
            <p>
                Para ejercer cualquiera de los derechos mencionados, puede enviar su solicitud por escrito a:
            </p>
            <ul>
                <li><strong>Correo electrónico:</strong> info@biocambio360.com</li>
                <li><strong>WhatsApp:</strong> +57 300 XXX XXXX</li>
                <li><strong>Dirección física:</strong> Cra. 7C #44-17 Sur, Soacha, Cundinamarca</li>
            </ul>
            <p>
                La solicitud deberá incluir: nombre completo, número de identificación, descripción de los hechos que dan
                lugar a la solicitud, dirección y datos de contacto del titular. Biocambio360 S.A.S. dará respuesta en un
                plazo máximo de <strong>quince (15) días hábiles</strong> contados a partir de la recepción de la solicitud.
            </p>

            <h2>7. Cookies y Tecnologías de Seguimiento</h2>
            <p>
                Utilizamos cookies y herramientas de analítica (como Vercel Analytics) para mejorar la experiencia de
                navegación, analizar el tráfico del sitio y personalizar contenido. Estas herramientas recopilan información
                de forma anónima y agregada. Usted puede desactivar las cookies desde la configuración de su navegador.
            </p>

            <h2>8. Seguridad de la Información</h2>
            <p>
                Biocambio360 S.A.S. implementa medidas técnicas, humanas y administrativas razonables para proteger los datos
                personales contra acceso no autorizado, pérdida, alteración o uso indebido. Los datos de pago en línea son
                procesados exclusivamente por la pasarela Wompi y no son almacenados en nuestros servidores.
            </p>

            <h2>9. Transferencia Internacional de Datos</h2>
            <p>
                Los datos pueden ser alojados en servidores ubicados fuera de Colombia (como Google Cloud y Vercel) que
                cumplen con estándares internacionales de protección de datos. Biocambio360 S.A.S. garantiza que los
                terceros receptores cumplen con niveles adecuados de protección de datos.
            </p>

            <h2>10. Vigencia</h2>
            <p>
                Los datos personales serán conservados durante el tiempo necesario para cumplir las finalidades descritas
                y las obligaciones legales aplicables. Una vez cumplida la finalidad, los datos serán eliminados de forma
                segura.
            </p>

            <h2>11. Documento Oficial PDF</h2>
            <p>
                Puede consultar o descargar el documento oficial completo firmante de la política de tratamiento de datos personales de Biocambio360 S.A.S.:
            </p>
            <div className="my-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                    <strong className="block text-blue-950 font-bold">V2 POLÍTICA DE TRATAMIENTO DE DATOS BIOCAMBIO360 2026.pdf</strong>
                    <span className="text-xs text-blue-700">Documento institucional en formato PDF</span>
                </div>
                <a 
                    href="/politica-tratamiento-datos-biocambio360-2026.pdf" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-[var(--brand-blue)] text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                    📄 Ver PDF Oficial
                </a>
            </div>

            <h2>12. Modificaciones</h2>
            <p>
                Esta política puede ser actualizada en cualquier momento. La versión vigente estará siempre disponible en
                esta página. Le recomendamos revisarla periódicamente.
            </p>
        </LegalPageLayout>
    );
}
