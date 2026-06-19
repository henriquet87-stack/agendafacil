const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { enviarWhatsApp } = require('../utils/callmebot');
const novo = await selectAgendamento(db('agendamentos as a')).where('a.id', id).first();

// Só notifica se o agendamento for com mais de 20 min de antecedência
const diffMin = (new Date(novo.data_hora + '-03:00') - new Date()) / 60000;
if (diffMin > 20) {
  notificarBarbeiro(novo).catch(() => {});
}

res.status(201).json(novo);

// Envia notificação WhatsApp ao barbeiro via CallMeBot (fire-and-forget)
async function notificarBarbeiro(agendamento) {
  const data = agendamento.data_hora.slice(0, 10).split('-').reverse().join('/');
  const hora = agendamento.data_hora.slice(11, 16);
  const msg  = `✂️ Novo agendamento!\n👤 ${agendamento.cliente_nome}\n💈 ${agendamento.servico_nome}\n📅 ${data} às ${hora}`;
  await enviarWhatsApp(msg);
}

// Verifica conflito de horário
async function verificaConflito(data_hora, servico_id, ignorar_id = null) {
  const servico = await db('servicos').where({ id: servico_id }).first();
  if (!servico) return false;

  const inicio = new Date(data_hora + '-03:00');
  const fim = new Date(inicio.getTime() + servico.duracao_minutos * 60000);

  let query = db('agendamentos as a')
    .join('servicos as s', 'a.servico_id', 's.id')
    .select('a.id', 'a.data_hora', 's.duracao_minutos')
    .whereNot('a.status', 'cancelado');

  if (ignorar_id) query = query.whereNot('a.id', ignorar_id);

  const existentes = await query;

  for (const ag of existentes) {
    const agInicio = new Date(ag.data_hora + '-03:00');
    const agFim = new Date(agInicio.getTime() + ag.duracao_minutos * 60000);
    if (inicio < agFim && fim > agInicio) {
      return { conflito: true, horario: ag.data_hora, duracao: ag.duracao_minutos };
    }
  }
  return false;
}

const selectAgendamento = (query) =>
  query
    .join('clientes as c', 'a.cliente_id', 'c.id')
    .join('servicos as s', 'a.servico_id', 's.id')
    .select(
      'a.id', 'a.data_hora', 'a.status', 'a.observacoes', 'a.criado_em',
      'c.id as cliente_id', 'c.nome as cliente_nome', 'c.telefone as cliente_telefone',
      's.id as servico_id', 's.nome as servico_nome', 's.duracao_minutos', 's.valor'
    );

router.get('/', async (req, res) => {
  try {
    let query = selectAgendamento(db('agendamentos as a'));
    if (req.query.data) query = query.whereRaw('CAST(a.data_hora AS TEXT) LIKE ?', [`${req.query.data}%`]);
    const agendamentos = await query.orderBy('a.data_hora');
    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar agendamentos.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const ag = await selectAgendamento(db('agendamentos as a')).where('a.id', req.params.id).first();
    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    res.json(ag);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar agendamento.' });
  }
});

router.post('/', async (req, res) => {
  const { cliente_id, servico_id, data_hora, observacoes } = req.body;
  if (!cliente_id || !servico_id || !data_hora)
    return res.status(400).json({ erro: 'Cliente, serviço e data/hora são obrigatórios.' });

  if (new Date(data_hora + '-03:00') < new Date())
    return res.status(400).json({ erro: 'Não é possível agendar em uma data/hora passada.' });

  const cliente = await db('clientes').where({ id: cliente_id }).first();
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

  const servico = await db('servicos').where({ id: servico_id }).first();
  if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado.' });

  const conflito = await verificaConflito(data_hora, servico_id);
  if (conflito) {
    return res.status(409).json({
      erro: 'Conflito de horário detectado.',
      detalhe: `Já existe um agendamento neste período (início: ${conflito.horario}, duração: ${conflito.duracao} min).`
    });
  }

  try {
    const [{ id }] = await db('agendamentos')
      .insert({ cliente_id, servico_id, data_hora, observacoes: observacoes?.trim() || null })
      .returning('id');
    const novo = await selectAgendamento(db('agendamentos as a')).where('a.id', id).first();

// Só notifica se agendamento for com mais de 20 min de antecedência
    const diffMin = (new Date(novo.data_hora + '-03:00') - new Date()) / 60000;
    if (diffMin > 20) {
      notificarBarbeiro(novo).catch(() => {});
    }

    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar agendamento.' });
  }
});

router.put('/:id', async (req, res) => {
  const { cliente_id, servico_id, data_hora, status, observacoes } = req.body;
  if (!cliente_id || !servico_id || !data_hora)
    return res.status(400).json({ erro: 'Cliente, serviço e data/hora são obrigatórios.' });

  try {
    const existe = await db('agendamentos').where({ id: req.params.id }).first();
    if (!existe) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

    if (new Date(data_hora + '-03:00') < new Date())
      return res.status(400).json({ erro: 'Não é possível agendar em uma data/hora passada.' });

    const conflito = await verificaConflito(data_hora, servico_id, req.params.id);
    if (conflito) {
      return res.status(409).json({
        erro: 'Conflito de horário detectado.',
        detalhe: `Já existe um agendamento neste período (início: ${conflito.horario}).`
      });
    }

    const statusValido = ['confirmado', 'pendente', 'cancelado', 'concluido'];
    const novoStatus = statusValido.includes(status) ? status : 'confirmado';

    await db('agendamentos').where({ id: req.params.id })
      .update({ cliente_id, servico_id, data_hora, status: novoStatus, observacoes: observacoes?.trim() || null });

    const atualizado = await selectAgendamento(db('agendamentos as a')).where('a.id', req.params.id).first();
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar agendamento.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existe = await db('agendamentos').where({ id: req.params.id }).first();
    if (!existe) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    await db('agendamentos').where({ id: req.params.id }).delete();
    res.json({ mensagem: 'Agendamento removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover agendamento.' });
  }
});

module.exports = router;