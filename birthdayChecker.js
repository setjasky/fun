// birthdayChecker.js
async function checkAndSendBirthdays(supabase, sock) {
  try {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedToday = `${month}-${day}`;

    console.log(`🔍 Checking birthdays for: ${formattedToday}`);

    const { data: members, error } = await supabase
      .from('members')
      .select('*');

    if (error) {
      console.error('❌ Error fetching members:', error);
      return;
    }

    const todaysBirthdays = members.filter(member => {
      const birthDateStr = member.birth_date;
      return birthDateStr.slice(5, 10) === formattedToday;
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

module.exports = checkAndSendBirthdays;