import type { Metadata } from 'next';
import LegalPageLayout from '@/components/LegalPageLayout';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Términos y Condiciones del Programa de Referidos y Fidelización | Biocambio360',
    description: 'Políticas, términos, condiciones y aclaraciones normativas del programa de referidos Comunidad BioCambio360 conforme a la Ley 1480 de 2011 y normatividad colombiana vigente.',
};

export default function TerminosReferidosPage() {
    return (
        <LegalPageLayout 
            title="Términos y Condiciones del Programa de Referidos y Fidelización" 
            lastUpdated="8 de septiembre de 2026"
        >
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mb-8 not-prose">
                <p className="text-xs sm:text-sm text-amber-900 font-medium leading-relaxed">
                    <strong className="font-bold text-amber-950 block mb-1">Aviso Regulatorio al Consumidor (Ley 1480 de 2011 — Estatuto del Consumidor):</strong>
                    El presente reglamento define de manera clara, transparente, oportuna y verificable las condiciones de tiempo, modo, lugar, elegibilidad, acreditación, vigencia, topes y redención del programa de fidelización comercial y recomendación de clientes <em>"Comunidad BioCambio360"</em>, operado por <strong>BIOCAMBIO360 S.A.S.</strong> en el territorio de la República de Colombia.
                </p>
            </div>

            <h2>1. Identificación del Operador y Responsable</h2>
            <p>
                El programa de referidos y fidelización es de titularidad, diseño y operación exclusiva de:
            </p>
            <ul>
                <li><strong>Razón Social:</strong> BIOCAMBIO360 S.A.S. (en adelante, "la Empresa" o "BioCambio360").</li>
                <li><strong>NIT:</strong> 901.798.484-4.</li>
                <li><strong>Domicilio Principal:</strong> Soacha / Cundinamarca, República de Colombia.</li>
                <li><strong>Sitio Web Oficial:</strong> <a href="https://biocambio360.com">https://biocambio360.com</a>.</li>
                <li><strong>Canal Oficial de PQR y Atención al Consumidor:</strong> WhatsApp corporativo <a href="https://wa.me/573241005353" target="_blank" rel="noopener noreferrer">+57 324 100 5353</a> y correo electrónico <a href="mailto:ventas@biocambio360.com">ventas@biocambio360.com</a>.</li>
            </ul>

            <h2>2. Objeto del Programa</h2>
            <p>
                El Programa <strong>"Comunidad BioCambio360"</strong> es una estrategia promocional y de incentivos de lealtad dirigida a clientes finales (personas naturales mayores de edad o personas jurídicas debidamente representadas) que premia la recomendación efectiva de nuestros productos de aseo, limpieza y desinfección concentrados de fábrica a nuevos compradores en Colombia.
            </p>

            <h2>3. Definiciones Operativas y Legales</h2>
            <p>Para la correcta interpretación de estos Términos y Condiciones, se entenderá por:</p>
            <ul>
                <li>
                    <strong>Embajador o Cliente Referidor:</strong> Persona natural mayor de 18 años o persona jurídica con capacidad legal que habiendo realizado previamente al menos una compra calificada en BioCambio360, se registra voluntariamente en el programa y comparte su código o enlace unívoco de recomendación.
                </li>
                <li>
                    <strong>Amigo Referido o Nuevo Cliente:</strong> Persona natural o jurídica que no cuenta con compras previas registradas en las bases de datos de BioCambio360 y realiza su primer pedido calificado a través del enlace o código del Embajador.
                </li>
                <li>
                    <strong>Código / Enlace Único de Referido:</strong> Identificador alfanumérico o enlace web individualizado (ej. <code>biocambio360.com/?ref=CODIGO</code>) asignado por la plataforma al Embajador para la trazabilidad de sus recomendaciones.
                </li>
                <li>
                    <strong>Saldo de Embajador / Crédito Promocional:</strong> Bonificación comercial no monetizable acreditada en la cuenta virtual del Embajador expresada en Pesos Colombianos (COP), destinada única y exclusivamente a ser redimida como descuento comercial en sus propias compras posteriores en la tienda virtual.
                </li>
                <li>
                    <strong>Compra Calificada:</strong> Aquel pedido cuyo subtotal de productos (excluyendo el costo de flete/envío) sea igual o superior a <strong>Cincuenta Mil Pesos Colombianos ($50.000 COP)</strong>, que sea efectivamente entregado por la transportadora y recaudado en su totalidad.
                </li>
            </ul>

            <h2>4. Naturaleza Jurídica y Aclaraciones Tributarias / Financieras Fundamentales</h2>
            <p>
                De conformidad con la legislación mercantil, tributaria y de protección al consumidor de la República de Colombia, se realizan las siguientes precisiones de orden público:
            </p>
            <ol>
                <li>
                    <strong>No constituye dinero en efectivo ni divisa:</strong> Los saldos acumulados, bonos o puntos del programa <strong>no tienen valor de cambio fiduciario</strong>, no configuran moneda de curso legal, no son transferibles a cuentas bancarias, billeteras digitales (Nequi, Daviplata, Dale, Transfiya ni similares), ni pueden ser liquidados en cheque ni dinero físico bajo ninguna circunstancia.
                </li>
                <li>
                    <strong>No constituye captación masiva de dineros:</strong> El programa no recibe depósitos del público ni realiza intermediación financiera vigilada por la Superintendencia Financiera de Colombia (Decreto 663 de 1993 - Estatuto Orgánico del Sistema Financiero). Se trata de un sistema de descuento comercial condicionado concedido por mera liberalidad mercantil.
                </li>
                <li>
                    <strong>Inexistencia de relación laboral o comercial de dependencia:</strong> La participación como Embajador es enteramente autónoma, facultativa y voluntaria. En ningún caso genera vínculo laboral, salario, prestaciones sociales (Art. 23 del Código Sustantivo del Trabajo), contrato de mandato ni agencia mercantil (Art. 1317 del Código de Comercio). El Embajador no tiene representación legal ni facultad de comprometer a la Empresa.
                </li>
                <li>
                    <strong>Intransferibilidad:</strong> El saldo y los cupones generados son personales e intransferibles. No pueden ser vendidos, cedidos, heredados ni transferidos entre cuentas de usuarios distintos.
                </li>
            </ol>

            <h2>5. Requisitos de Elegibilidad y Activación</h2>
            <p>Para participar como Embajador activo y disfrutar de las recompensas, el usuario debe cumplir copulativamente con:</p>
            <ul>
                <li>Ser mayor de 18 años y residir en el territorio de la República de Colombia.</li>
                <li>
                    <strong>Condición de Cliente Previo Verificado:</strong> El Embajador debe contar con al menos una compra propia previa registrada en la plataforma igual o superior a <strong>$50.000 COP</strong> en estado <em>"confirmado"</em>, <em>"enviado"</em> o <em>"entregado"</em>. Si un usuario que nunca ha comprado comparte un código, el sistema retendrá preventivamente las recompensas hasta tanto el titular verifique su calidad de cliente consumidor real de la marca.
                </li>
                <li>Aceptar expresamente los presentes Términos y la Política de Tratamiento de Datos Personales (Ley 1581 de 2012).</li>
            </ul>

            <h2>6. Mecánica de Beneficio Doble (Artículo 33 de la Ley 1480 de 2011)</h2>
            <p>
                En cumplimiento del deber de información precisa sobre promociones y ofertas, la estructura de incentivos opera bajo la modalidad de beneficio mutuo condicionada a compras calificadas:
            </p>

            <div className="overflow-x-auto not-prose my-6">
                <table className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <thead className="bg-slate-900 text-white font-black text-left">
                        <tr>
                            <th className="p-3.5">Parte Beneficiaria</th>
                            <th className="p-3.5">Beneficio Otorgado</th>
                            <th className="p-3.5">Condición de Activación</th>
                            <th className="p-3.5">Tope / Restricción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        <tr>
                            <td className="p-3.5 font-bold text-gray-900">Amigo Referido (Nuevo Cliente)</td>
                            <td className="p-3.5 text-emerald-700 font-extrabold">Bono de $10.000 COP de descuento</td>
                            <td className="p-3.5 text-gray-600">Primer pedido con subtotal mínimo de $50.000 COP</td>
                            <td className="p-3.5 text-gray-600">Válido únicamente en la 1ª compra. No acumulable con otros cupones.</td>
                        </tr>
                        <tr>
                            <td className="p-3.5 font-bold text-gray-900">Embajador (Cliente Referidor)</td>
                            <td className="p-3.5 text-blue-700 font-extrabold">$10.000 COP en saldo acumulable</td>
                            <td className="p-3.5 text-gray-600">Cuando la compra del referido sea entregada y recaudada</td>
                            <td className="p-3.5 text-gray-600">Hasta 15 referidos calificados. Redención máx. 50% de su propia compra.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h2>7. Condición Suspensiva de Acreditación (Saldo Pendiente vs. Saldo Disponible)</h2>
            <p>
                Para garantizar la viabilidad del programa y proteger el comercio leal contra compras ficticias o desistimientos:
            </p>
            <ul>
                <li>
                    <strong>Saldo Pendiente:</strong> Al momento en que el Amigo Referido finaliza exitosamente su orden en el sitio web, el sistema registra una bonificación de $10.000 COP en estado provisional o <em>"Pendiente"</em> en el perfil del Embajador.
                </li>
                <li>
                    <strong>Saldo Disponible:</strong> Dicha bonificación pasa a estado <em>"Disponible"</em> exclusivamente cuando la empresa de logística y mensajería aliada certifique la entrega física del paquete a satisfacción y se verifique el recaudo íntegro del dinero (en pagos contraentrega o pasarela Wompi).
                </li>
                <li>
                    <strong>Anulación por Retracto, Cancelación o Devolución:</strong> Si el pedido del Amigo Referido es cancelado antes de despacho, rechazado en el momento de la entrega, devuelto por dirección errada o es objeto de ejercicio del Derecho de Retracto (Art. 47 Ley 1480 de 2011), el saldo pendiente correlativo se anulará de pleno derecho y sin lugar a indemnización alguna.
                </li>
            </ul>

            <h2>8. Reglas de Redención de Saldo en la Tienda</h2>
            <p>
                El Embajador podrá utilizar su saldo acumulado disponible para realizar compras en <a href="https://biocambio360.com">biocambio360.com</a> bajo los siguientes lineamientos:
            </p>
            <ul>
                <li>
                    <strong>Umbral Mínimo de Redención:</strong> Se requiere tener un saldo disponible mínimo de <strong>Diez Mil Pesos ($10.000 COP)</strong> para generar un cupón de redención.
                </li>
                <li>
                    <strong>Generación de Cupón Exclusivo:</strong> Al pulsar el botón "Redimir Saldo" en la sección <code>/comunidad</code>, el sistema genera automáticamente un cupón unívoco de descuento asociado a su número de teléfono.
                </li>
                <li>
                    <strong>Tope Máximo de Descuento por Compra (50%):</strong> El valor del cupón de saldo acumulado podrá cubrir como <strong>máximo hasta el cincuenta por ciento (50%) del valor total del pedido</strong> del Embajador. El cincuenta por ciento (50%) restante de los productos y el costo del flete (si aplica según cobertura de zona) deberán ser pagados a través de los medios habituales (Contraentrega o Wompi).
                </li>
                <li>
                    <strong>Uso Único:</strong> Cada cupón generado es de un solo uso y se consume íntegramente en la transacción en la cual se aplica.
                </li>
            </ul>

            <h2>9. Término de Vigencia y Caducidad de los Créditos (Art. 33 Ley 1480/2011)</h2>
            <p>
                En aplicación del principio de certeza en las ofertas promocionales:
            </p>
            <ul>
                <li>
                    Los saldos en estado <em>"Disponible"</em> tendrán una vigencia máxima e improrrogable de <strong>sesenta (60) días calendario</strong> contados a partir de la fecha exacta de su acreditación efectiva.
                </li>
                <li>
                    Vencido dicho término de 60 días sin que el Embajador haya redimido los créditos en compras en la plataforma, los saldos caducarán automáticamente y serán dados de baja del sistema sin lugar a compensaciones económicas o reintegros.
                </li>
            </ul>

            <h2>10. Niveles de Fidelización (Bronce, Aliado Frecuente y Embajador VIP)</h2>
            <p>
                El programa premia la constancia de recomendaciones con beneficios adicionales de fábrica según el volumen de ventas efectivamente entregadas atribuibles al Embajador:
            </p>
            <ol>
                <li>
                    <strong>Nivel 1 - Cliente Referidor (1 a 2 compras entregadas):</strong> Acumulación básica de $10.000 COP por cada nuevo cliente calificado.
                </li>
                <li>
                    <strong>Nivel 2 - Aliado Frecuente (3 a 9 compras entregadas):</strong> Bonificación regular de $10.000 COP más obsequio de producto adicional de 1 Litro o ½ Galón en sus compras directas posteriores.
                </li>
                <li>
                    <strong>Nivel 3 - Embajador VIP BioCambio360 (10 o más compras entregadas):</strong> Acceso a kit de muestras de fábrica para demostración en restaurantes, comercios o instituciones, soporte prioritario por WhatsApp y acceso a preventas exclusivas.
                </li>
            </ol>

            <h2>11. Política Estricta Antifraude y Prácticas Prohibidas</h2>
            <p>
                BioCambio360 promueve una comunidad de recomendaciones honesta y basada en la buena fe mercantil (Art. 871 del Código de Comercio). Quedan expresamente prohibidas las siguientes conductas, las cuales serán consideradas causales de exclusión inmediata:
            </p>
            <ul>
                <li>
                    <strong>Autorreferidos:</strong> Queda prohibido que el Embajador intente utilizar su propio código para sus compras personales mediante la creación de cuentas espejo, uso de cédulas de terceros sin autorización, teléfonos secundarios o simulación de identidad. El sistema audita automáticamente coincidencia de número telefónico, cédula, dirección IP y georreferenciación de entrega.
                </li>
                <li>
                    <strong>Prácticas de SPAM y Publicidad No Deseada:</strong> El Embajador debe compartir su enlace de forma personalizada y voluntaria con sus círculos de confianza (amigos, familiares, vecinos, colegas o clientes de su negocio). Queda terminantemente prohibido el envío masivo de correos no solicitados (spam), difusión no autorizada en grupos públicos de WhatsApp o redes sociales mediante bots, o publicidad engañosa prometiendo beneficios distintos a los aquí consignados.
                </li>
                <li>
                    <strong>Uso Indebido de Marca:</strong> El Embajador no podrá suplantar la identidad oficial de BioCambio360, pautar en motores de búsqueda (Google Ads, Meta Ads) utilizando la marca registrada "BioCambio360", ni ofrecer los productos a precios diferentes a los vigentes en la tienda oficial.
                </li>
            </ul>
            <p>
                <strong>Consecuencias del Fraude:</strong> En caso de comprobarse maniobras fraudulentas, BioCambio360 S.A.S. se reserva la facultad de cancelar unilateralmente la cuenta del Embajador, anular todos los saldos y cupones obtenidos irregularmente e iniciar las acciones civiles o penales a que haya lugar.
            </p>

            <h2>12. Tratamiento de Datos Personales (Ley 1581 de 2012 y Decreto 1377 de 2013)</h2>
            <p>
                Los datos personales recolectados en el marco del programa (nombre, número de celular, cédula, correo electrónico y ciudad) serán tratados conforme a nuestra <Link href="/privacidad">Política de Tratamiento de Datos Personales</Link> con las siguientes finalidades:
            </p>
            <ul>
                <li>Administrar y liquidar los incentivos, saldos y cupones de fidelización.</li>
                <li>Notificar vía WhatsApp, SMS o correo electrónico el estado de los pedidos recomendados, saldo acreditado y novedades de fábrica.</li>
                <li>Prevenir fraudes y validar la identidad de los beneficiarios.</li>
            </ul>
            <p>
                El titular puede ejercer en todo momento sus derechos de consulta, actualización, rectificación y supresión (derechos ARCO) escribiendo a <code>ventas@biocambio360.com</code>.
            </p>

            <h2>13. Modificación, Suspensión o Terminación del Programa</h2>
            <p>
                BioCambio360 S.A.S. se reserva el derecho de modificar, actualizar, suspender temporalmente o dar por terminado el Programa de Referidos en cualquier momento por razones comerciales, operativas o regulatorias.
            </p>
            <p>
                Cualquier cambio sustancial en las condiciones del programa será notificado a los participantes con al menos <strong>quince (15) días calendario de anticipación</strong> mediante publicación destacada en el sitio web y en la sección <code>/comunidad</code>. Durante dicho periodo de aviso previo, los usuarios podrán hacer uso de los saldos que ya tengan en estado <em>"Disponible"</em> conforme a las reglas vigentes al momento de su acumulación.
            </p>

            <h2>14. Peticiones, Quejas, Reclamos (PQR) y Régimen Sancionatorio</h2>
            <p>
                Cualquier duda, inconformidad o solicitud de aclaración relativa a la liquidación de saldos o aplicación de cupones será atendida por nuestro equipo de servicio al cliente en un plazo máximo de quince (15) días hábiles conforme a la Ley 1480 de 2011:
            </p>
            <ul>
                <li><strong>Línea WhatsApp:</strong> <a href="https://wa.me/573241005353" target="_blank" rel="noopener noreferrer">+57 324 100 5353</a></li>
                <li><strong>Correo Electrónico:</strong> <a href="mailto:ventas@biocambio360.com">ventas@biocambio360.com</a></li>
                <li><strong>Autoridad de Vigilancia y Control:</strong> Superintendencia de Industria y Comercio (SIC) — <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer">www.sic.gov.co</a>.</li>
            </ul>

            <h2>15. Ley Aplicable y Domicilio Contractual</h2>
            <p>
                Los presentes Términos y Condiciones se rigen de manera exclusiva por las leyes vigentes de la República de Colombia. Para todos los efectos legales, se fija como domicilio contractual la ciudad de Soacha / Bogotá D.C., Cundinamarca.
            </p>
        </LegalPageLayout>
    );
}
