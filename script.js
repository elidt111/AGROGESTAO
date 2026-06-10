/* ============================================================
   AgroGestão — Mini-ERP Rural
   script.js — Lógica Completa
   ============================================================
   Dependência: idb (IndexedDB wrapper)
   Incluído via CDN no index.html:
   <script src="https://cdn.jsdelivr.net/npm/idb@7/build/umd.js"></script>
   ============================================================ */

"use strict";

// ============================================================
//  INDEXEDDB — Configuração
// ============================================================
const DB_NAME    = "AgroGestao";
const DB_VERSION = 1;
const STORE_NAME = "dados";

let _db = null;

async function getDB() {
  if (_db) return _db;
  _db = await idb.openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
  return _db;
}

// ============================================================
//  ESTADO GLOBAL
// ============================================================
const APP = {
  currentSection: "dashboard",
  isOnline: navigator.onLine,
  syncQueue: [],
  vendaCarrinho: [],
  vendaAtiva: false,
  data: {
    produtos: [],
    clientes: [],
    fornecedores: [],
    vendas: [],
    compras: [],
    transacoes: [],
    contasPagar: [],
    contasReceber: [],
    producao: [],
    movimentacoes: [],
    usuarios: [],
    config: {},
  },
};

// ============================================================
//  INICIALIZAÇÃO
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  await carregarDados();
  verificarConexao();
  atualizarRelogio();
  setInterval(atualizarRelogio, 60000);
  window.addEventListener("online",  aoFicarOnline);
  window.addEventListener("offline", aoFicarOffline);
  aplicarConfigFazenda();
  renderDashboard();
  renderEstoque();
  renderVendas();
  renderCompras();
  renderFinanceiro();
  renderProducao();
  renderUsuarios();
  verificarAlertasEstoque();
  setInterval(tentarSincronizacao, 30000);
});

// ============================================================
//  DADOS INICIAIS (Seed)
// ============================================================
function dadosIniciais() {
  APP.data.produtos = [
    { id: uid(), codigo: "PRD001", nome: "Soja Grão", categoria: "Grãos",     qtd: 1500, un: "kg",  valor: 1.95, fornecedor: "AgroSul", qtdMin: 200 },
    { id: uid(), codigo: "PRD002", nome: "Milho Grão", categoria: "Grãos",    qtd: 800,  un: "kg",  valor: 0.95, fornecedor: "CerealNorte", qtdMin: 200 },
    { id: uid(), codigo: "PRD003", nome: "Ureia 45%",  categoria: "Fertilizantes", qtd: 50, un: "sc", valor: 145.00, fornecedor: "FertiCenter", qtdMin: 20 },
    { id: uid(), codigo: "PRD004", nome: "Herbicida XP", categoria: "Insumos", qtd: 12, un: "L",  valor: 89.50,  fornecedor: "AgroDefesa", qtdMin: 5 },
    { id: uid(), codigo: "PRD005", nome: "Semente Soja BRS", categoria: "Sementes", qtd: 3, un: "sc", valor: 320.00, fornecedor: "Embrapa", qtdMin: 10 },
    { id: uid(), codigo: "PRD006", nome: "Vacina aftosa",  categoria: "Veterinário", qtd: 40, un: "dose", valor: 4.20, fornecedor: "VetFarm", qtdMin: 30 },
    { id: uid(), codigo: "PRD007", nome: "Enxada",         categoria: "Ferramentas", qtd: 8, un: "un", valor: 35.00, fornecedor: "Ferragens João", qtdMin: 3 },
    { id: uid(), codigo: "PRD008", nome: "Sorgo Grão",     categoria: "Grãos",       qtd: 0, un: "kg", valor: 0.85, fornecedor: "CerealNorte", qtdMin: 100 },
  ];

  APP.data.clientes = [
    { id: uid(), nome: "João Pereira",    telefone: "(62) 99100-0001", cidade: "Anápolis",  cpfCnpj: "123.456.789-01" },
    { id: uid(), nome: "Maria Gomes",     telefone: "(62) 98200-0002", cidade: "Goiânia",   cpfCnpj: "234.567.890-02" },
    { id: uid(), nome: "Carlos Ribeiro",  telefone: "(62) 97300-0003", cidade: "Inhumas",   cpfCnpj: "345.678.901-03" },
    { id: uid(), nome: "Ana Nascimento",  telefone: "(64) 96400-0004", cidade: "Jataí",     cpfCnpj: "456.789.012-04" },
    { id: uid(), nome: "Cooperativa Sul", telefone: "(64) 95500-0005", cidade: "Rio Verde",  cpfCnpj: "12.345.678/0001-99" },
  ];

  APP.data.fornecedores = [
    { id: uid(), nome: "AgroSul",         contato: "(64) 3301-1000", cidade: "Rio Verde",   categoria: "Grãos" },
    { id: uid(), nome: "FertiCenter",     contato: "(62) 3302-2000", cidade: "Anápolis",    categoria: "Fertilizantes" },
    { id: uid(), nome: "AgroDefesa",      contato: "(62) 3303-3000", cidade: "Goiânia",     categoria: "Defensivos" },
    { id: uid(), nome: "VetFarm",         contato: "(64) 3304-4000", cidade: "Jataí",       categoria: "Veterinário" },
    { id: uid(), nome: "Ferragens João",  contato: "(62) 9988-5000", cidade: "Anápolis",    categoria: "Ferramentas" },
    { id: uid(), nome: "CerealNorte",     contato: "(63) 3305-6000", cidade: "Palmas",      categoria: "Grãos" },
  ];

  const hoje = new Date();
  APP.data.vendas = [
    { id: uid(), num: 1001, data: dataBR(daysAgo(0)), cliente: "João Pereira",    itens: [{nome:"Soja Grão",qtd:100,valor:1.95}], pagamento: "PIX",     total: 195.00, status: "Pago" },
    { id: uid(), num: 1002, data: dataBR(daysAgo(0)), cliente: "Cooperativa Sul", itens: [{nome:"Milho Grão",qtd:500,valor:0.95}], pagamento: "Boleto",  total: 475.00, status: "Pago" },
    { id: uid(), num: 1003, data: dataBR(daysAgo(1)), cliente: "Maria Gomes",     itens: [{nome:"Ureia 45%",qtd:2,valor:145.00}],  pagamento: "Dinheiro",total: 290.00, status: "Pago" },
    { id: uid(), num: 1004, data: dataBR(daysAgo(2)), cliente: "Carlos Ribeiro",  itens: [{nome:"Soja Grão",qtd:50,valor:1.95}],   pagamento: "Fiado",   total: 97.50,  status: "Pendente" },
    { id: uid(), num: 1005, data: dataBR(daysAgo(3)), cliente: "Ana Nascimento",  itens: [{nome:"Herbicida XP",qtd:3,valor:89.50}],pagamento: "Cartão",  total: 268.50, status: "Pago" },
  ];

  APP.data.compras = [
    { id: uid(), data: dataBR(daysAgo(5)), fornecedor: "FertiCenter",  produto: "Ureia 45%",       qtd: 20, valorUnit: 140.00, total: 2800.00, status: "Recebido" },
    { id: uid(), data: dataBR(daysAgo(8)), fornecedor: "AgroDefesa",   produto: "Herbicida XP",    qtd: 10, valorUnit: 85.00,  total: 850.00,  status: "Recebido" },
    { id: uid(), data: dataBR(daysAgo(2)), fornecedor: "VetFarm",      produto: "Vacina aftosa",   qtd: 50, valorUnit: 4.00,   total: 200.00,  status: "Pendente" },
    { id: uid(), data: dataBR(daysAgo(12)),fornecedor: "AgroSul",      produto: "Soja Grão",       qtd: 800,valorUnit: 1.80,  total: 1440.00, status: "Recebido" },
  ];

  APP.data.transacoes = [
    { id: uid(), data: dataBR(daysAgo(0)),  descricao: "Venda Cooperativa Sul",  tipo: "Receita",  valor: 475.00,  status: "Pago" },
    { id: uid(), data: dataBR(daysAgo(0)),  descricao: "Venda João Pereira",     tipo: "Receita",  valor: 195.00,  status: "Pago" },
    { id: uid(), data: dataBR(daysAgo(1)),  descricao: "Venda Maria Gomes",      tipo: "Receita",  valor: 290.00,  status: "Pago" },
    { id: uid(), data: dataBR(daysAgo(2)),  descricao: "Compra Ureia 45%",       tipo: "Despesa",  valor: 2800.00, status: "Pago" },
    { id: uid(), data: dataBR(daysAgo(3)),  descricao: "Manutenção Trator",      tipo: "Despesa",  valor: 650.00,  status: "Pago" },
    { id: uid(), data: dataBR(daysAgo(4)),  descricao: "Venda Ana Nascimento",   tipo: "Receita",  valor: 268.50,  status: "Pago" },
    { id: uid(), data: dataBR(daysAgo(5)),  descricao: "Compra Herbicida XP",    tipo: "Despesa",  valor: 850.00,  status: "Pago" },
    { id: uid(), data: dataBR(daysAgo(6)),  descricao: "Energia elétrica",       tipo: "Despesa",  valor: 380.00,  status: "Pago" },
  ];

  APP.data.contasPagar = [
    { id: uid(), descricao: "Parcela financiamento trator", vencimento: dataBR(daysFromNow(5)),  valor: 1200.00, status: "Pendente" },
    { id: uid(), descricao: "Seguro propriedade",           vencimento: dataBR(daysFromNow(12)), valor: 450.00,  status: "Pendente" },
    { id: uid(), descricao: "Conta de luz",                 vencimento: dataBR(daysFromNow(3)),  valor: 380.00,  status: "Pendente" },
    { id: uid(), descricao: "Compra Vacina aftosa",         vencimento: dataBR(daysFromNow(8)),  valor: 200.00,  status: "Pendente" },
  ];

  APP.data.contasReceber = [
    { id: uid(), descricao: "Carlos Ribeiro — Soja (fiado)", vencimento: dataBR(daysFromNow(7)),  valor: 97.50,   status: "Pendente" },
    { id: uid(), descricao: "Cooperativa Sul — adiantamento", vencimento: dataBR(daysFromNow(15)), valor: 3000.00, status: "Pendente" },
  ];

  APP.data.producao = [
    { id: uid(), safra: "Soja 23/24", lote: "Lote A1", dataPlantio: dataBR(daysAgo(90)), previsaoColheita: dataBR(daysFromNow(30)), qtdProduzida: "—", insumos: "Ureia, Herbicida XP", status: "Em andamento", obs: "Solo em boas condições" },
    { id: uid(), safra: "Milho 24",   lote: "Lote B2", dataPlantio: dataBR(daysAgo(60)), previsaoColheita: dataBR(daysFromNow(60)), qtdProduzida: "—", insumos: "Ureia", status: "Em andamento", obs: "" },
    { id: uid(), safra: "Soja 22/23", lote: "Lote A1", dataPlantio: dataBR(daysAgo(400)),previsaoColheita: dataBR(daysAgo(280)),    qtdProduzida: "1.200 sc", insumos: "Ureia, Calcário", status: "Colhido", obs: "Excelente produtividade" },
  ];

  APP.data.movimentacoes = [
    { id: uid(), data: dataBR(daysAgo(0)), produto: "Soja Grão",    tipo: "Saída",  qtd: 100, responsavel: "João Admin" },
    { id: uid(), data: dataBR(daysAgo(0)), produto: "Milho Grão",   tipo: "Saída",  qtd: 500, responsavel: "João Admin" },
    { id: uid(), data: dataBR(daysAgo(2)), produto: "Ureia 45%",    tipo: "Entrada",qtd: 20,  responsavel: "João Admin" },
    { id: uid(), data: dataBR(daysAgo(3)), produto: "Herbicida XP", tipo: "Entrada",qtd: 10,  responsavel: "João Admin" },
  ];

  APP.data.usuarios = [
    { id: uid(), nome: "João Administrador", login: "joao.admin", perfil: "Administrador", status: "Ativo" },
    { id: uid(), nome: "Maria Operadora",    login: "maria.op",   perfil: "Operador",       status: "Ativo" },
    { id: uid(), nome: "Pedro Visualizador", login: "pedro.vis",  perfil: "Visualizador",   status: "Inativo" },
  ];

  APP.data.config = {
    nomeFazenda: "Fazenda São João",
    proprietario: "João Pereira",
    municipio: "Anápolis",
    estado: "GO",
    area: "450",
    doc: "123.456.789-00",
    tema: "light",
    nomeUsuario: "Administrador",
  };

  salvarDados();
}

// ============================================================
//  PERSISTÊNCIA (IndexedDB via idb)
// ============================================================
async function salvarDados() {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, APP.data, "appdata");
    await db.put(STORE_NAME, APP.syncQueue, "syncqueue");
  } catch(e) {
    console.error("Erro ao salvar no IndexedDB:", e);
    // Fallback para localStorage em caso de erro
    localStorage.setItem("agrogestao_data", JSON.stringify(APP.data));
  }
  adicionarFilaSync("dados gerais", "Atualização de dados");
}

async function carregarDados() {
  try {
    const db = await getDB();
    const dados = await db.get(STORE_NAME, "appdata");
    if (dados) {
      APP.data = dados;
    } else {
      // Tentar migrar do localStorage se existir
      const rawLegacy = localStorage.getItem("agrogestao_data");
      if (rawLegacy) {
        try {
          APP.data = JSON.parse(rawLegacy);
          await db.put(STORE_NAME, APP.data, "appdata");
          localStorage.removeItem("agrogestao_data");
        } catch(e) {
          dadosIniciais();
        }
      } else {
        dadosIniciais();
      }
    }
    const syncData = await db.get(STORE_NAME, "syncqueue");
    if (syncData) APP.syncQueue = syncData;
  } catch(e) {
    console.error("Erro ao carregar do IndexedDB:", e);
    // Fallback para localStorage
    const raw = localStorage.getItem("agrogestao_data");
    if (raw) {
      try { APP.data = JSON.parse(raw); } catch(err) { dadosIniciais(); }
    } else {
      dadosIniciais();
    }
  }
}

// ============================================================
//  NAVEGAÇÃO
// ============================================================
const SECTION_TITLES = {
  dashboard:      ["Dashboard",         "Visão geral da propriedade"],
  estoque:        ["Estoque",           "Gerenciamento de produtos e insumos"],
  vendas:         ["Vendas",            "Registro e histórico de vendas"],
  compras:        ["Compras",           "Registro e histórico de compras"],
  financeiro:     ["Financeiro",        "Fluxo de caixa e contas"],
  producao:       ["Produção Rural",    "Safras, plantios e lotes"],
  relatorios:     ["Relatórios",        "Relatórios gerenciais"],
  sincronizacao:  ["Sincronização",     "Status de conectividade e envio de dados"],
  configuracoes:  ["Configurações",     "Configurações do sistema"],
};

function navigate(section) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const target = document.getElementById(`section-${section}`);
  if (target) target.classList.add("active");

  const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (nav) nav.classList.add("active");

  const titles = SECTION_TITLES[section] || [section, ""];
  document.getElementById("page-title").textContent = titles[0];
  document.getElementById("page-subtitle").textContent = titles[1];

  APP.currentSection = section;

  // Render dinâmico
  if (section === "dashboard")     renderDashboard();
  if (section === "estoque")       renderEstoque();
  if (section === "vendas")        renderVendas();
  if (section === "compras")       renderCompras();
  if (section === "financeiro")    renderFinanceiro();
  if (section === "producao")      renderProducao();
  if (section === "sincronizacao") renderSincronizacao();
  if (section === "configuracoes") carregarConfigFazenda();
  if (section === "relatorios")    fecharRelatorio();
}

// ============================================================
//  SIDEBAR TOGGLE
// ============================================================
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}

// ============================================================
//  RELÓGIO
// ============================================================
function atualizarRelogio() {
  const agora = new Date();
  document.getElementById("date-display").textContent =
    agora.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

// ============================================================
//  CONEXÃO ONLINE/OFFLINE
// ============================================================
function verificarConexao() {
  if (navigator.onLine) aoFicarOnline();
  else aoFicarOffline();
}

function aoFicarOnline() {
  APP.isOnline = true;
  setConnStatus("online", "Online");
  mostrarNotificacao("Conexão restabelecida! Sincronizando dados...", "success");
  setTimeout(sincronizarAgora, 1500);
}

function aoFicarOffline() {
  APP.isOnline = false;
  setConnStatus("offline", "Offline");
  mostrarNotificacao("Modo Offline — dados salvos localmente.", "warning");
}

function setConnStatus(tipo, label) {
  ["conn-dot", "conn-dot-top"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = `dot ${tipo}`; }
  });
  ["conn-label-sidebar", "conn-label-top"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = label;
  });
}

// ============================================================
//  DASHBOARD
// ============================================================
function renderDashboard() {
  const { produtos, vendas, transacoes } = APP.data;

  // Total em estoque
  document.getElementById("dash-total-estoque").textContent = produtos.length;

  // Vendas do dia
  const hoje = dataBR(new Date());
  const vendasHoje = vendas.filter(v => v.data === hoje);
  document.getElementById("dash-vendas-dia").textContent = vendasHoje.length;

  // Receita mensal
  const mesAtual = new Date().getMonth();
  const receitaMes = transacoes
    .filter(t => t.tipo === "Receita" && parseBR(t.data).getMonth() === mesAtual)
    .reduce((s, t) => s + t.valor, 0);
  document.getElementById("dash-receita-mensal").textContent = formatBRL(receitaMes);

  // Produtos em falta (estoque = 0 ou abaixo do mínimo)
  const emFalta = produtos.filter(p => p.qtd <= 0 || p.qtd < p.qtdMin).length;
  document.getElementById("dash-produtos-falta").textContent = emFalta;

  // Gráfico receita semanal
  renderChartReceita();

  // Últimas vendas
  const tbody = document.getElementById("dash-vendas-body");
  const ultimas = [...vendas].reverse().slice(0, 5);
  tbody.innerHTML = ultimas.map(v =>
    `<tr>
      <td>${v.data}</td>
      <td>${v.cliente}</td>
      <td class="fw-bold">${formatBRL(v.total)}</td>
      <td><span class="badge badge-${v.status === 'Pago' ? 'pago' : 'pendente'}">${v.status}</span></td>
    </tr>`
  ).join("") || `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:1.5rem">Nenhuma venda registrada.</td></tr>`;

  // Alertas
  verificarAlertasEstoque();
}

function renderChartReceita() {
  const container = document.getElementById("chart-receita");
  if (!container) return;
  const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const hoje = new Date();
  const bars = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const label = dias[d.getDay()];
    const str = dataBR(d);
    const total = APP.data.transacoes
      .filter(t => t.tipo === "Receita" && t.data === str)
      .reduce((s, t) => s + t.valor, 0);
    bars.push({ label, total });
  }
  const maxVal = Math.max(...bars.map(b => b.total), 1);
  container.innerHTML = bars.map(b => {
    const pct = Math.max((b.total / maxVal) * 100, b.total > 0 ? 4 : 1);
    return `<div class="bar-col">
      <div class="bar" style="height:${pct}%" data-val="${formatBRL(b.total)}"></div>
      <span class="bar-label">${b.label}</span>
    </div>`;
  }).join("");
}

function verificarAlertasEstoque() {
  const container = document.getElementById("alertas-estoque-list");
  if (!container) return;
  const criticos = APP.data.produtos.filter(p => p.qtd <= 0);
  const baixos   = APP.data.produtos.filter(p => p.qtd > 0 && p.qtd < p.qtdMin);
  let html = "";
  criticos.forEach(p => {
    html += `<div class="alerta-item critico">
      <span class="alerta-icon">🚫</span>
      <span class="alerta-nome">${p.nome} (${p.codigo})</span>
      <span class="alerta-qtd">SEM ESTOQUE</span>
    </div>`;
  });
  baixos.forEach(p => {
    html += `<div class="alerta-item">
      <span class="alerta-icon">⚠️</span>
      <span class="alerta-nome">${p.nome} (${p.codigo})</span>
      <span class="alerta-qtd text-amber">${p.qtd} ${p.un} restantes (mín: ${p.qtdMin})</span>
    </div>`;
  });
  container.innerHTML = html || `<p class="text-muted">✅ Nenhum alerta de estoque no momento.</p>`;

  // Badge no sidebar
  const badge = document.getElementById("sync-badge");
  if (APP.syncQueue.length > 0) {
    badge.classList.remove("hidden");
    badge.textContent = APP.syncQueue.length;
  } else {
    badge.classList.add("hidden");
  }
}

// ============================================================
//  ESTOQUE
// ============================================================
function renderEstoque(filtro = null) {
  const tbody = document.getElementById("estoque-body");
  const movm  = document.getElementById("movimentacao-body");
  let prods = APP.data.produtos;

  if (filtro) prods = filtro;

  tbody.innerHTML = prods.map(p => {
    const status = p.qtd <= 0 ? "empty" : p.qtd < p.qtdMin ? "low" : "ok";
    const statusLabel = p.qtd <= 0 ? "Sem estoque" : p.qtd < p.qtdMin ? "Estoque baixo" : "Normal";
    return `<tr>
      <td><code>${p.codigo}</code></td>
      <td class="fw-bold">${p.nome}</td>
      <td><span class="badge badge-ativo">${p.categoria}</span></td>
      <td class="${p.qtd <= 0 ? 'text-danger fw-bold' : ''}">${p.qtd}</td>
      <td>${p.un}</td>
      <td>${formatBRL(p.valor)}</td>
      <td>${p.fornecedor}</td>
      <td><span class="badge badge-${status}">${statusLabel}</span></td>
      <td>
        <button class="btn btn-icon" onclick="editarProduto('${p.id}')" title="Editar">✏️</button>
        <button class="btn btn-icon" onclick="excluirProduto('${p.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="9" class="text-muted" style="text-align:center;padding:1.5rem">Nenhum produto cadastrado.</td></tr>`;

  movm.innerHTML = APP.data.movimentacoes.map(m =>
    `<tr>
      <td>${m.data}</td>
      <td>${m.produto}</td>
      <td><span class="badge ${m.tipo === 'Entrada' ? 'badge-pago' : 'badge-pendente'}">${m.tipo}</span></td>
      <td>${m.qtd}</td>
      <td>${m.responsavel}</td>
    </tr>`
  ).join("") || `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:1rem">Nenhuma movimentação.</td></tr>`;
}

function filtrarEstoque() {
  const busca = document.getElementById("estoque-search").value.toLowerCase();
  const cat   = document.getElementById("estoque-filter-cat").value;
  let prods = APP.data.produtos;
  if (busca) prods = prods.filter(p => p.nome.toLowerCase().includes(busca) || p.codigo.toLowerCase().includes(busca));
  if (cat)   prods = prods.filter(p => p.categoria === cat);
  renderEstoque(prods);
}

function openFormEstoque(id = null) {
  const p = id ? APP.data.produtos.find(x => x.id === id) : null;
  openModal(p ? "Editar Produto" : "Novo Produto",
    `<div class="form-grid-2">
      <div class="form-group"><label>Código Interno</label>
        <input type="text" class="form-control" id="p-codigo" value="${p?.codigo || autoCode()}" /></div>
      <div class="form-group"><label>Nome do Produto</label>
        <input type="text" class="form-control" id="p-nome" value="${p?.nome || ''}" /></div>
      <div class="form-group"><label>Categoria</label>
        <select class="form-control" id="p-cat">
          ${["Grãos","Insumos","Fertilizantes","Ferramentas","Veterinário","Sementes","Outros"].map(c =>
            `<option ${p?.categoria === c ? 'selected' : ''}>${c}</option>`).join("")}
        </select></div>
      <div class="form-group"><label>Quantidade</label>
        <input type="number" class="form-control" id="p-qtd" value="${p?.qtd || 0}" min="0" /></div>
      <div class="form-group"><label>Unidade</label>
        <select class="form-control" id="p-un">
          ${["kg","sc","L","un","cx","dose","t","g"].map(u =>
            `<option ${p?.un === u ? 'selected' : ''}>${u}</option>`).join("")}
        </select></div>
      <div class="form-group"><label>Valor Unitário (R$)</label>
        <input type="number" class="form-control" id="p-valor" step="0.01" value="${p?.valor || ''}" /></div>
      <div class="form-group"><label>Fornecedor</label>
        <input type="text" class="form-control" id="p-forn" value="${p?.fornecedor || ''}" /></div>
      <div class="form-group"><label>Qtd. Mínima</label>
        <input type="number" class="form-control" id="p-qtdmin" value="${p?.qtdMin || 0}" min="0" /></div>
    </div>`,
    [
      { label: "Cancelar", cls: "btn-secondary", fn: closeModal },
      { label: p ? "Salvar Alterações" : "Cadastrar Produto", cls: "btn-primary", fn: () => salvarProduto(id) }
    ]
  );
}

function editarProduto(id) { openFormEstoque(id); }

function salvarProduto(id) {
  const dados = {
    codigo:     V("p-codigo"),
    nome:       V("p-nome"),
    categoria:  V("p-cat"),
    qtd:        +V("p-qtd"),
    un:         V("p-un"),
    valor:      +V("p-valor"),
    fornecedor: V("p-forn"),
    qtdMin:     +V("p-qtdmin"),
  };
  if (!dados.nome) { mostrarNotificacao("Informe o nome do produto.", "error"); return; }
  if (id) {
    const i = APP.data.produtos.findIndex(x => x.id === id);
    APP.data.produtos[i] = { ...APP.data.produtos[i], ...dados };
  } else {
    APP.data.produtos.push({ id: uid(), ...dados });
  }
  salvarDados();
  closeModal();
  renderEstoque();
  renderDashboard();
  mostrarNotificacao(id ? "Produto atualizado!" : "Produto cadastrado!", "success");
}

function excluirProduto(id) {
  confirmar("Deseja excluir este produto?", () => {
    APP.data.produtos = APP.data.produtos.filter(p => p.id !== id);
    salvarDados();
    renderEstoque();
    renderDashboard();
    mostrarNotificacao("Produto removido.", "info");
  });
}

function openMovimentacao() {
  openModal("Movimentação de Estoque",
    `<div class="form-grid-2">
      <div class="form-group"><label>Produto</label>
        <select class="form-control" id="mov-produto">
          ${APP.data.produtos.map(p => `<option value="${p.id}">${p.nome} (${p.qtd} ${p.un})</option>`).join("")}
        </select></div>
      <div class="form-group"><label>Tipo</label>
        <select class="form-control" id="mov-tipo">
          <option>Entrada</option><option>Saída</option><option>Ajuste</option><option>Transferência</option>
        </select></div>
      <div class="form-group"><label>Quantidade</label>
        <input type="number" class="form-control" id="mov-qtd" min="1" value="1" /></div>
      <div class="form-group"><label>Responsável</label>
        <input type="text" class="form-control" id="mov-resp" value="${APP.data.config.nomeUsuario || 'Admin'}" /></div>
    </div>`,
    [
      { label: "Cancelar", cls: "btn-secondary", fn: closeModal },
      { label: "Registrar", cls: "btn-primary", fn: registrarMovimentacao }
    ]
  );
}

function registrarMovimentacao() {
  const prodId = V("mov-produto");
  const tipo   = V("mov-tipo");
  const qtd    = +V("mov-qtd");
  const resp   = V("mov-resp");
  const idx    = APP.data.produtos.findIndex(p => p.id === prodId);
  if (idx === -1 || qtd <= 0) { mostrarNotificacao("Dados inválidos.", "error"); return; }
  const prod = APP.data.produtos[idx];
  if ((tipo === "Saída" || tipo === "Transferência") && prod.qtd < qtd) {
    mostrarNotificacao(`Estoque insuficiente! Disponível: ${prod.qtd} ${prod.un}`, "error"); return;
  }
  if (tipo === "Entrada" || tipo === "Transferência") {
    APP.data.produtos[idx].qtd += qtd;
  } else if (tipo === "Saída") {
    APP.data.produtos[idx].qtd -= qtd;
  } else if (tipo === "Ajuste") {
    // Ajuste: substitui a quantidade pelo valor informado
    APP.data.produtos[idx].qtd = qtd;
  }
  APP.data.movimentacoes.unshift({ id: uid(), data: dataBR(new Date()), produto: prod.nome, tipo, qtd, responsavel: resp });
  salvarDados();
  closeModal();
  renderEstoque();
  renderDashboard();
  mostrarNotificacao(`${tipo} de ${qtd} ${prod.un} registrada.`, "success");
}

// ============================================================
//  VENDAS
// ============================================================
function renderVendas() {
  const tbody = document.getElementById("vendas-body");
  tbody.innerHTML = [...APP.data.vendas].reverse().map(v =>
    `<tr>
      <td>${v.data}</td>
      <td>#${v.num}</td>
      <td>${v.cliente}</td>
      <td>${v.itens.length} item(ns)</td>
      <td>${v.pagamento}</td>
      <td class="fw-bold">${formatBRL(v.total)}</td>
      <td><span class="badge badge-${v.status === 'Pago' ? 'pago' : v.status === 'Cancelado' ? 'cancelado' : 'pendente'}">${v.status}</span></td>
      <td>
        <button class="btn btn-icon" onclick="verComprovante('${v.id}')" title="Comprovante">🧾</button>
        ${v.status !== 'Cancelado' ? `<button class="btn btn-icon" onclick="cancelarVendaId('${v.id}')" title="Cancelar">❌</button>` : ""}
      </td>
    </tr>`
  ).join("") || `<tr><td colspan="8" class="text-muted" style="text-align:center;padding:1.5rem">Nenhuma venda registrada.</td></tr>`;

  // Preencher selects de clientes e produtos no carrinho
  const selCli = document.getElementById("venda-cliente");
  if (selCli) {
    selCli.innerHTML = `<option value="">Selecione o cliente...</option>` +
      APP.data.clientes.map(c => `<option value="${c.nome}">${c.nome}${c.cpfCnpj ? ' — ' + c.cpfCnpj : ''}</option>`).join("");
  }
  const selProd = document.getElementById("venda-produto-sel");
  if (selProd) {
    selProd.innerHTML = APP.data.produtos.filter(p => p.qtd > 0).map(p =>
      `<option value="${p.id}">${p.nome} — R$ ${p.valor.toFixed(2)} (${p.qtd} ${p.un})</option>`
    ).join("");
  }
}

function openNovaVenda() {
  APP.vendaCarrinho = [];
  APP.vendaAtiva = true;
  document.getElementById("carrinho-container").classList.remove("hidden");
  renderCarrinho();
  renderVendas();
  document.getElementById("carrinho-container").scrollIntoView({ behavior: "smooth" });
}

function cancelarVenda() {
  APP.vendaCarrinho = [];
  APP.vendaAtiva = false;
  document.getElementById("carrinho-container").classList.add("hidden");
}

function adicionarItemCarrinho() {
  const prodId = V("venda-produto-sel");
  const qtd    = +V("venda-qtd");
  const prod   = APP.data.produtos.find(p => p.id === prodId);
  if (!prod || qtd <= 0) { mostrarNotificacao("Selecione um produto e informe a quantidade.", "error"); return; }
  if (qtd > prod.qtd) { mostrarNotificacao(`Estoque insuficiente! Disponível: ${prod.qtd} ${prod.un}`, "error"); return; }
  const existente = APP.vendaCarrinho.find(i => i.prodId === prodId);
  if (existente) {
    existente.qtd += qtd;
    existente.total = existente.qtd * existente.valor;
  } else {
    APP.vendaCarrinho.push({ prodId, nome: prod.nome, qtd, un: prod.un, valor: prod.valor, total: qtd * prod.valor });
  }
  renderCarrinho();
}

function renderCarrinho() {
  const lista = document.getElementById("carrinho-itens-list");
  const totalRow = document.getElementById("carrinho-total-row");
  if (!APP.vendaCarrinho.length) {
    lista.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--text-muted);font-size:0.88rem">Carrinho vazio — adicione produtos acima.</div>`;
    totalRow.innerHTML = "";
    return;
  }
  lista.innerHTML = APP.vendaCarrinho.map((item, i) =>
    `<div class="carrinho-item">
      <span class="carrinho-item-nome">${item.nome}</span>
      <span class="carrinho-item-qtd">${item.qtd} ${item.un}</span>
      <span class="carrinho-item-valor">${formatBRL(item.total)}</span>
      <button class="btn btn-icon" onclick="removerItemCarrinho(${i})" title="Remover">✕</button>
    </div>`
  ).join("");
  const total = APP.vendaCarrinho.reduce((s, i) => s + i.total, 0);
  totalRow.innerHTML = `<span>Total da Venda:</span><span style="font-size:1.3rem;color:var(--color-primary-dark)">${formatBRL(total)}</span>`;
}

function removerItemCarrinho(i) {
  APP.vendaCarrinho.splice(i, 1);
  renderCarrinho();
}

function finalizarVenda() {
  const cliente   = V("venda-cliente");
  const pagamento = V("venda-pagamento");
  if (!cliente) { mostrarNotificacao("Selecione o cliente.", "error"); return; }
  if (!APP.vendaCarrinho.length) { mostrarNotificacao("Adicione produtos ao carrinho.", "error"); return; }

  showLoading();
  setTimeout(() => {
    const total = APP.vendaCarrinho.reduce((s, i) => s + i.total, 0);
    const num   = 1000 + APP.data.vendas.length + 1;
    const venda = {
      id: uid(), num, data: dataBR(new Date()), cliente, pagamento,
      itens: APP.vendaCarrinho.map(i => ({ nome: i.nome, qtd: i.qtd, valor: i.valor })),
      total, status: pagamento === "Fiado" ? "Pendente" : "Pago",
      obs: V("venda-obs")
    };

    // Baixar estoque
    APP.vendaCarrinho.forEach(item => {
      const idx = APP.data.produtos.findIndex(p => p.id === item.prodId);
      if (idx !== -1) APP.data.produtos[idx].qtd -= item.qtd;
      APP.data.movimentacoes.unshift({ id: uid(), data: venda.data, produto: item.nome, tipo: "Saída", qtd: item.qtd, responsavel: cliente });
    });

    // Registrar transação
    APP.data.transacoes.unshift({ id: uid(), data: venda.data, descricao: `Venda #${num} — ${cliente}`, tipo: "Receita", valor: total, status: venda.status });

    // Se fiado, contas a receber
    if (pagamento === "Fiado") {
      APP.data.contasReceber.push({ id: uid(), descricao: `Venda #${num} — ${cliente}`, vencimento: dataBR(daysFromNow(30)), valor: total, status: "Pendente" });
    }

    APP.data.vendas.push(venda);
    salvarDados();
    cancelarVenda();
    renderVendas();
    renderDashboard();
    hideLoading();
    mostrarNotificacao(`Venda #${num} finalizada! Total: ${formatBRL(total)}`, "success");
    verComprovante(venda.id);
  }, 800);
}

function verComprovante(id) {
  const v = APP.data.vendors || APP.data.vendas;
  const venda = APP.data.vendas.find(x => x.id === id);
  if (!venda) return;
  const itens = venda.itens.map(i =>
    `  ${i.nome.padEnd(20)} ${String(i.qtd).padStart(4)} x ${formatBRL(i.valor).padStart(8)} = ${formatBRL(i.qtd * i.valor).padStart(10)}`
  ).join("\n");
  const texto = `
========================================
         AGROGESTÃO — MINI-ERP RURAL
========================================
 ${APP.data.config.nomeFazenda || "Fazenda São João"}
----------------------------------------
 Venda Nº: #${venda.num}
 Data    : ${venda.data}
 Cliente : ${venda.cliente}
 Pagto.  : ${venda.pagamento}
----------------------------------------
 ITENS:
${itens}
----------------------------------------
 TOTAL: ${formatBRL(venda.total).padStart(38)}
========================================
 Status: ${venda.status}
 Obs: ${venda.obs || "—"}
========================================`;
  openModal(`Comprovante — Venda #${venda.num}`,
    `<div class="comprovante">${texto}</div>`,
    [{ label: "Fechar", cls: "btn-secondary", fn: closeModal }]
  );
}

function cancelarVendaId(id) {
  confirmar("Confirma o cancelamento desta venda?", () => {
    const idx = APP.data.vendas.findIndex(v => v.id === id);
    if (idx !== -1) {
      APP.data.vendas[idx].status = "Cancelado";
      salvarDados();
      renderVendas();
      renderDashboard();
      mostrarNotificacao("Venda cancelada.", "info");
    }
  });
}

// ============================================================
//  CLIENTES
// ============================================================
function openNovoCliente() {
  openModal("Novo Cliente",
    `<div class="form-grid-2">
      <div class="form-group"><label>Nome Completo</label>
        <input type="text" class="form-control" id="cli-nome" /></div>
      <div class="form-group"><label>CPF / CNPJ</label>
        <input type="text" class="form-control" id="cli-cpfcnpj" placeholder="000.000.000-00 ou 00.000.000/0000-00" /></div>
      <div class="form-group"><label>Telefone</label>
        <input type="text" class="form-control" id="cli-tel" placeholder="(00) 00000-0000" /></div>
      <div class="form-group"><label>Cidade</label>
        <input type="text" class="form-control" id="cli-cidade" /></div>
    </div>`,
    [
      { label: "Cancelar", cls: "btn-secondary", fn: closeModal },
      { label: "Cadastrar Cliente", cls: "btn-primary", fn: salvarNovoCliente }
    ]
  );
}

function salvarNovoCliente() {
  const nome     = V("cli-nome");
  const cpfCnpj  = V("cli-cpfcnpj");
  const telefone = V("cli-tel");
  const cidade   = V("cli-cidade");
  if (!nome) { mostrarNotificacao("Informe o nome do cliente.", "error"); return; }
  APP.data.clientes.push({ id: uid(), nome, cpfCnpj, telefone, cidade });
  salvarDados();
  closeModal();
  renderVendas();
  mostrarNotificacao("Cliente cadastrado!", "success");
}


function renderCompras() {
  const tbody = document.getElementById("compras-body");
  tbody.innerHTML = [...APP.data.compras].reverse().map(c =>
    `<tr>
      <td>${c.data}</td>
      <td>${c.fornecedor}</td>
      <td>${c.produto}</td>
      <td>${c.qtd}</td>
      <td>${formatBRL(c.valorUnit)}</td>
      <td class="fw-bold">${formatBRL(c.total)}</td>
      <td><span class="badge badge-${c.status === 'Recebido' ? 'pago' : 'pendente'}">${c.status}</span></td>
    </tr>`
  ).join("") || `<tr><td colspan="7" class="text-muted" style="text-align:center;padding:1.5rem">Nenhuma compra registrada.</td></tr>`;

  const fbody = document.getElementById("fornecedores-body");
  fbody.innerHTML = APP.data.fornecedores.map(f =>
    `<tr>
      <td class="fw-bold">${f.nome}</td>
      <td>${f.contato}</td>
      <td>${f.cidade}</td>
      <td><span class="badge badge-ativo">${f.categoria}</span></td>
      <td>
        <button class="btn btn-icon" onclick="editarFornecedor('${f.id}')">✏️</button>
        <button class="btn btn-icon" onclick="excluirFornecedor('${f.id}')">🗑️</button>
      </td>
    </tr>`
  ).join("") || `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:1rem">Nenhum fornecedor.</td></tr>`;
}

function openNovaCompra() {
  openModal("Registrar Compra",
    `<div class="form-grid-2">
      <div class="form-group"><label>Fornecedor</label>
        <select class="form-control" id="c-forn">
          ${APP.data.fornecedores.map(f => `<option value="${f.nome}">${f.nome}</option>`).join("")}
        </select></div>
      <div class="form-group"><label>Produto</label>
        <input type="text" class="form-control" id="c-prod" placeholder="Nome do produto" /></div>
      <div class="form-group"><label>Quantidade</label>
        <input type="number" class="form-control" id="c-qtd" min="1" value="1" /></div>
      <div class="form-group"><label>Valor Unitário (R$)</label>
        <input type="number" class="form-control" id="c-val" step="0.01" min="0" /></div>
      <div class="form-group"><label>Lançar no Estoque?</label>
        <select class="form-control" id="c-estoque">
          <option value="sim">Sim — dar entrada automática</option>
          <option value="nao">Não</option>
        </select></div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="c-status">
          <option>Recebido</option><option>Pendente</option>
        </select></div>
    </div>`,
    [
      { label: "Cancelar", cls: "btn-secondary", fn: closeModal },
      { label: "Registrar Compra", cls: "btn-primary", fn: salvarCompra }
    ]
  );
}

function salvarCompra() {
  const forn   = V("c-forn");
  const prod   = V("c-prod");
  const qtd    = +V("c-qtd");
  const val    = +V("c-val");
  const status = V("c-status");
  const noEst  = V("c-estoque") === "sim";
  if (!prod || !qtd || !val) { mostrarNotificacao("Preencha todos os campos.", "error"); return; }

  showLoading();
  setTimeout(() => {
    const total = qtd * val;
    APP.data.compras.push({ id: uid(), data: dataBR(new Date()), fornecedor: forn, produto: prod, qtd, valorUnit: val, total, status });
    APP.data.transacoes.unshift({ id: uid(), data: dataBR(new Date()), descricao: `Compra: ${prod} (${forn})`, tipo: "Despesa", valor: total, status: "Pago" });

    if (noEst) {
      const idx = APP.data.produtos.findIndex(p => p.nome.toLowerCase() === prod.toLowerCase());
      if (idx !== -1) {
        APP.data.produtos[idx].qtd += qtd;
        APP.data.movimentacoes.unshift({ id: uid(), data: dataBR(new Date()), produto: prod, tipo: "Entrada", qtd, responsavel: "Compra" });
      }
    }

    salvarDados();
    closeModal();
    renderCompras();
    renderFinanceiro();
    renderDashboard();
    hideLoading();
    mostrarNotificacao("Compra registrada com sucesso!", "success");
  }, 600);
}

function editarFornecedor(id) {
  const f = APP.data.fornecedores.find(x => x.id === id);
  openModal("Editar Fornecedor",
    `<div class="form-grid-2">
      <div class="form-group"><label>Nome</label><input type="text" class="form-control" id="f-nome" value="${f.nome}" /></div>
      <div class="form-group"><label>Contato</label><input type="text" class="form-control" id="f-contato" value="${f.contato}" /></div>
      <div class="form-group"><label>Cidade</label><input type="text" class="form-control" id="f-cidade" value="${f.cidade}" /></div>
      <div class="form-group"><label>Categoria</label><input type="text" class="form-control" id="f-cat" value="${f.categoria}" /></div>
    </div>`,
    [
      { label: "Cancelar", cls: "btn-secondary", fn: closeModal },
      { label: "Salvar", cls: "btn-primary", fn: () => {
        const i = APP.data.fornecedores.findIndex(x => x.id === id);
        APP.data.fornecedores[i] = { ...f, nome: V("f-nome"), contato: V("f-contato"), cidade: V("f-cidade"), categoria: V("f-cat") };
        salvarDados(); closeModal(); renderCompras(); mostrarNotificacao("Fornecedor atualizado!", "success");
      }}
    ]
  );
}

function excluirFornecedor(id) {
  confirmar("Excluir este fornecedor?", () => {
    APP.data.fornecedores = APP.data.fornecedores.filter(f => f.id !== id);
    salvarDados(); renderCompras(); mostrarNotificacao("Fornecedor removido.", "info");
  });
}

// ============================================================
//  FINANCEIRO
// ============================================================
function renderFinanceiro() {
  const trans = APP.data.transacoes;
  const receitas  = trans.filter(t => t.tipo === "Receita").reduce((s, t) => s + t.valor, 0);
  const despesas  = trans.filter(t => t.tipo === "Despesa").reduce((s, t) => s + t.valor, 0);
  const aReceber  = APP.data.contasReceber.filter(c => c.status === "Pendente").reduce((s, c) => s + c.valor, 0);

  document.getElementById("fin-saldo").textContent     = formatBRL(receitas - despesas);
  document.getElementById("fin-receitas").textContent  = formatBRL(receitas);
  document.getElementById("fin-despesas").textContent  = formatBRL(despesas);
  document.getElementById("fin-a-receber").textContent = formatBRL(aReceber);

  const fluxo = document.getElementById("fluxo-body");
  fluxo.innerHTML = [...trans].slice(0, 15).map(t =>
    `<tr>
      <td>${t.data}</td>
      <td>${t.descricao}</td>
      <td><span class="badge ${t.tipo === 'Receita' ? 'badge-pago' : 'badge-cancelado'}">${t.tipo}</span></td>
      <td class="${t.tipo === 'Receita' ? 'text-success' : 'text-danger'} fw-bold">${t.tipo === 'Despesa' ? '-' : '+'}${formatBRL(t.valor)}</td>
      <td><span class="badge badge-${t.status === 'Pago' ? 'pago' : 'pendente'}">${t.status}</span></td>
    </tr>`
  ).join("") || `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:1rem">Nenhum lançamento.</td></tr>`;

  // Gráfico de gastos
  renderChartGastos(despesas);

  // Contas a pagar
  const cpBody = document.getElementById("contas-pagar-body");
  cpBody.innerHTML = APP.data.contasPagar.map(c =>
    `<tr>
      <td>${c.descricao}</td>
      <td>${c.vencimento}</td>
      <td class="fw-bold">${formatBRL(c.valor)}</td>
      <td><span class="badge badge-${c.status === 'Pago' ? 'pago' : 'pendente'}">${c.status}</span></td>
      <td>${c.status !== 'Pago' ? `<button class="btn btn-sm btn-success" onclick="pagarConta('pagar','${c.id}')">✔ Pagar</button>` : ''}</td>
    </tr>`
  ).join("") || `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:1rem">Nenhuma conta a pagar.</td></tr>`;

  // Contas a receber
  const crBody = document.getElementById("contas-receber-body");
  crBody.innerHTML = APP.data.contasReceber.map(c =>
    `<tr>
      <td>${c.descricao}</td>
      <td>${c.vencimento}</td>
      <td class="fw-bold">${formatBRL(c.valor)}</td>
      <td><span class="badge badge-${c.status === 'Recebido' ? 'pago' : 'pendente'}">${c.status}</span></td>
      <td>${c.status !== 'Recebido' ? `<button class="btn btn-sm btn-success" onclick="pagarConta('receber','${c.id}')">✔ Receber</button>` : ''}</td>
    </tr>`
  ).join("") || `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:1rem">Nenhuma conta a receber.</td></tr>`;
}

function renderChartGastos(totalDespesas) {
  const container = document.getElementById("chart-gastos");
  if (!container) return;
  const cats = {};
  APP.data.transacoes.filter(t => t.tipo === "Despesa").forEach(t => {
    const cat = t.descricao.includes("Compra") ? "Compras" :
                t.descricao.includes("Manutenção") ? "Manutenção" :
                t.descricao.includes("Energia") ? "Utilidades" : "Outros";
    cats[cat] = (cats[cat] || 0) + t.valor;
  });
  const max = Math.max(...Object.values(cats), 1);
  container.innerHTML = Object.entries(cats).map(([cat, val]) => {
    const pct = Math.max((val / max) * 100, 4);
    return `<div class="bar-col">
      <div class="bar" style="height:${pct}%;background:linear-gradient(180deg,#e53935,#b71c1c)" data-val="${formatBRL(val)}"></div>
      <span class="bar-label">${cat}</span>
    </div>`;
  }).join("") || `<p class="text-muted" style="padding:1rem">Sem despesas registradas.</p>`;
}

function openNovaTransacao() {
  openModal("Novo Lançamento Financeiro",
    `<div class="form-grid-2">
      <div class="form-group"><label>Descrição</label><input type="text" class="form-control" id="t-desc" /></div>
      <div class="form-group"><label>Tipo</label>
        <select class="form-control" id="t-tipo"><option>Receita</option><option>Despesa</option></select></div>
      <div class="form-group"><label>Valor (R$)</label><input type="number" class="form-control" id="t-val" step="0.01" min="0" /></div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="t-status"><option>Pago</option><option>Pendente</option></select></div>
    </div>`,
    [
      { label: "Cancelar", cls: "btn-secondary", fn: closeModal },
      { label: "Lançar", cls: "btn-primary", fn: () => {
        const desc = V("t-desc"), tipo = V("t-tipo"), val = +V("t-val"), status = V("t-status");
        if (!desc || !val) { mostrarNotificacao("Preencha todos os campos.", "error"); return; }
        APP.data.transacoes.unshift({ id: uid(), data: dataBR(new Date()), descricao: desc, tipo, valor: val, status });
        salvarDados(); closeModal(); renderFinanceiro(); renderDashboard();
        mostrarNotificacao("Lançamento registrado!", "success");
      }}
    ]
  );
}

function pagarConta(tipo, id) {
  if (tipo === "pagar") {
    const idx = APP.data.contasPagar.findIndex(c => c.id === id);
    if (idx !== -1) {
      APP.data.contasPagar[idx].status = "Pago";
      APP.data.transacoes.unshift({ id: uid(), data: dataBR(new Date()), descricao: APP.data.contasPagar[idx].descricao, tipo: "Despesa", valor: APP.data.contasPagar[idx].valor, status: "Pago" });
    }
  } else {
    const idx = APP.data.contasReceber.findIndex(c => c.id === id);
    if (idx !== -1) {
      APP.data.contasReceber[idx].status = "Recebido";
      APP.data.transacoes.unshift({ id: uid(), data: dataBR(new Date()), descricao: APP.data.contasReceber[idx].descricao, tipo: "Receita", valor: APP.data.contasReceber[idx].valor, status: "Pago" });
    }
  }
  salvarDados(); renderFinanceiro(); renderDashboard();
  mostrarNotificacao("Conta baixada com sucesso!", "success");
}

// ============================================================
//  PRODUÇÃO RURAL
// ============================================================
function renderProducao() {
  document.getElementById("prod-safras-ativas").textContent =
    APP.data.producao.filter(p => p.status === "Em andamento").length;
  document.getElementById("prod-lotes").textContent = new Set(APP.data.producao.map(p => p.lote)).size;
  document.getElementById("prod-insumos").textContent = APP.data.producao.length * 2; // simulated

  const tbody = document.getElementById("producao-body");
  tbody.innerHTML = APP.data.producao.map(p =>
    `<tr>
      <td class="fw-bold">${p.safra}</td>
      <td>${p.lote}</td>
      <td>${p.dataPlantio}</td>
      <td>${p.previsaoColheita}</td>
      <td>${p.qtdProduzida || "—"}</td>
      <td>${p.insumos}</td>
      <td><span class="badge badge-${p.status === 'Colhido' ? 'colhido' : 'ativo'}">${p.status}</span></td>
      <td>
        <button class="btn btn-icon" onclick="editarProducao('${p.id}')">✏️</button>
        <button class="btn btn-icon" onclick="excluirProducao('${p.id}')">🗑️</button>
      </td>
    </tr>`
  ).join("") || `<tr><td colspan="8" class="text-muted" style="text-align:center;padding:1.5rem">Nenhum registro de produção.</td></tr>`;
}

function openNovaSafra(id = null) {
  const p = id ? APP.data.producao.find(x => x.id === id) : null;
  openModal(p ? "Editar Registro de Produção" : "Nova Safra / Plantio",
    `<div class="form-grid-2">
      <div class="form-group"><label>Nome da Safra</label><input type="text" class="form-control" id="pr-safra" value="${p?.safra || ''}" /></div>
      <div class="form-group"><label>Lote / Talhão</label><input type="text" class="form-control" id="pr-lote" value="${p?.lote || ''}" /></div>
      <div class="form-group"><label>Data de Plantio</label><input type="date" class="form-control" id="pr-plantio" value="${isoDate(p?.dataPlantio)}" /></div>
      <div class="form-group"><label>Previsão de Colheita</label><input type="date" class="form-control" id="pr-colheita" value="${isoDate(p?.previsaoColheita)}" /></div>
      <div class="form-group"><label>Qtd. Produzida</label><input type="text" class="form-control" id="pr-qtd" value="${p?.qtdProduzida || ''}" placeholder="Ex: 1200 sc" /></div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="pr-status">
          <option ${p?.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
          <option ${p?.status === 'Colhido' ? 'selected' : ''}>Colhido</option>
          <option ${p?.status === 'Planejado' ? 'selected' : ''}>Planejado</option>
        </select></div>
      <div class="form-group" style="grid-column:span 2"><label>Insumos Utilizados</label>
        <input type="text" class="form-control" id="pr-insumos" value="${p?.insumos || ''}" placeholder="Ex: Ureia, Herbicida XP" /></div>
      <div class="form-group" style="grid-column:span 2"><label>Observações</label>
        <textarea class="form-control" id="pr-obs" rows="2">${p?.obs || ''}</textarea></div>
    </div>`,
    [
      { label: "Cancelar", cls: "btn-secondary", fn: closeModal },
      { label: p ? "Salvar" : "Registrar", cls: "btn-primary", fn: () => salvarProducao(id) }
    ]
  );
}

function editarProducao(id) { openNovaSafra(id); }

function salvarProducao(id) {
  const dados = {
    safra: V("pr-safra"), lote: V("pr-lote"),
    dataPlantio: dataBR(new Date(V("pr-plantio") + "T12:00:00")),
    previsaoColheita: dataBR(new Date(V("pr-colheita") + "T12:00:00")),
    qtdProduzida: V("pr-qtd"), status: V("pr-status"),
    insumos: V("pr-insumos"), obs: V("pr-obs"),
  };
  if (!dados.safra || !dados.lote) { mostrarNotificacao("Informe safra e lote.", "error"); return; }
  if (id) {
    const i = APP.data.producao.findIndex(x => x.id === id);
    APP.data.producao[i] = { ...APP.data.producao[i], ...dados };
  } else {
    APP.data.producao.push({ id: uid(), ...dados });
  }
  salvarDados(); closeModal(); renderProducao();
  mostrarNotificacao(id ? "Registro atualizado!" : "Safra registrada!", "success");
}

function excluirProducao(id) {
  confirmar("Excluir este registro de produção?", () => {
    APP.data.producao = APP.data.producao.filter(p => p.id !== id);
    salvarDados(); renderProducao(); mostrarNotificacao("Registro excluído.", "info");
  });
}

// ============================================================
//  RELATÓRIOS
// ============================================================
function gerarRelatorio(tipo) {
  const panel = document.getElementById("relatorio-result-panel");
  const title = document.getElementById("relatorio-title");
  const content = document.getElementById("relatorio-content");
  panel.style.display = "block";
  panel.scrollIntoView({ behavior: "smooth" });

  const TIPOS = { estoque: "Relatório de Estoque", financeiro: "Relatório Financeiro", vendas: "Relatório de Vendas", compras: "Relatório de Compras", producao: "Relatório de Produção" };
  title.textContent = `${TIPOS[tipo]} — ${new Date().toLocaleDateString("pt-BR")}`;

  let html = "";
  if (tipo === "estoque") {
    html = `<table class="table"><thead><tr><th>Código</th><th>Produto</th><th>Categoria</th><th>Qtd</th><th>Un</th><th>Valor Unit</th><th>Total</th><th>Status</th></tr></thead><tbody>` +
      APP.data.produtos.map(p => {
        const st = p.qtd <= 0 ? "empty" : p.qtd < p.qtdMin ? "low" : "ok";
        const stL = p.qtd <= 0 ? "Sem estoque" : p.qtd < p.qtdMin ? "Baixo" : "Normal";
        return `<tr><td>${p.codigo}</td><td>${p.nome}</td><td>${p.categoria}</td><td>${p.qtd}</td><td>${p.un}</td><td>${formatBRL(p.valor)}</td><td>${formatBRL(p.qtd * p.valor)}</td><td><span class="badge badge-${st}">${stL}</span></td></tr>`;
      }).join("") + "</tbody></table>";
  } else if (tipo === "financeiro") {
    html = `<table class="table"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Status</th></tr></thead><tbody>` +
      APP.data.transacoes.map(t =>
        `<tr><td>${t.data}</td><td>${t.descricao}</td><td><span class="badge ${t.tipo === 'Receita' ? 'badge-pago' : 'badge-cancelado'}">${t.tipo}</span></td><td class="${t.tipo === 'Receita' ? 'text-success' : 'text-danger'} fw-bold">${formatBRL(t.valor)}</td><td>${t.status}</td></tr>`
      ).join("") + "</tbody></table>";
  } else if (tipo === "vendas") {
    html = `<table class="table"><thead><tr><th>Data</th><th>Nº</th><th>Cliente</th><th>Pagamento</th><th>Total</th><th>Status</th></tr></thead><tbody>` +
      [...APP.data.vendas].reverse().map(v =>
        `<tr><td>${v.data}</td><td>#${v.num}</td><td>${v.cliente}</td><td>${v.pagamento}</td><td class="fw-bold">${formatBRL(v.total)}</td><td><span class="badge badge-${v.status === 'Pago' ? 'pago' : 'pendente'}">${v.status}</span></td></tr>`
      ).join("") + "</tbody></table>";
  } else if (tipo === "compras") {
    html = `<table class="table"><thead><tr><th>Data</th><th>Fornecedor</th><th>Produto</th><th>Qtd</th><th>Total</th><th>Status</th></tr></thead><tbody>` +
      [...APP.data.compras].reverse().map(c =>
        `<tr><td>${c.data}</td><td>${c.fornecedor}</td><td>${c.produto}</td><td>${c.qtd}</td><td class="fw-bold">${formatBRL(c.total)}</td><td>${c.status}</td></tr>`
      ).join("") + "</tbody></table>";
  } else if (tipo === "producao") {
    html = `<table class="table"><thead><tr><th>Safra</th><th>Lote</th><th>Plantio</th><th>Colheita</th><th>Produção</th><th>Status</th></tr></thead><tbody>` +
      APP.data.producao.map(p =>
        `<tr><td>${p.safra}</td><td>${p.lote}</td><td>${p.dataPlantio}</td><td>${p.previsaoColheita}</td><td>${p.qtdProduzida || "—"}</td><td>${p.status}</td></tr>`
      ).join("") + "</tbody></table>";
  }
  content.innerHTML = html;
}

function fecharRelatorio() {
  document.getElementById("relatorio-result-panel").style.display = "none";
}

function exportarRelatorio(formato) {
  mostrarNotificacao(`Exportação ${formato.toUpperCase()} simulada com sucesso!`, "info");
}

// ============================================================
//  SINCRONIZAÇÃO
// ============================================================
function renderSincronizacao() {
  const orb   = document.getElementById("sync-orb");
  const label = document.getElementById("sync-status-label");
  const desc  = document.getElementById("sync-status-desc");

  if (APP.isOnline) {
    orb.className   = "sync-orb online";
    label.textContent = "Online";
    desc.textContent  = "Conectado. Dados sincronizados automaticamente.";
  } else {
    orb.className   = "sync-orb";
    label.textContent = "Offline";
    desc.textContent  = "Sem conexão. Os dados estão sendo salvos localmente.";
  }

  const body = document.getElementById("sync-queue-body");
  body.innerHTML = APP.syncQueue.length
    ? APP.syncQueue.slice(-10).reverse().map(s =>
        `<tr>
          <td><span class="badge badge-ativo">${s.tipo}</span></td>
          <td>${s.desc}</td>
          <td>${s.data}</td>
          <td><span class="badge badge-${s.enviado ? 'pago' : 'pendente'}">${s.enviado ? "Enviado" : "Pendente"}</span></td>
        </tr>`
      ).join("")
    : `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:1rem">Nenhum dado pendente.</td></tr>`;
}

async function adicionarFilaSync(tipo, desc) {
  APP.syncQueue.push({ id: uid(), tipo, desc, data: dataBR(new Date()), enviado: false });
  if (APP.syncQueue.length > 50) APP.syncQueue = APP.syncQueue.slice(-50);
  try {
    const db = await getDB();
    await db.put(STORE_NAME, APP.syncQueue, "syncqueue");
  } catch(e) {
    localStorage.setItem("agrogestao_sync", JSON.stringify(APP.syncQueue));
  }
}

function sincronizarAgora() {
  if (!APP.isOnline) {
    mostrarNotificacao("Sem conexão. Tente quando estiver online.", "warning");
    return;
  }
  const orb   = document.getElementById("sync-orb");
  const label = document.getElementById("sync-status-label");
  const desc  = document.getElementById("sync-status-desc");
  if (orb) { orb.className = "sync-orb syncing"; label.textContent = "Sincronizando..."; }
  setConnStatus("syncing", "Sincronizando");

  const pendentes = APP.syncQueue.filter(s => !s.enviado).length;
  addSyncLog(`[${horaAgora()}] Iniciando sincronização — ${pendentes} item(ns) pendente(s)`);

  setTimeout(async () => {
    APP.syncQueue = APP.syncQueue.map(s => ({ ...s, enviado: true }));
    try {
      const db = await getDB();
      await db.put(STORE_NAME, APP.syncQueue, "syncqueue");
    } catch(e) {
      localStorage.setItem("agrogestao_sync", JSON.stringify(APP.syncQueue));
    }
    if (orb) { orb.className = "sync-orb online"; label.textContent = "Online"; desc.textContent = "Sincronização concluída."; }
    setConnStatus("online", "Online");
    addSyncLog(`[${horaAgora()}] ✅ Sincronização concluída com sucesso.`);
    mostrarNotificacao("Dados sincronizados com a nuvem!", "success");
    if (APP.currentSection === "sincronizacao") renderSincronizacao();
  }, 2200);
}

function tentarSincronizacao() {
  if (APP.isOnline && APP.syncQueue.some(s => !s.enviado)) {
    sincronizarAgora();
  }
}

function addSyncLog(msg) {
  const log = document.getElementById("sync-log");
  if (!log) return;
  const line = document.createElement("p");
  line.textContent = msg;
  log.insertBefore(line, log.firstChild);
}

function salvarConfigSync() {
  mostrarNotificacao("Configurações de sincronização salvas!", "success");
}

// ============================================================
//  CONFIGURAÇÕES
// ============================================================
function showConfigTab(tab) {
  document.querySelectorAll(".config-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".config-tab").forEach(b => b.classList.remove("active"));
  document.getElementById(`config-${tab}`).classList.add("active");
  event.target.classList.add("active");
}

function carregarConfigFazenda() {
  const c = APP.data.config;
  safeSet("conf-nome-fazenda", c.nomeFazenda);
  safeSet("conf-proprietario", c.proprietario);
  safeSet("conf-municipio",    c.municipio);
  safeSet("conf-area",         c.area);
  safeSet("conf-doc",          c.doc);
}

function aplicarConfigFazenda() {
  const c = APP.data.config;
  if (c.nomeFazenda) document.getElementById("farm-name-label").textContent = c.nomeFazenda;
  if (c.nomeUsuario) document.getElementById("user-name-label").textContent = c.nomeUsuario;
  if (c.tema) setTema(c.tema, false);
}

function salvarConfigFazenda() {
  APP.data.config.nomeFazenda  = V("conf-nome-fazenda");
  APP.data.config.proprietario = V("conf-proprietario");
  APP.data.config.municipio    = V("conf-municipio");
  APP.data.config.area         = V("conf-area");
  APP.data.config.doc          = V("conf-doc");
  salvarDados();
  aplicarConfigFazenda();
  mostrarNotificacao("Configurações da fazenda salvas!", "success");
}

function renderUsuarios() {
  const tbody = document.getElementById("usuarios-body");
  if (!tbody) return;
  tbody.innerHTML = APP.data.usuarios.map(u =>
    `<tr>
      <td class="fw-bold">${u.nome}</td>
      <td><code>${u.login}</code></td>
      <td>${u.perfil}</td>
      <td><span class="badge badge-${u.status === 'Ativo' ? 'pago' : 'pendente'}">${u.status}</span></td>
      <td>
        <button class="btn btn-icon" onclick="toggleUsuario('${u.id}')">🔁</button>
        <button class="btn btn-icon" onclick="excluirUsuario('${u.id}')">🗑️</button>
      </td>
    </tr>`
  ).join("");
}

function openNovoUsuario() {
  openModal("Novo Usuário",
    `<div class="form-grid-2">
      <div class="form-group"><label>Nome Completo</label><input type="text" class="form-control" id="u-nome" /></div>
      <div class="form-group"><label>Login</label><input type="text" class="form-control" id="u-login" /></div>
      <div class="form-group"><label>Senha</label><input type="password" class="form-control" id="u-senha" /></div>
      <div class="form-group"><label>Perfil</label>
        <select class="form-control" id="u-perfil">
          <option>Administrador</option><option>Operador</option><option>Visualizador</option>
        </select></div>
    </div>`,
    [
      { label: "Cancelar", cls: "btn-secondary", fn: closeModal },
      { label: "Criar Usuário", cls: "btn-primary", fn: () => {
        const nome = V("u-nome"), login = V("u-login"), senha = V("u-senha"), perfil = V("u-perfil");
        if (!nome || !login) { mostrarNotificacao("Preencha nome e login.", "error"); return; }
        if (!senha) { mostrarNotificacao("Informe uma senha.", "error"); return; }
        APP.data.usuarios.push({ id: uid(), nome, login, senha, perfil, status: "Ativo" });
        salvarDados(); closeModal(); renderUsuarios(); mostrarNotificacao("Usuário criado!", "success");
      }}
    ]
  );
}

function toggleUsuario(id) {
  const idx = APP.data.usuarios.findIndex(u => u.id === id);
  if (idx !== -1) {
    APP.data.usuarios[idx].status = APP.data.usuarios[idx].status === "Ativo" ? "Inativo" : "Ativo";
    salvarDados(); renderUsuarios(); mostrarNotificacao("Status atualizado.", "info");
  }
}

function excluirUsuario(id) {
  confirmar("Excluir este usuário?", () => {
    APP.data.usuarios = APP.data.usuarios.filter(u => u.id !== id);
    salvarDados(); renderUsuarios(); mostrarNotificacao("Usuário removido.", "info");
  });
}

function setTema(tema, salvar = true) {
  document.body.className = tema === "light" ? "" : tema;
  if (salvar) { APP.data.config.tema = tema; salvarDados(); mostrarNotificacao(`Tema "${tema}" aplicado!`, "info"); }
}

function exportarBackup() {
  const json = JSON.stringify(APP.data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `agrogestao-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  mostrarNotificacao("Backup exportado com sucesso!", "success");
}

function importarBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const dados = JSON.parse(e.target.result);
      confirmar("Isso substituirá todos os dados atuais. Continuar?", () => {
        APP.data = dados;
        salvarDados();
        mostrarNotificacao("Backup importado com sucesso! Recarregue a página.", "success");
        setTimeout(() => location.reload(), 2000);
      });
    } catch(err) {
      mostrarNotificacao("Arquivo inválido!", "error");
    }
  };
  reader.readAsText(file);
}

function limparDados() {
  confirmar("⚠️ ATENÇÃO: Isso apagará TODOS os dados do sistema. Essa ação não pode ser desfeita. Confirma?", async () => {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, "appdata");
      await db.delete(STORE_NAME, "syncqueue");
    } catch(e) {}
    localStorage.removeItem("agrogestao_data");
    localStorage.removeItem("agrogestao_sync");
    mostrarNotificacao("Dados apagados. Recarregando...", "warning");
    setTimeout(() => location.reload(), 1500);
  });
}

// ============================================================
//  MODAL
// ============================================================
function openModal(titulo, bodyHTML, botoes = []) {
  document.getElementById("modal-title").textContent = titulo;
  document.getElementById("modal-body").innerHTML = bodyHTML;
  const footer = document.getElementById("modal-footer");
  footer.innerHTML = botoes.map((b, i) =>
    `<button class="btn ${b.cls}" id="modal-btn-${i}">${b.label}</button>`
  ).join("");
  botoes.forEach((b, i) => {
    document.getElementById(`modal-btn-${i}`).addEventListener("click", b.fn);
  });
  document.getElementById("modal-overlay").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
}

// Fechar ao clicar fora
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal-overlay")) closeModal();
  });
});

// ============================================================
//  CONFIRMAÇÃO
// ============================================================
function confirmar(mensagem, callback) {
  openModal("Confirmação",
    `<p style="font-size:1rem;color:var(--text-main)">${mensagem}</p>`,
    [
      { label: "Cancelar", cls: "btn-secondary", fn: closeModal },
      { label: "Confirmar", cls: "btn-danger", fn: () => { closeModal(); callback(); } }
    ]
  );
}

// ============================================================
//  LOADING
// ============================================================
function showLoading() { document.getElementById("loading-overlay").classList.remove("hidden"); }
function hideLoading() { document.getElementById("loading-overlay").classList.add("hidden"); }

// ============================================================
//  NOTIFICAÇÕES
// ============================================================
function mostrarNotificacao(msg, tipo = "info") {
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  const el = document.createElement("div");
  el.className = `notification ${tipo}`;
  el.innerHTML = `<span>${icons[tipo] || "ℹ️"}</span><span>${msg}</span>`;
  document.getElementById("notification-container").appendChild(el);
  setTimeout(() => {
    el.style.animation = "slideOutRight 0.25s ease forwards";
    setTimeout(() => el.remove(), 250);
  }, 3500);
}

// ============================================================
//  UTILITÁRIOS
// ============================================================
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function dataBR(d) {
  if (!(d instanceof Date) || isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR");
}

function parseBR(str) {
  if (!str || str === "—") return new Date(0);
  const [d, m, y] = str.split("/");
  return new Date(+y, +m - 1, +d);
}

function isoDate(str) {
  if (!str || str === "—") return "";
  try {
    const [d, m, y] = str.split("/");
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  } catch(e) { return ""; }
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function formatBRL(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

function V(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function safeSet(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.value = val;
}

function autoCode() {
  return "PRD" + String(APP.data.produtos.length + 1).padStart(3, "0");
}

function horaAgora() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
