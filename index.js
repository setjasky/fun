const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update;

    // Request pairing code when the socket triggers connection updates and isn't registered yet
    if (!sock.authState.creds.registered) {
      const phoneNumber = "6281615735447"; // Your phone number without '+'
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`🔑 Your WhatsApp Pairing Code: ${code}`);
      } catch (err) {
        console.error("Error getting pairing code:", err);
      }
    }

    if (connection === 'open') {
      console.log('✅ Bot connected to WhatsApp successfully!');
    }
  });
}

startBot();