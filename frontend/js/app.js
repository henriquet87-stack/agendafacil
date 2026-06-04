// =============================================
//  app.js — Lógica principal do frontend
// =============================================

// Cache local
let _clientes  = [];
let _servicos  = [];

// ===== NAVEGAÇÃO =====
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    irPara(item.dataset.page);
  });
});

function irPara(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.getElementById(`page-${page}`).classList.add('active');

  if (page === 'dashboard')    carregarDashboard();
  if (page === 'agendamentos') carregarAgendamentos();
  if (page === 'clientes')     carregarClientes();
  if (page === 'servicos')     carregarServicos();
  document.getElementById('sidebar').classList.remove('expanded');
  document.getElementById('sidebar').classList.remove('expanded');
  document.querySelector('.sidebar-overlay').classList.remove('visible');
}

// ===== TOAST =====
function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast-${tipo} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ===== MODAIS =====
function abrirModal(id) {
  document.getElementById(id).classList.add('open');
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
}

// fecha modal ao clicar fora
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ===== HELPERS =====
function fmtData(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDataCurta(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('pt-BR');
}

function fmtHora(str) {
  if (!str) return '—';
  return new Date(str).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtValor(v) {
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

function badgeStatus(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}

// ===== DASHBOARD =====
function dataHoje() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

async function carregarDashboard() {
  const hoje = dataHoje();

  document.getElementById('dash-date').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  try {
    const [agendamentos, clientes, servicos] = await Promise.all([
      api.getAgendamentos(hoje),
      api.getClientes(),
      api.getServicos()
    ]);

    const confirmados = agendamentos.filter(a => a.status !== 'cancelado');
    const receita = confirmados.reduce((s, a) => s + parseFloat(a.valor || 0), 0);

    document.getElementById('stat-hoje').textContent    = confirmados.length;
    document.getElementById('stat-clientes').textContent = clientes.length;
    document.getElementById('stat-servicos').textContent = servicos.length;
    document.getElementById('stat-receita').textContent  = fmtValor(receita);

    const lista = document.getElementById('agenda-hoje');
    if (confirmados.length === 0) {
      lista.innerHTML = '<p class="empty-state">Nenhum agendamento para hoje.</p>';
    } else {
      lista.innerHTML = confirmados.map(a => `
        <div class="agenda-item">
          <span class="agenda-hora">${fmtHora(a.data_hora)}</span>
          <div class="agenda-info">
            <div class="agenda-cliente">${a.cliente_nome}</div>
            <div class="agenda-servico">${a.servico_nome} · ${a.duracao_minutos} min</div>
          </div>
          ${badgeStatus(a.status)}
        </div>
      `).join('');
    }
  } catch (err) {
    toast('Erro ao carregar dashboard.', 'erro');
  }
}

// ===== AGENDAMENTOS =====
async function carregarAgendamentos() {
  const data = document.getElementById('filtro-data').value;
  const tbody = document.getElementById('tabela-agendamentos');
  tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Carregando...</td></tr>';

  try {
    const lista = await api.getAgendamentos(data || null);

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum agendamento encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(a => `
  <tr>
    <td data-label="Data / Hora"><strong>${fmtData(a.data_hora)}</strong></td>
    <td data-label="Cliente">${a.cliente_nome}</td>
    <td data-label="Serviço">${a.servico_nome}</td>
    <td data-label="Duração">${a.duracao_minutos} min</td>
    <td data-label="Valor">${fmtValor(a.valor)}</td>
    <td data-label="Status">${badgeStatus(a.status)}</td>
    <td data-label="Ações">
      <button class="btn btn-ghost btn-sm" onclick="linkAvisarCliente('${a.cliente_telefone}','${a.cliente_nome}','${a.data_hora}','${a.servico_nome}')" title="Avisar cliente pelo WhatsApp">📲</button>
      <button class="btn btn-ghost btn-sm" onclick="editarAgendamento(${a.id})">Editar</button>
      <button class="btn btn-danger btn-sm" onclick="deletarAgendamento(${a.id})">Excluir</button>
    </td>
   </tr>
`).join('');
  } catch (err) {
    toast('Erro ao carregar agendamentos.', 'erro');
  }
}

async function abrirModalAgendamento() {
  document.getElementById('modal-ag-titulo').textContent = 'Novo Agendamento';
  document.getElementById('ag-id').value = '';
  document.getElementById('ag-obs').value = '';
  document.getElementById('ag-data').value = '';
  document.getElementById('ag-erro').style.display = 'none';
  document.getElementById('info-servico').style.display = 'none';

  await preencherSelectsAgendamento();
  abrirModal('modal-agendamento');
}

async function editarAgendamento(id) {
  try {
    await preencherSelectsAgendamento();
    const ag = await req('GET', `/agendamentos/${id}`);

    document.getElementById('modal-ag-titulo').textContent = 'Editar Agendamento';
    document.getElementById('ag-id').value = ag.id;
    document.getElementById('ag-cliente').value = ag.cliente_id;
    document.getElementById('ag-servico').value = ag.servico_id;
    document.getElementById('ag-data').value = ag.data_hora.slice(0, 16);
    document.getElementById('ag-obs').value = ag.observacoes || '';
    document.getElementById('ag-erro').style.display = 'none';
    atualizarInfoServico();
    abrirModal('modal-agendamento');
  } catch (err) {
    toast('Erro ao carregar agendamento.', 'erro');
  }
}

async function preencherSelectsAgendamento() {
  const [clientes, servicos] = await Promise.all([api.getClientes(), api.getServicos()]);
  _clientes = clientes;
  _servicos = servicos;

  document.getElementById('ag-cliente').innerHTML =
    clientes.map(c => `<option value="${c.id}">${c.nome} — ${c.telefone}</option>`).join('');

  document.getElementById('ag-servico').innerHTML =
    servicos.map(s => `<option value="${s.id}" data-dur="${s.duracao_minutos}" data-val="${s.valor}">${s.nome}</option>`).join('');

  atualizarInfoServico();
}

function atualizarInfoServico() {
  const sel = document.getElementById('ag-servico');
  const opt = sel.options[sel.selectedIndex];
  if (!opt) return;

  const dur = opt.dataset.dur;
  const val = opt.dataset.val;
  if (dur) {
    document.getElementById('info-duracao').textContent = dur + ' min';
    document.getElementById('info-valor').textContent   = fmtValor(val);
    document.getElementById('info-servico').style.display = 'block';
  }
}

async function salvarAgendamento() {
  const id         = document.getElementById('ag-id').value;
  const cliente_id = document.getElementById('ag-cliente').value;
  const servico_id = document.getElementById('ag-servico').value;
  const data_hora  = document.getElementById('ag-data').value;
  const observacoes= document.getElementById('ag-obs').value;
  const erroEl     = document.getElementById('ag-erro');

  erroEl.style.display = 'none';

  if (!data_hora) {
    erroEl.textContent = 'Por favor, informe a data e hora.';
    erroEl.style.display = 'block';
    return;
  }

  if (new Date(data_hora) < new Date()) {
    erroEl.textContent = 'Não é possível agendar em uma data/hora passada.';
    erroEl.style.display = 'block';
    return;
  }

  try {
    if (id) {
      await api.atualizarAgendamento(id, { cliente_id, servico_id, data_hora, observacoes });
      toast('Agendamento atualizado!');
    } else {
      await api.criarAgendamento({ cliente_id, servico_id, data_hora, observacoes });
      toast('Agendamento criado com sucesso!');
    }
    fecharModal('modal-agendamento');
    carregarAgendamentos();
    carregarDashboard();
  } catch (err) {
    erroEl.textContent = err.message;
    erroEl.style.display = 'block';
  }
}

async function deletarAgendamento(id) {
  if (!confirm('Remover este agendamento?')) return;
  try {
    await api.deletarAgendamento(id);
    toast('Agendamento removido.');
    carregarAgendamentos();
    carregarDashboard();
  } catch (err) {
    toast(err.message, 'erro');
  }
}

function linkAvisarCliente(telefone, nome, data_hora, servico) {
  const tel  = telefone.replace(/\D/g, '');
  const fone = tel.startsWith('55') ? tel : '55' + tel;
  const data = data_hora.slice(0, 10).split('-').reverse().join('/');
  const hora = data_hora.slice(11, 16);
  const msg  = `Olá ${nome}! Lembrando do seu agendamento: *${servico}* em *${data} às ${hora}*. Te esperamos! ✂️`;
  window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ===== CLIENTES =====
async function carregarClientes() {
  const tbody = document.getElementById('tabela-clientes');
  try {
    const lista = await api.getClientes();
    _clientes = lista;

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum cliente cadastrado.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(c => `
  <tr>
    <td data-label="Nome"><strong>${c.nome}</strong></td>
    <td data-label="Telefone">${c.telefone}</td>
    <td data-label="E-mail">${c.email || '—'}</td>
    <td data-label="Cadastro">${fmtDataCurta(c.criado_em)}</td>
    <td data-label="Ações">
      <button class="btn btn-ghost btn-sm" onclick="editarCliente(${c.id})">Editar</button>
      <button class="btn btn-danger btn-sm" onclick="deletarCliente(${c.id})">Excluir</button>
    </td>
  </tr>
`).join('');
  } catch (err) {
    toast('Erro ao carregar clientes.', 'erro');
  }
}

function abrirModalCliente() {
  document.getElementById('modal-cl-titulo').textContent = 'Novo Cliente';
  document.getElementById('cl-id').value       = '';
  document.getElementById('cl-nome').value     = '';
  document.getElementById('cl-telefone').value = '';
  document.getElementById('cl-email').value    = '';
  document.getElementById('cl-erro').style.display = 'none';
  abrirModal('modal-cliente');
}

async function editarCliente(id) {
  try {
    const c = await api.getCliente(id);
    document.getElementById('modal-cl-titulo').textContent = 'Editar Cliente';
    document.getElementById('cl-id').value       = c.id;
    document.getElementById('cl-nome').value     = c.nome;
    document.getElementById('cl-telefone').value = c.telefone;
    document.getElementById('cl-email').value    = c.email || '';
    document.getElementById('cl-erro').style.display = 'none';
    abrirModal('modal-cliente');
  } catch (err) {
    toast('Erro ao carregar cliente.', 'erro');
  }
}

async function salvarCliente() {
  const id       = document.getElementById('cl-id').value;
  const nome     = document.getElementById('cl-nome').value.trim();
  const telefone = document.getElementById('cl-telefone').value.trim();
  const email    = document.getElementById('cl-email').value.trim();
  const erroEl   = document.getElementById('cl-erro');

  erroEl.style.display = 'none';

  if (!nome || !telefone) {
    erroEl.textContent = 'Nome e telefone são obrigatórios.';
    erroEl.style.display = 'block';
    return;
  }

  try {
    if (id) {
      await api.atualizarCliente(id, { nome, telefone, email });
      toast('Cliente atualizado!');
    } else {
      await api.criarCliente({ nome, telefone, email });
      toast('Cliente cadastrado!');
    }
    fecharModal('modal-cliente');
    carregarClientes();
    document.getElementById('stat-clientes').textContent = '…';
  } catch (err) {
    erroEl.textContent = err.message;
    erroEl.style.display = 'block';
  }
}

async function deletarCliente(id) {
  if (!confirm('Excluir este cliente? Seus agendamentos também serão removidos.')) return;
  try {
    await api.deletarCliente(id);
    toast('Cliente removido.');
    carregarClientes();
  } catch (err) {
    toast(err.message, 'erro');
  }
}

// ===== SERVIÇOS =====
async function carregarServicos() {
  const grid = document.getElementById('servicos-grid');
  try {
    const lista = await api.getServicos();
    _servicos = lista;

    if (lista.length === 0) {
      grid.innerHTML = '<p class="empty-state">Nenhum serviço cadastrado.</p>';
      return;
    }

    grid.innerHTML = lista.map(s => `
      <div class="servico-card">
        <p class="servico-nome">${s.nome}</p>
        <p class="servico-desc">${s.descricao || 'Sem descrição'}</p>
        <div class="servico-meta">
          <span class="servico-valor">${fmtValor(s.valor)}</span>
          <span class="servico-dur">⏱ ${s.duracao_minutos} min</span>
        </div>
        <div class="servico-actions">
          <button class="btn btn-ghost btn-sm" onclick="editarServico(${s.id})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deletarServico(${s.id})">Excluir</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    toast('Erro ao carregar serviços.', 'erro');
  }
}

function abrirModalServico() {
  document.getElementById('modal-sv-titulo').textContent = 'Novo Serviço';
  document.getElementById('sv-id').value      = '';
  document.getElementById('sv-nome').value    = '';
  document.getElementById('sv-desc').value    = '';
  document.getElementById('sv-duracao').value = '';
  document.getElementById('sv-valor').value   = '';
  document.getElementById('sv-erro').style.display = 'none';
  abrirModal('modal-servico');
}

async function editarServico(id) {
  const s = _servicos.find(x => x.id === id);
  if (!s) return;

  document.getElementById('modal-sv-titulo').textContent = 'Editar Serviço';
  document.getElementById('sv-id').value      = s.id;
  document.getElementById('sv-nome').value    = s.nome;
  document.getElementById('sv-desc').value    = s.descricao || '';
  document.getElementById('sv-duracao').value = s.duracao_minutos;
  document.getElementById('sv-valor').value   = s.valor;
  document.getElementById('sv-erro').style.display = 'none';
  abrirModal('modal-servico');
}

async function salvarServico() {
  const id      = document.getElementById('sv-id').value;
  const nome    = document.getElementById('sv-nome').value.trim();
  const descricao = document.getElementById('sv-desc').value.trim();
  const duracao_minutos = Number(document.getElementById('sv-duracao').value);
  const valor   = Number(document.getElementById('sv-valor').value);
  const erroEl  = document.getElementById('sv-erro');

  erroEl.style.display = 'none';

  if (!nome || !duracao_minutos || isNaN(valor)) {
    erroEl.textContent = 'Preencha todos os campos obrigatórios.';
    erroEl.style.display = 'block';
    return;
  }

  try {
    if (id) {
      await api.atualizarServico(id, { nome, descricao, duracao_minutos, valor });
      toast('Serviço atualizado!');
    } else {
      await api.criarServico({ nome, descricao, duracao_minutos, valor });
      toast('Serviço cadastrado!');
    }
    fecharModal('modal-servico');
    carregarServicos();
  } catch (err) {
    erroEl.textContent = err.message;
    erroEl.style.display = 'block';
  }
}

async function deletarServico(id) {
  if (!confirm('Excluir este serviço?')) return;
  try {
    await api.deletarServico(id);
    toast('Serviço removido.');
    carregarServicos();
  } catch (err) {
    toast(err.message, 'erro');
  }
}

// ===== MÁSCARA DE TELEFONE =====
function aplicarMascaraTelefone(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    input.value = v;
  });
}

// ===== INIT =====
carregarDashboard();
const telInput = document.getElementById('cl-telefone');
if (telInput) aplicarMascaraTelefone(telInput);

// =============================================
//  SIDEBAR TOGGLE — adicionar no FINAL de app.js
// =============================================

(function () {
  const sidebar  = document.getElementById('sidebar');
  const toggle   = document.getElementById('sidebar-toggle');
  const overlay  = document.getElementById('sidebar-overlay');

  // Detecta se é dispositivo touch (sem hover real)
  const isTouch = !window.matchMedia('(hover: hover)').matches;

  function expandir() {
    sidebar.classList.add('expanded');
    overlay.classList.add('visible');
    toggle.title = 'Recolher menu';
  }

  function recolher() {
    sidebar.classList.remove('expanded');
    overlay.classList.remove('visible');
    toggle.title = 'Expandir menu';
  }

  function toggleSidebar() {
    sidebar.classList.contains('expanded') ? recolher() : expandir();
  }

  // Botão de toggle (funciona em todos os dispositivos)
  toggle.addEventListener('click', toggleSidebar);

  // Overlay fecha a sidebar (mobile)
  overlay.addEventListener('click', recolher);

  // Teclado: Esc fecha a sidebar
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') recolher();
  });

  // Em desktop com hover: recolhe a classe "expanded" quando o mouse
  // sai da sidebar, exceto se o usuário clicou para fixar (pinned).
  // Ao clicar o toggle em desktop, a sidebar fica "pinada" (fica aberta
  // mesmo sem hover). Clicar de novo desafixia.
  if (!isTouch) {
    // No desktop, o hover CSS já controla a expansão visual.
    // O toggle fixa/desfixa o estado via classe.
    // Nenhuma lógica extra necessária — CSS cuida do hover.
  }
})();