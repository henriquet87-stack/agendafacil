require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database');

const clientesRouter     = require('./routes/clientes');
const servicosRouter     = require('./routes/servicos');
const agendamentosRouter = require('./routes/agendamentos');
const authRouter         = require('./routes/auth');          // ← NOVO

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/clientes',      clientesRouter);
app.use('/api/servicos',      servicosRouter);
app.use('/api/agendamentos',  agendamentosRouter);
app.use('/api/auth',          authRouter);                    // ← NOVO

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
      console.log(`📋 API disponível em http://localhost:${PORT}/api\n`);
    });
  })
  .catch(err => {
    console.error('❌ Erro ao inicializar banco de dados:', err);
    process.exit(1);
  });
