const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/clientes — lista todos os clientes
router.get('/', (req, res) => {
  try {
    const clientes = db.prepare(`
      SELECT * FROM clientes ORDER BY nome ASC
    `).all();
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar clientes.' });
  }
});

// GET /api/clientes/:id — busca um cliente pelo ID
router.get('/:id', (req, res) => {
  try {
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar cliente.' });
  }
});

// POST /api/clientes — cadastra um novo cliente
router.post('/', (req, res) => {
  const { nome, telefone, email } = req.body;

  if (!nome || !telefone) {
    return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)
    `).run(nome.trim(), telefone.trim(), email?.trim() || null);

    const novoCliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(novoCliente);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao cadastrar cliente.' });
  }
});

// PUT /api/clientes/:id — atualiza um cliente
router.put('/:id', (req, res) => {
  const { nome, telefone, email } = req.body;

  if (!nome || !telefone) {
    return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  }

  try {
    const existe = db.prepare('SELECT id FROM clientes WHERE id = ?').get(req.params.id);
    if (!existe) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    db.prepare(`
      UPDATE clientes SET nome = ?, telefone = ?, email = ? WHERE id = ?
    `).run(nome.trim(), telefone.trim(), email?.trim() || null, req.params.id);

    const clienteAtualizado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
    res.json(clienteAtualizado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar cliente.' });
  }
});

// DELETE /api/clientes/:id — remove um cliente
router.delete('/:id', (req, res) => {
  try {
    const existe = db.prepare('SELECT id FROM clientes WHERE id = ?').get(req.params.id);
    if (!existe) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Cliente removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover cliente.' });
  }
});

module.exports = router;
