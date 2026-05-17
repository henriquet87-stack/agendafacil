const express = require('express');
const router = express.Router();
const db = require('../database');

// Verifica conflito de horário para um agendamento
function verificaConflito(data_hora, servico_id, ignorar_id = null) {
  const servico = db.prepare('SELECT duracao_minutos FROM servicos WHERE id = ?').get(servico_id);
  if (!servico) return false;

  const inicio = new Date(data_hora);
  const fim = new Date(inicio.getTime() + servico.duracao_minutos * 60000);

  // Busca todos os agendamentos confirmados/pendentes
  let query = `
    SELECT a.id, a.data_hora, s.duracao_minutos
    FROM agendamentos a
    JOIN servicos s ON a.servico_id = s.id
    WHERE a.status != 'cancelado'
  `;
  const params = [];
  if (ignorar_id) {
    query += ' AND a.id != ?';
    params.push(ignorar_id);
  }

  const existentes = db.prepare(query).all(...params);

  for (const ag of existentes) {
    const agInicio = new Date(ag.data_hora);
    const agFim = new Date(agInicio.getTime() + ag.duracao_minutos * 60000);

    // Há conflito se os intervalos se sobrepõem
    if (inicio < agFim && fim > agInicio) {
      return {
        conflito: true,
        horario: ag.data_hora,
        duracao: ag.duracao_minutos
      };
    }
  }
  return false;
}

// GET /api/agendamentos — lista agendamentos (com filtro opcional de data)
router.get('/', (req, res) => {
  try {
    const { data } = req.query;
    let query = `
      SELECT
        a.id, a.data_hora, a.status, a.observacoes, a.criado_em,
        c.id AS cliente_id, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
        s.id AS servico_id, s.nome AS servico_nome,
        s.duracao_minutos, s.valor
      FROM agendamentos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN servicos s ON a.servico_id = s.id
    `;

    if (data) {
      query += ` WHERE DATE(a.data_hora) = '${data}'`;
    }

    query += ' ORDER BY a.data_hora ASC';

    const agendamentos = db.prepare(query).all();
    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar agendamentos.' });
  }
});

// GET /api/agendamentos/:id — busca um agendamento
router.get('/:id', (req, res) => {
  try {
    const ag = db.prepare(`
      SELECT
        a.id, a.data_hora, a.status, a.observacoes, a.criado_em,
        c.id AS cliente_id, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
        s.id AS servico_id, s.nome AS servico_nome,
        s.duracao_minutos, s.valor
      FROM agendamentos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN servicos s ON a.servico_id = s.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    res.json(ag);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar agendamento.' });
  }
});

// POST /api/agendamentos — cria novo agendamento
router.post('/', (req, res) => {
  const { cliente_id, servico_id, data_hora, observacoes } = req.body;

  if (!cliente_id || !servico_id || !data_hora) {
    return res.status(400).json({ erro: 'Cliente, serviço e data/hora são obrigatórios.' });
  }

  // Valida se cliente e serviço existem
  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(cliente_id);
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

  const servico = db.prepare('SELECT id FROM servicos WHERE id = ?').get(servico_id);
  if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado.' });

  // Verifica conflito de horário
  const conflito = verificaConflito(data_hora, servico_id);
  if (conflito) {
    return res.status(409).json({
      erro: 'Conflito de horário detectado.',
      detalhe: `Já existe um agendamento que ocupa este período (início: ${conflito.horario}, duração: ${conflito.duracao} min).`
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO agendamentos (cliente_id, servico_id, data_hora, observacoes)
      VALUES (?, ?, ?, ?)
    `).run(cliente_id, servico_id, data_hora, observacoes?.trim() || null);

    const novo = db.prepare(`
      SELECT
        a.id, a.data_hora, a.status, a.observacoes, a.criado_em,
        c.nome AS cliente_nome, s.nome AS servico_nome,
        s.duracao_minutos, s.valor
      FROM agendamentos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN servicos s ON a.servico_id = s.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar agendamento.' });
  }
});

// PUT /api/agendamentos/:id — atualiza agendamento
router.put('/:id', (req, res) => {
  const { cliente_id, servico_id, data_hora, status, observacoes } = req.body;

  if (!cliente_id || !servico_id || !data_hora) {
    return res.status(400).json({ erro: 'Cliente, serviço e data/hora são obrigatórios.' });
  }

  try {
    const existe = db.prepare('SELECT id FROM agendamentos WHERE id = ?').get(req.params.id);
    if (!existe) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

    const conflito = verificaConflito(data_hora, servico_id, req.params.id);
    if (conflito) {
      return res.status(409).json({
        erro: 'Conflito de horário detectado.',
        detalhe: `Já existe um agendamento neste período (início: ${conflito.horario}).`
      });
    }

    const statusValido = ['confirmado', 'pendente', 'cancelado', 'concluido'];
    const novoStatus = statusValido.includes(status) ? status : 'confirmado';

    db.prepare(`
      UPDATE agendamentos
      SET cliente_id = ?, servico_id = ?, data_hora = ?, status = ?, observacoes = ?
      WHERE id = ?
    `).run(cliente_id, servico_id, data_hora, novoStatus, observacoes?.trim() || null, req.params.id);

    const atualizado = db.prepare(`
      SELECT a.id, a.data_hora, a.status, a.observacoes,
             c.nome AS cliente_nome, s.nome AS servico_nome, s.duracao_minutos, s.valor
      FROM agendamentos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN servicos s ON a.servico_id = s.id
      WHERE a.id = ?
    `).get(req.params.id);

    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar agendamento.' });
  }
});

// DELETE /api/agendamentos/:id — cancela ou remove um agendamento
router.delete('/:id', (req, res) => {
  try {
    const existe = db.prepare('SELECT id FROM agendamentos WHERE id = ?').get(req.params.id);
    if (!existe) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

    db.prepare('DELETE FROM agendamentos WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Agendamento removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover agendamento.' });
  }
});

module.exports = router;
