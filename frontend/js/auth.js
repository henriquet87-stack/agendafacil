/**
 * auth.js — AgendaFácil
 *
 * Carregado APÓS api.js (usa a variável global `API` definida lá).
 * Carregado ANTES de app.js (bloqueia o app até autenticação OK).
 *
 * Comportamento:
 *   - localhost  → não faz nada; sistema abre normalmente
 *   - produção   → exibe tela de login até token válido no sessionStorage
 */

const Auth = (() => {
  const TOKEN_KEY  = 'agendafacil_token';
  const isProducao = window.location.hostname !== 'localhost';

  // `API` é definida em api.js: "https://agendafacil-backend-3hba.onrender.com/api"
  // Reutilizamos ela diretamente para os endpoints de auth.
  const apiAuth = () => API; // referência tardia — API já existe quando init() roda

  // ── Estilos da tela de login ──────────────────────────────────────────────
  function injetarEstilos() {
    const s = document.createElement('style');
    s.textContent = `
      #af-overlay {
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #111827 0%, #1f2937 60%, #0f172a 100%);
        font-family: 'Syne', 'Segoe UI', sans-serif;
        transition: opacity .3s ease;
      }
      #af-overlay.saindo { opacity: 0; }

      #af-card {
        background: #fff; border-radius: 18px;
        padding: 2.6rem 2.2rem; width: 100%; max-width: 370px;
        box-shadow: 0 24px 64px rgba(0,0,0,.45);
        text-align: center;
      }

      #af-card .af-marca {
        font-size: 2rem; font-weight: 800; letter-spacing: -1px;
        color: #111827; margin-bottom: .2rem;
      }
      #af-card .af-marca span { color: #e94560; }

      #af-card .af-sub {
        font-size: .78rem; color: #9ca3af;
        margin-bottom: 2rem; font-family: 'DM Sans', sans-serif;
      }

      #af-card label {
        display: block; text-align: left;
        font-size: .78rem; font-weight: 700;
        color: #374151; margin: 1rem 0 .3rem;
        text-transform: uppercase; letter-spacing: .04em;
      }

      #af-card input[type="text"],
      #af-card input[type="password"] {
        width: 100%; padding: .72rem 1rem;
        border: 1.5px solid #e5e7eb; border-radius: 10px;
        font-size: .95rem; box-sizing: border-box;
        outline: none; transition: border-color .2s;
        font-family: 'DM Sans', sans-serif;
      }
      #af-card input:focus { border-color: #e94560; }

      #af-btn-entrar {
        margin-top: 1.8rem; width: 100%; padding: .82rem;
        background: #e94560; color: #fff; border: none;
        border-radius: 10px; font-size: 1rem; font-weight: 700;
        cursor: pointer; font-family: 'Syne', sans-serif;
        transition: background .2s, transform .1s;
      }
      #af-btn-entrar:hover   { background: #c73652; }
      #af-btn-entrar:active  { transform: scale(.98); }
      #af-btn-entrar:disabled { background: #9ca3af; cursor: not-allowed; }

      #af-erro {
        margin-top: .9rem; font-size: .84rem; font-weight: 500;
        color: #e94560; min-height: 1.2em;
        font-family: 'DM Sans', sans-serif;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Monta o overlay de login ──────────────────────────────────────────────
  function criarOverlay() {
    injetarEstilos();

    const el = document.createElement('div');
    el.id = 'af-overlay';
    el.innerHTML = `
      <div id="af-card">
        <div class="af-marca">Agenda<span>Fácil</span></div>
        <div class="af-sub">Barbearia · Sistema de Agendamentos</div>

        <label for="af-usuario">Usuário</label>
        <input type="text"     id="af-usuario" placeholder="seu usuário"
               autocomplete="username" />

        <label for="af-senha">Senha</label>
        <input type="password" id="af-senha"   placeholder="••••••••"
               autocomplete="current-password" />

        <button id="af-btn-entrar">Entrar</button>
        <div id="af-erro"></div>
      </div>
    `;
    document.body.appendChild(el);

    document.getElementById('af-btn-entrar')
      .addEventListener('click', tentarLogin);

    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') tentarLogin();
    });

    setTimeout(() => document.getElementById('af-usuario')?.focus(), 80);
  }

  // ── Chama o backend para autenticar ──────────────────────────────────────
  async function tentarLogin() {
    const btn     = document.getElementById('af-btn-entrar');
    const erroEl  = document.getElementById('af-erro');
    const usuario = document.getElementById('af-usuario').value.trim();
    const senha   = document.getElementById('af-senha').value;

    erroEl.textContent = '';

    if (!usuario || !senha) {
      erroEl.textContent = 'Preencha usuário e senha.';
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Verificando…';

    try {
      const res  = await fetch(`${apiAuth()}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ usuario, senha }),
      });
      const dados = await res.json();

      if (dados.ok) {
        sessionStorage.setItem(TOKEN_KEY, dados.token);
        removerOverlay();
      } else {
        erroEl.textContent = dados.erro || 'Erro ao fazer login.';
      }
    } catch {
      erroEl.textContent = 'Não foi possível conectar ao servidor.';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Entrar';
    }
  }

  // ── Verifica token já salvo no sessionStorage ─────────────────────────────
  async function verificarToken() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    try {
      const res  = await fetch(`${apiAuth()}/auth/verificar`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const dados = await res.json();
      return dados.ok === true;
    } catch {
      return false;
    }
  }

  // ── Remove o overlay com fade out ────────────────────────────────────────
  function removerOverlay() {
    const el = document.getElementById('af-overlay');
    if (!el) return;
    el.classList.add('saindo');
    setTimeout(() => el.remove(), 310);
  }

  // ── Logout público ────────────────────────────────────────────────────────
  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.reload();
  }

  // ── Ponto de entrada ──────────────────────────────────────────────────────
  async function init() {
    if (!isProducao) return; // localhost: passa direto

    // Esconde o body enquanto verifica o token (evita flash de conteúdo)
    document.body.style.visibility = 'hidden';

    const autenticado = await verificarToken();

    document.body.style.visibility = '';

    if (!autenticado) criarOverlay();
  }

  return { init, logout };
})();

// Roda assim que o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Auth.init());
} else {
  Auth.init();
}
