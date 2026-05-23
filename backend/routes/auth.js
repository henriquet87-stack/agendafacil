const express = require('express');
const router  = express.Router();
const crypto  = require('crypto'); // built-in Node — sem dependência nova

/**
 * POST /api/auth/login
 * Body: { usuario: string, senha: string }
 *
 * Variáveis de ambiente no Render:
 *   APP_USER       → nome de usuário  (padrão: "admin")
 *   APP_PASSWORD   → senha            (padrão: "admin123")
 *   SESSION_SECRET → segredo HMAC     (padrão: "agendafacil-secret")
 */
router.post('/login', (req, res) => {
  const { usuario, senha } = req.body || {};

  const APP_USER     = process.env.APP_USER       || 'admin';
  const APP_PASSWORD = process.env.APP_PASSWORD   || 'admin123';
  const SECRET       = process.env.SESSION_SECRET || 'agendafacil-secret';

  if (!usuario || !senha) {
    return res.status(400).json({ ok: false, erro: 'Informe usuário e senha.' });
  }

  if (usuario !== APP_USER || senha !== APP_PASSWORD) {
    return res.status(401).json({ ok: false, erro: 'Usuário ou senha inválidos.' });
  }

  // Token = base64(usuario|expira) + "." + HMAC-SHA256 assinado com SECRET
  const expira  = Date.now() + 8 * 60 * 60 * 1000; // 8 horas
  const payload = `${usuario}|${expira}`;
  const sig     = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  const token   = `${Buffer.from(payload).toString('base64url')}.${sig}`;

  res.json({ ok: true, token, expira });
});

/**
 * POST /api/auth/verificar
 * Header: Authorization: Bearer <token>
 *
 * Revalida o token salvo no sessionStorage quando a página é recarregada.
 */
router.post('/verificar', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token      = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ ok: false, erro: 'Token não informado.' });
  }

  const SECRET = process.env.SESSION_SECRET || 'agendafacil-secret';

  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) throw new Error('formato inválido');

    const payloadB64 = token.slice(0, dotIdx);
    const sigRecebida = token.slice(dotIdx + 1);

    const payload   = Buffer.from(payloadB64, 'base64url').toString();
    const [, expStr] = payload.split('|');
    if (Date.now() > parseInt(expStr, 10)) {
      return res.status(401).json({ ok: false, erro: 'Sessão expirada. Faça login novamente.' });
    }

    const sigEsperada = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (sigRecebida !== sigEsperada) throw new Error('assinatura inválida');

    res.json({ ok: true });
  } catch {
    res.status(401).json({ ok: false, erro: 'Token inválido.' });
  }
});

module.exports = router;
