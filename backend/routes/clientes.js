const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', async (req, res) => {
  try {
    const clientes = await db('clientes').orderBy('nome');
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar clientes.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cliente = await db('clientes').where({ id: req.params.id }).first();
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar cliente.' });
  }
});

router.post('/', async (req, res) => {
  const { nome, telefone, email } = req.body;
  if (!nome || !telefone) return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  try {
    const [novo] = await db('clientes')
      .insert({ nome: nome.trim(), telefone: telefone.trim(), email: email?.trim() || null })
      .returning('*');
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao cadastrar cliente.' });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, telefone, email } = req.body;
  if (!nome || !telefone) return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  try {
    const existe = await db('clientes').where({ id: req.params.id }).first();
    if (!existe) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    const [atualizado] = await db('clientes')
      .where({ id: req.params.id })
      .update({ nome: nome.trim(), telefone: telefone.trim(), email: email?.trim() || null })
      .returning('*');
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar cliente.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existe = await db('clientes').where({ id: req.params.id }).first();
    if (!existe) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    await db('clientes').where({ id: req.params.id }).delete();
    res.json({ mensagem: 'Cliente removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover cliente.' });
  }
});

module.exports = router;
