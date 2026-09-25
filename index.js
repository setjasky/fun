const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const checkAndSendBirthdays = require('./birthdayChecker');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('WhatsApp Birthday Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot connected to WhatsApp successfully!');
      // Check birthdays right when the bot connects
      await checkAndSendBirthdays(supabase, sock);
    }
  });

  // Request pairing code safely if not already registered
  if (!sock.authState.creds.registered) {
    const phoneNumber = "6281615735447"; // Your phone number without '+'
    
    // Give the socket a few seconds to establish its initial handshake
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`🔑 Your WhatsApp Pairing Code: ${code}`);
      } catch (err) {
        console.error("Error getting pairing code:", err);
      }
    }, 4000);
  }
}

startBot();

// Function to check birthdays and send messages
async function checkAndSendBirthdays(sock) {
  try {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedToday = `${month}-${day}`;

    console.log(`🔍 Checking birthdays for: ${formattedToday}`);

    // Fetch all members from Supabase
    const { data: members, error } = await supabase
      .from('members')
      .select('*');

    if (error) {
      console.error('❌ Error fetching members:', error);
      return;
    }

    // Filter members whose birth_date month-day matches today
    const todaysBirthdays = members.filter(member => {
      // member.birth_date is usually "YYYY-MM-DD"
      const birthDateStr = member.birth_date; 
      const memberMonthDay = birthDateStr.slice(5, 10); // Extracts "MM-DD"
      return memberMonthDay === formattedToday;
    });

    if (todaysBirthdays.length === 0) {
      console.log('📭 No birthdays found for today.');
      return;
    }

    for (const member of todaysBirthdays) {
      const phoneNumber = member.phone.replace(/\D/g, '');
      const jid = `${phoneNumber}@s.whatsapp.net`;
      const message = `🎉 Happy Birthday, ${member.name}! 
      Barakallahu fii umrik... 
      
      Wishing you a wonderful day and a fantastic year ahead! 
      🎂🎈`;

      await sock.sendMessage(jid, { text: message });
      console.log(`✅ Sent birthday greeting to ${member.name}`);
    }
  } catch (err) {
    console.error('❌ Error checking birthdays:', err);
  }
}