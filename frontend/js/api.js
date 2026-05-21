// =============================================
//  api.js — Funções de comunicação com o back
// =============================================

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://agendafacil-backend-3hba.onrender.com/api';

async function req(method, endpoint, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API + endpoint, opts);
  const data = await res.json();

  if (!res.ok) throw new Error(data.detalhe || data.erro || 'Erro desconhecido');
  return data;
}

const api = {
  // Clientes
  getClientes:     ()       => req('GET',    '/clientes'),
  getCliente:      (id)     => req('GET',    `/clientes/${id}`),
  criarCliente:    (body)   => req('POST',   '/clientes', body),
  atualizarCliente:(id, b)  => req('PUT',    `/clientes/${id}`, b),
  deletarCliente:  (id)     => req('DELETE', `/clientes/${id}`),

  // Serviços
  getServicos:     ()       => req('GET',    '/servicos'),
  criarServico:    (body)   => req('POST',   '/servicos', body),
  atualizarServico:(id, b)  => req('PUT',    `/servicos/${id}`, b),
  deletarServico:  (id)     => req('DELETE', `/servicos/${id}`),

  // Agendamentos
  getAgendamentos: (data)   => req('GET',    `/agendamentos${data ? '?data='+data : ''}`),
  criarAgendamento:(body)   => req('POST',   '/agendamentos', body),
  atualizarAgendamento:(id,b)=> req('PUT',   `/agendamentos/${id}`, b),
  deletarAgendamento:(id)   => req('DELETE', `/agendamentos/${id}`)
};
