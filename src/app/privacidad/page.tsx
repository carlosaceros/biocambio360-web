import type { Metadata } from 'next';
import LegalPageLayout from '@/components/LegalPageLayout';
import { Download, FileText, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Política de Tratamiento de Datos Personales | Biocambio360',
    description: 'Política oficial de tratamiento de datos personales de BIOCAMBIO 360 SAS (NIT 901798484-4) conforme a la Ley 1581 de 2012.',
};

export default function PrivacidadPage() {
    return (
        <LegalPageLayout title="Política de Tratamiento de Datos Personales" lastUpdated="Año 2026">
            {/* Header Action Banner - Download PDF */}
            <div className="not-prose mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 text-base">Documento Oficial PDF Institucional</h3>
                        <p className="text-xs text-gray-600">
                            BIOCAMBIO 360 SAS · NIT: 901798484-4 · Matrícula Mercantil 3779375
                        </p>
                    </div>
                </div>
                <a
                    href="/politica-tratamiento-datos-biocambio360-2026.pdf"
                    download="politica-tratamiento-datos-biocambio360-2026.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[var(--brand-blue)] hover:bg-blue-700 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex-shrink-0"
                >
                    <Download size={16} />
                    Descargar PDF Oficial
                </a>
            </div>

            {/* Corporate Info Card */}
            <div className="not-prose grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 text-xs text-gray-700">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <MapPin size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <strong className="block text-gray-900 font-bold">Domicilio Principal</strong>
                        <span>Cra 7C No. 42 - 22 Sur, Soacha, Cundinamarca</span>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <Phone size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <strong className="block text-gray-900 font-bold">Líneas de Atención</strong>
                        <span>(601) 903 3405 · 300 654 2853 · 324 100 5353</span>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <Mail size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <strong className="block text-gray-900 font-bold">Canal Oficial PQRS</strong>
                        <span className="font-semibold text-blue-700 break-all">infobiocambio360@gmail.com</span>
                    </div>
                </div>
            </div>

            <h2>1. Identificación del Responsable del Tratamiento</h2>
            <p>
                <strong>BIOCAMBIO 360 SAS</strong>, sociedad comercial debidamente constituida bajo las leyes de la República de Colombia, 
                identificada con <strong>NIT 901798484-4</strong>, inscrita bajo el número de matrícula <strong>3779375</strong> en la Cámara de Comercio de Bogotá, 
                con domicilio principal en la ciudad de Soacha (Cundinamarca), y en su calidad de empresa privada dedicada a la fabricación, 
                distribución y venta de productos de aseo, actúa como <strong>Responsable del Tratamiento</strong> de los datos personales.
            </p>
            <p>
                Para todos los efectos relacionados con esta Política, el ejercicio de los derechos de los titulares y la gestión de peticiones, consultas y reclamos (PQRS), 
                BIOCAMBIO 360 SAS ha dispuesto el siguiente canal oficial de contacto:
            </p>
            <ul>
                <li><strong>Correo electrónico de atención:</strong> <a href="mailto:infobiocambio360@gmail.com">infobiocambio360@gmail.com</a></li>
                <li><strong>Sitio Web Oficial:</strong> <a href="https://www.biocambio360.com" target="_blank" rel="noopener noreferrer">www.biocambio360.com</a></li>
            </ul>

            <h2>2. Marco Normativo y Ámbito de Aplicación</h2>
            <p>
                Esta Política se fundamenta en el <strong>Artículo 15 de la Constitución Política de Colombia</strong>, la <strong>Ley Estatutaria 1581 de 2012</strong>, 
                el <strong>Decreto 1074 de 2015 (Capítulo 25)</strong> y las instrucciones emitidas por la <strong>Superintendencia de Industria y Comercio (SIC)</strong>. 
                Aplica a todas las bases de datos personales (clientes, prospectos, proveedores, empleados y aliados comerciales) que sean objeto de tratamiento por parte de 
                BIOCAMBIO 360 SAS y por terceros encargados que actúen en su nombre.
            </p>

            <h2>3. Principios Rectores de la Gobernanza de Datos</h2>
            <p>En el ejercicio de su actividad económica, la empresa aplica de manera integral los siguientes principios exigidos por la ley:</p>
            <ul>
                <li><strong>Legalidad y Finalidad:</strong> El tratamiento obedece a fines legítimos, específicos e informados al titular.</li>
                <li><strong>Libertad:</strong> El tratamiento solo se ejercerá con el consentimiento previo, expreso e informado del titular. No se asumen consentimientos tácitos.</li>
                <li><strong>Transparencia:</strong> Se garantiza el derecho del titular a obtener en cualquier momento información sobre sus datos.</li>
                <li><strong>Acceso y Circulación Restringida:</strong> Los datos no están expuestos en internet sin controles y solo son tratados por personal autorizado.</li>
                <li><strong>Seguridad y Confidencialidad:</strong> Se aplican estrictas medidas técnicas, humanas y administrativas para evitar la pérdida, filtración o acceso no autorizado.</li>
                <li><strong>Calidad, Veracidad y Minimización:</strong> Se recolectan únicamente los datos exactos y estrictamente necesarios para la gestión del negocio y el marketing.</li>
                <li><strong>Responsabilidad Demostrada (Accountability):</strong> BIOCAMBIO 360 SAS está en capacidad de probar ante la SIC la implementación de estas medidas de protección.</li>
            </ul>

            <h2>4. Derechos de los Titulares (Habeas Data)</h2>
            <p>Los titulares de los datos personales tratados por la empresa tienen derecho a:</p>
            <ol>
                <li><strong>Conocer, actualizar y rectificar</strong> sus datos personales frente a información inexacta, incompleta o fraccionada.</li>
                <li><strong>Solicitar prueba</strong> de la autorización otorgada para el tratamiento.</li>
                <li><strong>Ser informado</strong> sobre el uso específico que se le ha dado a sus datos.</li>
                <li><strong>Revocar la autorización y/o solicitar la supresión</strong> del dato cuando no se respeten las garantías legales o cuando el titular no desee recibir más información comercial.</li>
                <li><strong>Acceder en forma gratuita</strong> a sus datos personales.</li>
                <li><strong>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC)</strong> por infracciones a la normatividad de protección de datos.</li>
            </ol>

            <h2>5. Finalidades del Tratamiento</h2>
            <p>BIOCAMBIO 360 SAS recolecta datos personales mediante su sitio web, call center, redes sociales y relaciones corporativas para las siguientes finalidades:</p>
            <ul>
                <li><strong>Clientes (B2C y E-commerce):</strong> Procesar ventas, facturación, despachos y entregas de productos de aseo; realizar atención al cliente, encuestas de satisfacción, fidelización y gestión de garantías.</li>
                <li><strong>Marketing y Publicidad:</strong> Enviar información comercial, promociones y ofertas a través de correos electrónicos, SMS, WhatsApp y llamadas telefónicas, previa autorización explícita para este fin.</li>
                <li><strong>Clientes B2B (Hoteles y Empresas):</strong> Verificar antecedentes comerciales, aperturar cupos de crédito, facturar, enviar muestras físicas y realizar visitas de prospección comercial.</li>
                <li><strong>Empleados y Proveedores:</strong> Gestionar procesos de selección, contratación, pago de nómina, afiliación a seguridad social, cumplimiento en seguridad y salud en el trabajo, y pagos a proveedores.</li>
            </ul>

            <h2>6. Requisitos Específicos para Marketing y Atención al Cliente</h2>
            <ul>
                <li><strong>Derecho de Oposición (Opt-out):</strong> En todas las campañas de marketing (SMS, correo, WhatsApp), BIOCAMBIO 360 SAS garantiza un mecanismo ágil, claro y gratuito para que el usuario solicite su retiro o supresión de la base de datos publicitaria. Al recibir la solicitud, las campañas dirigidas a ese usuario se suspenderán inmediatamente.</li>
                <li><strong>Trazabilidad y Origen Lícito:</strong> La empresa conserva evidencia (física o digital) del momento y canal donde el titular otorgó su autorización. No se utilizan bases de datos compradas o compartidas sin soporte contractual y legal.</li>
            </ul>

            <h2>7. Procedimiento para Atención de Consultas y Reclamos (PQRS)</h2>
            <p>
                Toda solicitud para ejercer los derechos de Habeas Data debe enviarse al correo <strong>infobiocambio360@gmail.com</strong>, indicando:
            </p>
            <ul>
                <li>Nombre completo y número de documento de identidad del titular.</li>
                <li>Descripción clara y precisa de la solicitud (consulta, actualización, rectificación o supresión).</li>
                <li>Datos de contacto para notificación (teléfono, correo electrónico o dirección física).</li>
            </ul>
            <p>Los términos de respuesta se regirán conforme a la ley:</p>
            <ul>
                <li><strong>Consultas (Conocer información):</strong> Serán atendidas en un plazo máximo de <strong>diez (10) días hábiles</strong>. Si no es posible, se informará al titular y se responderá en máximo cinco (5) días hábiles adicionales.</li>
                <li><strong>Reclamos (Actualizar, rectificar, suprimir o revocar):</strong> Serán atendidos en un plazo máximo de <strong>quince (15) días hábiles</strong>. Si la solicitud requiere más tiempo, se informará al interesado y se extenderá hasta por ocho (8) días hábiles adicionales.</li>
            </ul>

            <h2>8. Seguridad, Encargados y Ciclo de Vida del Dato</h2>
            <ul>
                <li><strong>Contratos con Encargados:</strong> Cuando la empresa comparta datos con agencias de publicidad, CRM, plataformas de envío masivo o empresas logísticas, se firmarán acuerdos de transmisión de datos para garantizar la confidencialidad.</li>
                <li><strong>Seguridad:</strong> Se implementan controles de acceso, contraseñas robustas y copias de seguridad. Se evaluará el impacto en la privacidad antes de ejecutar nuevas automatizaciones o integraciones tecnológicas.</li>
                <li><strong>Retención y Eliminación:</strong> Los datos se conservarán únicamente durante el tiempo necesario para la finalidad informada o el exigido por normas contables y laborales, procediendo posteriormente a su eliminación segura.</li>
            </ul>

            <h2>9. Registro Nacional de Bases de Datos (RNBD)</h2>
            <p>
                BIOCAMBIO 360 SAS cumplirá con la obligación legal de registrar y actualizar sus bases de datos ante el RNBD administrado por la Superintendencia de Industria y Comercio (SIC), en caso de superar el tope de activos fijado por la ley colombiana.
            </p>

            <h2>10. Vigencia y Actualización</h2>
            <p>
                La presente Política entra en vigor a partir de su publicación oficial. La empresa se reserva el derecho de modificarla para adaptarla a novedades legislativas, comunicando cualquier cambio sustancial a los titulares a través de su sitio web oficial.
            </p>

            {/* Signature & Approval Block */}
            <div className="not-prose mt-10 p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <span className="text-[11px] font-black tracking-wider uppercase text-blue-700 flex items-center gap-1.5">
                        <ShieldCheck size={14} /> Documento Oficial Aprobado
                    </span>
                    <h4 className="text-lg font-black text-gray-900">Danilo Espinal Ospina</h4>
                    <p className="text-xs font-bold text-gray-600">Representante Legal</p>
                    <p className="text-xs text-gray-500">BIOCAMBIO 360 SAS · NIT: 901798484-4</p>
                </div>

                <a
                    href="/politica-tratamiento-datos-biocambio360-2026.pdf"
                    download="politica-tratamiento-datos-biocambio360-2026.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex-shrink-0"
                >
                    <Download size={16} />
                    Descargar PDF Oficial Firmado
                </a>
            </div>
        </LegalPageLayout>
    );
}
