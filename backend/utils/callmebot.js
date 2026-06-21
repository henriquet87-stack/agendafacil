const MIN_INTERVALO_MS = 20000;
let ultimoEnvio = 0;

async function enviarWhatsApp(mensagem) {
  const telefone = process.env.BARBEIRO_TELEFONE;
  const apikey   = process.env.CALLMEBOT_APIKEY;
  if (!telefone || !apikey) return;

  const agora  = Date.now();
  const espera = ultimoEnvio + MIN_INTERVALO_MS - agora;
  if (espera > 0) {
    await new Promise(r => setTimeout(r, espera));
  }
  ultimoEnvio = Date.now();

  const url = `https://api.callmebot.com/whatsapp.php?phone=${telefone}&text=${encodeURIComponent(mensagem)}&apikey=${apikey}`;

  try {
    const res = await fetch(url);
    const texto = await res.text();
    console.log(`📲 CallMeBot: ${res.status} — ${texto}`);
  } catch (err) {
    console.error('📲 CallMeBot erro:', err.message);
  }
}

module.exports = { enviarWhatsApp };