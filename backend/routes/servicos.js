const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', async (req, res) => {
  try {
    const servicos = await db('servicos').orderBy('nome');
    res.json(servicos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar serviços.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const servico = await db('servicos').where({ id: req.params.id }).first();
    if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado.' });
    res.json(servico);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar serviço.' });
  }
});

router.post('/', async (req, res) => {
  const { nome, descricao, duracao_minutos, valor } = req.body;
  if (!nome || !duracao_minutos || valor === undefined)
    return res.status(400).json({ erro: 'Nome, duração e valor são obrigatórios.' });
  try {
    const [novo] = await db('servicos')
      .insert({ nome: nome.trim(), descricao: descricao?.trim() || null, duracao_minutos: Number(duracao_minutos), valor: Number(valor) })
      .returning('*');
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao cadastrar serviço.' });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, descricao, duracao_minutos, valor } = req.body;
  if (!nome || !duracao_minutos || valor === undefined)
    return res.status(400).json({ erro: 'Nome, duração e valor são obrigatórios.' });
  try {
    const existe = await db('servicos').where({ id: req.params.id }).first();
    if (!existe) return res.status(404).json({ erro: 'Serviço não encontrado.' });
    const [atualizado] = await db('servicos')
      .where({ id: req.params.id })
      .update({ nome: nome.trim(), descricao: descricao?.trim() || null, duracao_minutos: Number(duracao_minutos), valor: Number(valor) })
      .returning('*');
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar serviço.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existe = await db('servicos').where({ id: req.params.id }).first();
    if (!existe) return res.status(404).json({ erro: 'Serviço não encontrado.' });
    await db('servicos').where({ id: req.params.id }).delete();
    res.json({ mensagem: 'Serviço removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover serviço.' });
  }
});

module.exports = router;
