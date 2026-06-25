const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { enviarWhatsApp } = require('../utils/callmebot');

function linkCliente(telefone, nome, servico, data, hora) {
  const tel  = telefone.replace(/\D/g, '');
  const fone = tel.startsWith('55') ? tel : '55' + tel;
  const msg  = `Olá ${nome}! Lembrando do seu agendamento: *${servico}* em *${data} às ${hora}*. Te esperamos! ✂️`;
  return `https://wa.me/${fone}?text=${encodeURIComponent(msg)}`;
}

// GET /api/lembretes/processar — chamado pelo cron-job.org a cada 5 min
router.get('/processar', async (req, res) => {
  try {
    const agora = new Date();
    const agendamentos = await db('agendamentos as a')
      .join('clientes as c', 'a.cliente_id', 'c.id')
      .join('servicos as s', 'a.servico_id', 's.id')
      .select(
        'a.id', 'a.data_hora', 'a.lembrete_60_enviado', 'a.lembrete_15_enviado',
        'c.nome as cliente_nome', 'c.telefone as cliente_telefone',
        's.nome as servico_nome'
      )
      .whereNot('a.status', 'cancelado')
      .whereNot('a.status', 'concluido');

    const enviados = [];

    for (const ag of agendamentos) {
      const inicio  = new Date(ag.data_hora + '-03:00');
      const diffMin = (inicio - agora) / 60000;
      const data = ag.data_hora.slice(0, 10).split('-').reverse().join('/');
      const hora = ag.data_hora.slice(11, 16);
      const link = linkCliente(ag.cliente_telefone, ag.cliente_nome, ag.servico_nome, data, hora);

      // Lembrete 60 min antes (janela: 55–65 min)
      if (!ag.lembrete_60_enviado && diffMin >= 55 && diffMin <= 65) {
        const msg = `⏰ Daqui 1h!\n👤 ${ag.cliente_nome}\n💈 ${ag.servico_nome}\n📅 ${data} às ${hora}\n📞 ${ag.cliente_telefone}`;
        await enviarWhatsApp(msg);
        await enviarWhatsApp(link);
        await db('agendamentos').where({ id: ag.id }).update({ lembrete_60_enviado: true });
        enviados.push({ id: ag.id, tipo: '60min' });
      }

      // Lembrete 15 min antes (janela: 10–20 min)
      if (!ag.lembrete_15_enviado && diffMin >= 10 && diffMin <= 20) {
        const msg = `🔔 Daqui 15min!\n👤 ${ag.cliente_nome}\n💈 ${ag.servico_nome}\n📅 ${data} às ${hora}\n📞 ${ag.cliente_telefone}`;
        await enviarWhatsApp(msg);
        await enviarWhatsApp(link);
        await db('agendamentos').where({ id: ag.id }).update({ lembrete_15_enviado: true });
        enviados.push({ id: ag.id, tipo: '15min' });
      }
    }

    res.json({ ok: true, processados: agendamentos.length, enviados });
  } catch (err) {
    console.error('Erro ao processar lembretes:', err);
    res.status(500).json({ erro: 'Erro ao processar lembretes.' });
  }
});

module.exports = router;