const express = require('express');
const cors = require('cors');
const path = require('path');

// Inicializa o banco de dados (cria tabelas se não existirem)
require('./database');

const clientesRouter    = require('./routes/clientes');
const servicosRouter    = require('./routes/servicos');
const agendamentosRouter = require('./routes/agendamentos');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rotas da API
app.use('/api/clientes',     clientesRouter);
app.use('/api/servicos',     servicosRouter);
app.use('/api/agendamentos', agendamentosRouter);

// Rota padrão — redireciona para o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📋 API disponível em http://localhost:${PORT}/api\n`);
});
