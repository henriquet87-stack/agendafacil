require('dotenv').config();
const knex = require('knex');
const path = require('path');

const isProduction = !!process.env.DATABASE_URL;

let db;

if (isProduction) {
  db = knex({
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  });
} else {
  db = knex({
    client: 'better-sqlite3',
    connection: { filename: path.join(__dirname, 'agendamento.db') },
    useNullAsDefault: true
  });
}

async function initDb() {
  const hasClientes = await db.schema.hasTable('clientes');
  if (!hasClientes) {
    await db.schema.createTable('clientes', t => {
      t.increments('id');
      t.string('nome').notNullable();
      t.string('telefone').notNullable();
      t.string('email');
      t.timestamp('criado_em').defaultTo(db.fn.now());
    });
  }

  const hasServicos = await db.schema.hasTable('servicos');
  if (!hasServicos) {
    await db.schema.createTable('servicos', t => {
      t.increments('id');
      t.string('nome').notNullable();
      t.string('descricao');
      t.integer('duracao_minutos').notNullable();
      t.decimal('valor', 10, 2).notNullable();
      t.timestamp('criado_em').defaultTo(db.fn.now());
    });
    await db('servicos').insert([
      { nome: 'Corte de Cabelo', descricao: 'Corte masculino tradicional', duracao_minutos: 30, valor: 35.00 },
      { nome: 'Barba',           descricao: 'Aparar e modelar barba',       duracao_minutos: 20, valor: 25.00 },
      { nome: 'Corte + Barba',   descricao: 'Combo corte e barba',          duracao_minutos: 50, valor: 55.00 },
    ]);
  }

  const hasAgendamentos = await db.schema.hasTable('agendamentos');
  if (!hasAgendamentos) {
    await db.schema.createTable('agendamentos', t => {
      t.increments('id');
      t.integer('cliente_id').notNullable().references('id').inTable('clientes').onDelete('CASCADE');
      t.integer('servico_id').notNullable().references('id').inTable('servicos').onDelete('CASCADE');
      t.string('data_hora').notNullable();
      t.string('status').notNullable().defaultTo('confirmado');
      t.text('observacoes');
      t.boolean('confirmacao_enviada').defaultTo(false);
      t.boolean('lembrete_60_enviado').defaultTo(false);
      t.boolean('lembrete_15_enviado').defaultTo(false);
      t.timestamp('criado_em').defaultTo(db.fn.now());
    });
  } else {
    // Migração: adiciona colunas de lembretes se ainda não existirem
    const cols = [
      { name: 'confirmacao_enviada', add: t => t.boolean('confirmacao_enviada').defaultTo(false) },
      { name: 'lembrete_60_enviado', add: t => t.boolean('lembrete_60_enviado').defaultTo(false) },
      { name: 'lembrete_15_enviado', add: t => t.boolean('lembrete_15_enviado').defaultTo(false) },
    ];
    for (const col of cols) {
      const exists = await db.schema.hasColumn('agendamentos', col.name);
      if (!exists) {
        await db.schema.alterTable('agendamentos', col.add);
        console.log(`🔧 Coluna '${col.name}' adicionada à tabela agendamentos`);
      }
    }
  }

  console.log(`✅ Banco de dados pronto (${isProduction ? 'PostgreSQL' : 'SQLite'})`);
}

module.exports = { db, initDb };