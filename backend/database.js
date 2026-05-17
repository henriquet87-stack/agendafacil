const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'agendamento.db'));

// Habilita WAL mode para melhor performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Criação das tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nome      TEXT    NOT NULL,
    telefone  TEXT    NOT NULL,
    email     TEXT,
    criado_em TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS servicos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nome             TEXT    NOT NULL,
    descricao        TEXT,
    duracao_minutos  INTEGER NOT NULL,
    valor            REAL    NOT NULL,
    criado_em        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS agendamentos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id  INTEGER NOT NULL,
    servico_id  INTEGER NOT NULL,
    data_hora   TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'confirmado',
    observacoes TEXT,
    criado_em   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE
  );
`);

// Dados iniciais de exemplo
const totalServicos = db.prepare('SELECT COUNT(*) as total FROM servicos').get();
if (totalServicos.total === 0) {
  db.prepare(`
    INSERT INTO servicos (nome, descricao, duracao_minutos, valor)
    VALUES (?, ?, ?, ?)
  `).run('Corte de Cabelo', 'Corte masculino tradicional', 30, 35.00);

  db.prepare(`
    INSERT INTO servicos (nome, descricao, duracao_minutos, valor)
    VALUES (?, ?, ?, ?)
  `).run('Barba', 'Aparar e modelar barba', 20, 25.00);

  db.prepare(`
    INSERT INTO servicos (nome, descricao, duracao_minutos, valor)
    VALUES (?, ?, ?, ?)
  `).run('Corte + Barba', 'Combo corte e barba', 50, 55.00);
}

module.exports = db;
