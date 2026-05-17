const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/servicos — lista todos os serviços
router.get('/', (req, res) => {
  try {
    const servicos = db.prepare('SELECT * FROM servicos ORDER BY nome ASC').all();
    res.json(servicos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar serviços.' });
  }
});

// GET /api/servicos/:id — busca um serviço pelo ID
router.get('/:id', (req, res) => {
  try {
    const servico = db.prepare('SELECT * FROM servicos WHERE id = ?').get(req.params.id);
    if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado.' });
    res.json(servico);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar serviço.' });
  }
});

// POST /api/servicos — cadastra um novo serviço
router.post('/', (req, res) => {
  const { nome, descricao, duracao_minutos, valor } = req.body;

  if (!nome || !duracao_minutos || valor === undefined) {
    return res.status(400).json({ erro: 'Nome, duração e valor são obrigatórios.' });
  }
  if (isNaN(duracao_minutos) || duracao_minutos <= 0) {
    return res.status(400).json({ erro: 'Duração deve ser um número positivo.' });
  }
  if (isNaN(valor) || valor < 0) {
    return res.status(400).json({ erro: 'Valor inválido.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO servicos (nome, descricao, duracao_minutos, valor)
      VALUES (?, ?, ?, ?)
    `).run(nome.trim(), descricao?.trim() || null, Number(duracao_minutos), Number(valor));

    const novoServico = db.prepare('SELECT * FROM servicos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(novoServico);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao cadastrar serviço.' });
  }
});

// PUT /api/servicos/:id — atualiza um serviço
router.put('/:id', (req, res) => {
  const { nome, descricao, duracao_minutos, valor } = req.body;

  if (!nome || !duracao_minutos || valor === undefined) {
    return res.status(400).json({ erro: 'Nome, duração e valor são obrigatórios.' });
  }

  try {
    const existe = db.prepare('SELECT id FROM servicos WHERE id = ?').get(req.params.id);
    if (!existe) return res.status(404).json({ erro: 'Serviço não encontrado.' });

    db.prepare(`
      UPDATE servicos SET nome = ?, descricao = ?, duracao_minutos = ?, valor = ? WHERE id = ?
    `).run(nome.trim(), descricao?.trim() || null, Number(duracao_minutos), Number(valor), req.params.id);

    const servicoAtualizado = db.prepare('SELECT * FROM servicos WHERE id = ?').get(req.params.id);
    res.json(servicoAtualizado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar serviço.' });
  }
});

// DELETE /api/servicos/:id — remove um serviço
router.delete('/:id', (req, res) => {
  try {
    const existe = db.prepare('SELECT id FROM servicos WHERE id = ?').get(req.params.id);
    if (!existe) return res.status(404).json({ erro: 'Serviço não encontrado.' });

    db.prepare('DELETE FROM servicos WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Serviço removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover serviço.' });
  }
});

module.exports = router;
