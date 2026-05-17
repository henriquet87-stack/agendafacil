# AgendaFácil — Sistema Web de Agendamentos
**Projeto Integrador · UNIVESP 2026**  
Turma: João França Naldi, Jefferson Luis Brentini da Silva, Thiago Henrique da Silva

---

## Stack Tecnológica
- **Frontend:** HTML5 + CSS3 + JavaScript puro
- **Backend:** Node.js + Express
- **Banco de dados:** SQLite (via `better-sqlite3`)

---

## Estrutura do Projeto

```
agendamento/
├── backend/
│   ├── server.js          ← servidor Express principal
│   ├── database.js        ← configuração e criação do banco SQLite
│   ├── agendamento.db     ← arquivo do banco (gerado automaticamente)
│   ├── package.json
│   └── routes/
│       ├── clientes.js    ← CRUD de clientes
│       ├── servicos.js    ← CRUD de serviços
│       └── agendamentos.js ← CRUD de agendamentos + detecção de conflito
└── frontend/
    ├── index.html         ← SPA principal
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js         ← funções de comunicação com a API
        └── app.js         ← lógica da interface
```

---

## Como Rodar

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior

### Passo a passo

```bash
# 1. Entre na pasta do backend
cd backend

# 2. Instale as dependências
npm install

# 3. Inicie o servidor
npm start
```

> O servidor vai rodar em `http://localhost:3000`  
> O banco de dados `agendamento.db` é criado automaticamente na primeira execução.

### Modo desenvolvimento (com hot-reload)
```bash
npm run dev
```

---

## Funcionalidades do MVP

| Módulo         | Funcionalidades |
|---------------|-----------------|
| **Dashboard**  | Resumo do dia, agendamentos de hoje, ações rápidas |
| **Agendamentos** | Criar, editar, excluir, filtrar por data, detecção de conflito de horário |
| **Clientes**   | Cadastrar, editar, excluir, histórico |
| **Serviços**   | Catalogar com nome, descrição, duração e valor |

---

## API — Endpoints

### Clientes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/clientes | Lista todos |
| GET | /api/clientes/:id | Busca por ID |
| POST | /api/clientes | Cadastra novo |
| PUT | /api/clientes/:id | Atualiza |
| DELETE | /api/clientes/:id | Remove |

### Serviços
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/servicos | Lista todos |
| POST | /api/servicos | Cadastra novo |
| PUT | /api/servicos/:id | Atualiza |
| DELETE | /api/servicos/:id | Remove |

### Agendamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/agendamentos | Lista todos |
| GET | /api/agendamentos?data=YYYY-MM-DD | Filtra por data |
| POST | /api/agendamentos | Cria novo (valida conflito) |
| PUT | /api/agendamentos/:id | Atualiza |
| DELETE | /api/agendamentos/:id | Remove |

---

## Controle de Versão
Utilize Git para versionar o projeto:

```bash
git init
git add .
git commit -m "feat: MVP inicial do sistema de agendamentos"
```

---

## Tutor
Prof. José Carlos Marcelino  
Polos: Franca-SP · Monte Azul Paulista-SP · Barretos-SP
