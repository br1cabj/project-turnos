import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_b5jn9pd';
const TEMPLATE_ID = 'template_m117ku8';
const PUBLIC_KEY = '0NBRwDs182i0ly8U4';

export const sendNewBookingAlert = async (bookingData, ownerEmail) => {
  try {
    const templateParams = {
      owner_email: ownerEmail,
      client_name: bookingData.client,
      client_phone: bookingData.clientPhone,
      service_name: bookingData.title,
      date: bookingData.start.toLocaleDateString(),
      time: bookingData.start.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      business_name: bookingData.tenantName,
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    console.log('Email enviado exitosamente');
    return true;
  } catch (error) {
    console.error('Error al enviar el email: ', error);
    return false;
  }
};
