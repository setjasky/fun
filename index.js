const express = require('express');
const cron = require('node-cron');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = process.env.PORT || 3000;

let sock;

// 1. Keep-alive web endpoint for free hosting providers (like Render)
app.get('/', (req, res) => {
  res.send('WhatsApp Birthday Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
  connectToWhatsApp();
});

// 2. WhatsApp Connection Handler via Baileys
async function connectToWhatsApp() {
  // Store authentication state in a local folder (persist this or map to a volume if possible)
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }) // Silence noisy logs
  });

// Check if the session is already registered; if not, request a pairing code
if (!sock.authState.creds.registered) {
  // Format the number without the '+' sign
  const phoneNumber = "6281615735447";
  
  // Wait a short moment for the connection to stabilize before requesting
  setTimeout(async () => {
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(`🔑 Your WhatsApp Pairing Code: ${code}`);
    } catch (error) {
      console.error('Failed to request pairing code:', error);
    }
  }, 3000);
}

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      // Scan this QR code via your WhatsApp mobile app (Linked Devices) on first run
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp bot successfully connected and ready!');
    }
  });
}

// 3. Database Fetch & Birthday Checker Logic Stub
async function checkAndSendBirthdays() {
  console.log('Running daily birthday check...');
  
  try {
    // TODO: Connect to your database (Supabase/PostgreSQL/MongoDB) here.
    // Example query concept:
    // const today = new Date().toISOString().slice(5, 10); // "MM-DD"
    // const birthdays = await db.query('SELECT * FROM members WHERE TO_CHAR(birth_date, "MM-DD") = $1', [today]);

    const birthdaysToCelebrate = [
      { name: 'Friend Name', phone: '628123456789@s.whatsapp.net' } // Format: countrycode + number @s.whatsapp.net
    ];

    for (const member of birthdaysToCelebrate) {
      const message = `Happy Birthday, ${member.name}! Wishing you a fantastic year ahead! 🎂🎉`;
      
      if (sock) {
        await sock.sendMessage(member.phone, { text: message });
        console.log(`Birthday message sent to ${member.name}`);
      }
    }
  } catch (error) {
    console.error('Error checking or sending birthdays:', error, error);
  }
}

// 4. Daily Cron Job Scheduler
// Runs every day at 8:00 AM server time: '0 8 * * *'
cron.schedule('0 8 * * *', () => {
  console.log('Cron trigger activated: Checking birthdays...');
  checkAndSendBirthdays();
});