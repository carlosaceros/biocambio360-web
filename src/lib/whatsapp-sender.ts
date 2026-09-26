/**
 * Line used for automated reminders (abandoned carts and replenishment): "Biocambio360 Total Limpieza"
 * (+57 323 6045330). The approved templates live in that line's WhatsApp Business Account, and a
 * template can only be sent from numbers of the account where it was created.
 */

export const REMINDER_PHONE_ID = process.env.WHATSAPP_PHONE_ID_LIMPIEZA || '879282705263185';
export const REMINDER_WABA_ID = process.env.WHATSAPP_WABA_ID_LIMPIEZA || '1189762419729483';
