const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "financo_gastos_v1";
const nomesMetodo = { pix: "Pix", credito: "Crédito", debito: "Débito" };
let gastos = carregarGastos();
let editandoId = null;
let mesSelecionado = "";
const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function configurarOrdenacao() {
  if ($("ordenacao")) return;
  const select = document.createElement("select");
  select.id = "ordenacao";
  select.setAttribute("aria-label", "Ordenar gastos");
  select.innerHTML = `<option value="recentes">Mais recentes</option><option value="antigos">Mais antigos</option><option value="maior-valor">Maior valor</option><option value="menor-valor">Menor valor</option><option value="az">A → Z</option><option value="za">Z → A</option>`;
  $("filtro-periodo").after(select);
  select.oninput = renderizar;
}

function configurarListaGastos() {
  const secao = document.querySelector(".lista-section");
  if (!secao || $("btn-toggle-gastos")) return;
  const botao = document.createElement("button");
  botao.id = "btn-toggle-gastos";
  botao.className = "toggle-gastos";
  botao.type = "button";
  botao.setAttribute("aria-expanded", "false");
  botao.innerHTML = "Mostrar gastos <span>＋</span>";
  secao.querySelector(".section-heading").appendChild(botao);
  botao.onclick = () => {
    const aberto = secao.classList.toggle("gastos-abertos");
    botao.setAttribute("aria-expanded", String(aberto));
    botao.innerHTML = aberto ? "Ocultar gastos <span>−</span>" : "Mostrar gastos <span>＋</span>";
  };
}

function carregarGastos() {
  try {
    const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function salvarGastos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gastos));
}

function hoje() {
  return new Date().toLocaleDateString("en-CA");
}

function moeda(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(data) {
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR");
}

function mostrarToast(mensagem, erro = false) {
  const elemento = $("toast");
  elemento.textContent = mensagem;
  elemento.className = `toast show ${erro ? "error" : ""}`;
  setTimeout(() => { elemento.className = "toast"; }, 2800);
}

function pessoaTexto(pessoa) {
  return { ambos: "Ambos", todos: "Todos" }[pessoa] || pessoa || "Sem categoria";
}

function categoriaFrequencia(descricao) {
  const texto = String(descricao || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (texto.includes("lanche") || texto.includes("lanchonete")) return "Lanche";
  if (texto.includes("comunit")) return "Transporte comunitário";
  if (texto.includes("coletiv") || texto.includes("onibus") || texto.includes("metro") || texto.includes("trem")) return "Transporte coletivo";
  if (texto.includes("privad") || texto.includes("taxi") || texto.includes("uber") || texto.includes("99")) return "Transporte privado";
  return String(descricao || "").trim() || "Sem descrição";
}

function chaveMes(data) {
  return String(data || "").slice(0, 7);
}

function textoMes(chave) {
  if (!chave) return "";
  const [ano, mes] = chave.split("-");
  return `${nomesMeses[Number(mes) - 1]} de ${ano}`;
}

function configurarCardFrequentes() {
  if (document.getElementById("frequentes-wrapper")) return;
  const area = document.querySelector(".cards-resumo");
  if (!area) return;
  const wrapper = document.createElement("div");
  wrapper.id = "frequentes-wrapper";
  wrapper.className = "frequentes-wrapper";
  wrapper.innerHTML = `<button id="btn-toggle-frequentes" class="toggle-frequentes" type="button" aria-expanded="false">Mostrar mais frequentes <span>＋</span></button>`;
  const card = document.createElement("div");
  card.id = "frequentes-card-dinamico";
  card.className = "card frequentes-card";
  card.innerHTML = `<div class="frequentes-header"><span class="label">Mais frequentes</span><span class="card-hint">Top 3</span></div><div id="ranking-frequentes" class="frequentes-stack" aria-label="Ranking dos gastos mais frequentes"></div><span id="frequentes-vazio" class="ranking-vazio">Nenhum gasto registrado.</span><button id="btn-toggle-pessoas" class="toggle-pessoas" type="button" aria-expanded="false">Mostrar quem mais gastou <span>＋</span></button><div id="ranking-pessoas-wrapper" class="ranking-pessoas-wrapper"><div class="ranking-pessoas-titulo">Ranking por pessoa</div><div id="ranking-pessoas" class="frequentes-stack" aria-label="Ranking das pessoas que mais gastaram"></div><span id="pessoas-vazio" class="ranking-vazio">Nenhuma pessoa identificada.</span></div>`;
  wrapper.appendChild(card);
  area.after(wrapper);
  $("btn-toggle-frequentes").onclick = () => {
    const aberto = wrapper.classList.toggle("aberto");
    $("btn-toggle-frequentes").setAttribute("aria-expanded", String(aberto));
    $("btn-toggle-frequentes").innerHTML = aberto ? "Ocultar mais frequentes <span>−</span>" : "Mostrar mais frequentes <span>＋</span>";
  };
  $("btn-toggle-pessoas").onclick = () => {
    const aberto = card.classList.toggle("pessoas-abertas");
    $("btn-toggle-pessoas").setAttribute("aria-expanded", String(aberto));
    $("btn-toggle-pessoas").innerHTML = aberto ? "Ocultar ranking por pessoa <span>−</span>" : "Mostrar quem mais gastou <span>＋</span>";
  };
}

function pessoasDoGasto(pessoa) {
  if (!pessoa) return [];
  return [pessoa];
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[caractere]));
}

function renderizarFrequentes() {
  const lista = $("ranking-frequentes");
  if (!lista) return;
  const grupos = new Map();
  gastos
    .filter((gasto) => !mesSelecionado || chaveMes(gasto.data) === mesSelecionado)
    .forEach((gasto) => {
      const descricao = String(gasto.descricao || "").trim();
      if (!descricao) return;
      const nomeCategoria = categoriaFrequencia(descricao);
      const chave = nomeCategoria.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
      const atual = grupos.get(chave) || { nome: nomeCategoria, quantidade: 0, ultimaData: "" };
      atual.quantidade += 1;
      if (gasto.data > atual.ultimaData) atual.ultimaData = gasto.data;
      grupos.set(chave, atual);
    });
  const ranking = [...grupos.values()]
    .sort((a, b) => b.quantidade - a.quantidade || b.ultimaData.localeCompare(a.ultimaData) || a.nome.localeCompare(b.nome))
    .slice(0, 3);
  lista.innerHTML = "";
  $("frequentes-vazio").style.display = ranking.length ? "none" : "block";
  const medalhas = ["🥇", "🥈", "🥉"];
  ranking.forEach((gasto, indice) => {
    const item = document.createElement("div");
    item.className = `frequente-carta frequente-${indice + 1}`;
    item.innerHTML = `<span class="frequente-medal">${medalhas[indice]}</span><strong>${gasto.nome}</strong><span class="frequente-contagem">${gasto.quantidade} ${gasto.quantidade === 1 ? "vez" : "vezes"}</span>`;
    lista.appendChild(item);
  });
}

function renderizarRankingPessoas() {
  const lista = $("ranking-pessoas");
  if (!lista) return;
  const contagem = new Map();
  gastos
    .filter((gasto) => !mesSelecionado || chaveMes(gasto.data) === mesSelecionado)
    .forEach((gasto) => {
      pessoasDoGasto(gasto.pessoa).forEach((pessoa) => contagem.set(pessoa, (contagem.get(pessoa) || 0) + 1));
    });
  const ranking = [...contagem.entries()]
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome))
    .slice(0, 3);
  lista.innerHTML = "";
  $("pessoas-vazio").style.display = ranking.length ? "none" : "block";
  const medalhas = ["🥇", "🥈", "🥉"];
  ranking.forEach((pessoa, indice) => {
    const bloco = document.createElement("div");
    bloco.className = "pessoa-ranking-bloco";
    const item = document.createElement("div");
    item.className = `frequente-carta pessoa-ranking-carta frequente-${indice + 1}`;
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-expanded", "false");
    item.innerHTML = `<span class="frequente-medal">${medalhas[indice]}</span><strong>${escaparHTML(pessoaTexto(pessoa.nome))}</strong><span class="frequente-contagem">${pessoa.quantidade} ${pessoa.quantidade === 1 ? "vez" : "vezes"}</span>`;

    const gastosDaPessoa = gastos
      .filter((gasto) => (!mesSelecionado || chaveMes(gasto.data) === mesSelecionado) && pessoasDoGasto(gasto.pessoa).includes(pessoa.nome))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)));
    const detalhes = document.createElement("div");
    detalhes.className = "pessoa-gastos-detalhes";
    detalhes.innerHTML = gastosDaPessoa.map((gasto) => `<div class="pessoa-gasto-linha"><div><strong>${escaparHTML(gasto.descricao)}</strong><small>${escaparHTML(gasto.categoria || "Outros")} · ${escaparHTML(nomesMetodo[gasto.metodo] || gasto.metodo)} · ${dataBR(gasto.data)}</small></div><b>${moeda(gasto.valor)}</b></div>`).join("");

    const alternarDetalhes = () => {
      const aberto = bloco.classList.toggle("detalhes-abertos");
      item.setAttribute("aria-expanded", String(aberto));
    };
    item.onclick = alternarDetalhes;
    item.onkeydown = (evento) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        alternarDetalhes();
      }
    };
    bloco.append(item, detalhes);
    lista.appendChild(bloco);
  });
}

function totalDoMes(chave) {
  return gastos.filter((gasto) => chaveMes(gasto.data) === chave)
    .reduce((soma, gasto) => soma + Number(gasto.valor), 0);
}

function configurarCardMeses() {
  const card = $("card-total");
  const grid = $("meses-grid");
  const ano = new Date().getFullYear();
  grid.innerHTML = nomesMeses.map((nome, indice) => {
    const chave = `${ano}-${String(indice + 1).padStart(2, "0")}`;
    return `<button class="mes-btn" type="button" data-mes="${chave}">${nome.slice(0, 3)}</button>`;
  }).join("");

  const alternar = () => {
    const virado = card.classList.toggle("is-flipped");
    card.setAttribute("aria-pressed", String(virado));
  };
  card.addEventListener("click", (evento) => {
    if (evento.target.closest(".mes-btn, #btn-fechar-meses, #btn-ver-todos")) return;
    alternar();
  });
  card.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      alternar();
    }
  });
  $("btn-fechar-meses").onclick = () => {
    card.classList.remove("is-flipped");
    card.setAttribute("aria-pressed", "false");
  };
  $("btn-ver-todos").onclick = () => {
    mesSelecionado = "";
    card.classList.remove("is-flipped");
    card.setAttribute("aria-pressed", "false");
    renderizar();
  };
  grid.querySelectorAll(".mes-btn").forEach((botao) => {
    botao.onclick = () => {
      mesSelecionado = botao.dataset.mes;
      $("filtro-periodo").value = "";
      grid.querySelectorAll(".mes-btn").forEach((item) => item.classList.toggle("selecionado", item === botao));
      $("total-mes").textContent = moeda(totalDoMes(mesSelecionado));
      $("mes-selecionado").textContent = textoMes(mesSelecionado);
      renderizar();
    };
  });
}

function configurarCardPix() {
  const card = $("card-pix");
  const alternar = () => {
    const virado = card.classList.toggle("is-flipped");
    card.setAttribute("aria-pressed", String(virado));
  };
  card.addEventListener("click", alternar);
  card.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      alternar();
    }
  });
}

function renderizarRankingPix() {
  const ranking = gastos
    .filter((gasto) => gasto.metodo === "pix" && (!mesSelecionado || chaveMes(gasto.data) === mesSelecionado))
    .sort((a, b) => Number(b.valor) - Number(a.valor))
    .slice(0, 3);
  const lista = $("ranking-pix");
  lista.innerHTML = "";
  $("ranking-pix-vazio").style.display = ranking.length ? "none" : "block";
  $("ranking-pix-periodo").textContent = mesSelecionado ? textoMes(mesSelecionado) : "Todos os períodos";
  const medalhas = ["🥇", "🥈", "🥉"];
  ranking.forEach((gasto, indice) => {
    const item = document.createElement("li");
    item.className = "ranking-item";
    item.innerHTML = `<span class="ranking-medal">${medalhas[indice]}</span><span class="ranking-info"><strong>${gasto.descricao}</strong><small>${pessoaTexto(gasto.pessoa)} · ${dataBR(gasto.data)}</small></span><strong class="ranking-valor">${moeda(gasto.valor)}</strong>`;
    lista.appendChild(item);
  });
}

function gastoVisivel(gasto) {
  const busca = $("filtro-busca").value.toLowerCase();
  const metodo = $("filtro-metodo").value;
  const periodo = $("filtro-periodo").value;
  const agora = new Date();
  const data = new Date(`${gasto.data}T12:00:00`);
  const texto = `${gasto.descricao} ${gasto.categoria} ${pessoaTexto(gasto.pessoa)}`.toLowerCase();

  if (mesSelecionado && chaveMes(gasto.data) !== mesSelecionado) return false;
  if (busca && !texto.includes(busca)) return false;
  if (metodo && gasto.metodo !== metodo) return false;
  if (periodo === "mes" && (data.getMonth() !== agora.getMonth() || data.getFullYear() !== agora.getFullYear())) return false;
  if (periodo === "7dias" && (agora - data) > 7 * 24 * 60 * 60 * 1000) return false;
  return true;
}

function renderizar() {
  const visiveis = gastos.filter(gastoVisivel);
  const ordenacao = $("ordenacao")?.value || "recentes";
  visiveis.sort((a, b) => {
    if (ordenacao === "antigos") return String(a.data).localeCompare(String(b.data));
    if (ordenacao === "maior-valor") return Number(b.valor) - Number(a.valor);
    if (ordenacao === "menor-valor") return Number(a.valor) - Number(b.valor);
    if (ordenacao === "az") return String(a.descricao).localeCompare(String(b.descricao), "pt-BR");
    if (ordenacao === "za") return String(b.descricao).localeCompare(String(a.descricao), "pt-BR");
    return String(b.data).localeCompare(String(a.data));
  });
  const lista = $("lista-gastos");
  lista.innerHTML = "";
  $("mensagem-vazia").style.display = visiveis.length ? "none" : "block";
  $("contador").textContent = `${visiveis.length} ${visiveis.length === 1 ? "lançamento" : "lançamentos"}`;
  $("titulo-lista").textContent = mesSelecionado ? `Gastos de ${textoMes(mesSelecionado)}` : "Gastos registrados";
  if (mesSelecionado) {
    $("total-mes").textContent = moeda(totalDoMes(mesSelecionado));
    $("mes-selecionado").textContent = textoMes(mesSelecionado);
  }

  visiveis.forEach((gasto) => {
    const item = document.createElement("li");
    item.className = `item-gasto ${gasto.metodo}`;
    item.innerHTML = `
      <div class="item-info">
        <strong>${gasto.descricao}</strong>
        <span>${gasto.categoria || "Outros"} · ${nomesMetodo[gasto.metodo]} · ${dataBR(gasto.data)} · ${pessoaTexto(gasto.pessoa)}</span>
      </div>
      <div class="item-direita">
        <strong>${moeda(gasto.valor)}</strong>
        <div class="acoes">
          <button class="btn-editar" data-id="${gasto.id}" title="Editar">✎</button>
          <button class="btn-excluir" data-id="${gasto.id}" title="Excluir">×</button>
        </div>
      </div>`;
    lista.appendChild(item);
  });

  document.querySelectorAll(".btn-editar").forEach((botao) => {
    botao.onclick = () => iniciarEdicao(botao.dataset.id);
  });
  document.querySelectorAll(".btn-excluir").forEach((botao) => {
    botao.onclick = () => excluirGasto(botao.dataset.id);
  });

  const totalGeral = gastos.reduce((total, gasto) => total + Number(gasto.valor), 0);
  if (mesSelecionado) {
    $("total-label").textContent = textoMes(mesSelecionado);
    $("total-geral").textContent = moeda(totalDoMes(mesSelecionado));
    $("total-hint").textContent = "Mês selecionado · clique para trocar";
  } else {
    $("total-label").textContent = "Total geral";
    $("total-geral").textContent = moeda(totalGeral);
    $("total-hint").textContent = "Clique para ver os meses ↗";
  }
  ["pix", "credito", "debito"].forEach((metodo) => {
    const total = gastos.filter((gasto) => gasto.metodo === metodo)
      .reduce((soma, gasto) => soma + Number(gasto.valor), 0);
    $(`total-${metodo}`).textContent = moeda(total);
  });
  renderizarRankingPix();
  renderizarFrequentes();
  renderizarRankingPessoas();
}

function limparFormulario() {
  $("form-gasto").reset();
  $("data").value = hoje();
  const pix = document.querySelector('[name="metodo"][value="pix"]');
  if (pix) pix.checked = true;
  const pessoa = $("pessoa");
  if (pessoa) pessoa.value = "";
  editandoId = null;
  $("form-titulo").textContent = "Adicionar gasto";
  $("btn-submit").textContent = "Adicionar gasto";
  $("btn-cancelar").classList.add("hidden");
}

function iniciarEdicao(id) {
  const gasto = gastos.find((item) => String(item.id) === String(id));
  if (!gasto) return;
  editandoId = gasto.id;
  $("descricao").value = gasto.descricao || "";
  $("valor").value = gasto.valor || "";
  $("categoria").value = gasto.categoria || "";
  $("data").value = gasto.data || hoje();
  if ($("pessoa")) $("pessoa").value = gasto.pessoa || "";
  const metodo = document.querySelector(`[name="metodo"][value="${gasto.metodo}"]`);
  if (metodo) metodo.checked = true;
  $("form-titulo").textContent = "Editar gasto";
  $("btn-submit").textContent = "Salvar alterações";
  $("btn-cancelar").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function excluirGasto(id) {
  const gasto = gastos.find((item) => String(item.id) === String(id));
  if (!gasto || !confirm(`Excluir “${gasto.descricao}”?`)) return;
  gastos = gastos.filter((item) => item.id !== gasto.id);
  salvarGastos();
  renderizar();
  mostrarToast("Gasto excluído.");
}

$("form-gasto").onsubmit = (evento) => {
  evento.preventDefault();
  const dados = {
    descricao: $("descricao").value.trim(),
    valor: Number($("valor").value),
    categoria: $("categoria").value.trim() || "Outros",
    data: $("data").value,
    pessoa: $("pessoa")?.value || "",
    metodo: document.querySelector('[name="metodo"]:checked')?.value,
  };
  if (!dados.descricao || !dados.valor || dados.valor <= 0 || !dados.data) {
    mostrarToast("Preencha os campos corretamente.", true);
    return;
  }
  const eraEdicao = editandoId !== null;
  if (eraEdicao) {
    gastos = gastos.map((gasto) => gasto.id === editandoId ? { ...gasto, ...dados } : gasto);
  } else {
    gastos.unshift({ ...dados, id: Date.now() });
  }
  salvarGastos();
  limparFormulario();
  renderizar();
  mostrarToast(eraEdicao ? "Gasto atualizado." : "Gasto adicionado.");
};

$("btn-cancelar").onclick = limparFormulario;
["filtro-busca", "filtro-metodo"].forEach((id) => {
  $(id).oninput = renderizar;
});
$("filtro-periodo").oninput = () => {
  mesSelecionado = "";
  document.querySelectorAll(".mes-btn").forEach((botao) => botao.classList.remove("selecionado"));
  renderizar();
};

function baixarArquivo(nome, dados) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

$("btn-exportar").onclick = () => baixarArquivo(`backup-gastos-${hoje()}.json`, gastos);
$("btn-exportar-minhas").onclick = () => {
  baixarArquivo(`importar-minhas-financas-${hoje()}.json`, {
    formato: "gastos_app_v1",
    origem: "Controle de Gastos",
    exportado_em: new Date().toISOString(),
    gastos,
  });
  mostrarToast("Arquivo pronto para importar no Minhas Finanças.");
};

$("arquivo-importar").onchange = (evento) => {
  const arquivo = evento.target.files[0];
  evento.target.value = "";
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      const dados = JSON.parse(leitor.result);
      if (!Array.isArray(dados)) throw new Error();
      gastos = dados;
      salvarGastos();
      renderizar();
      mostrarToast("Backup importado.");
    } catch {
      mostrarToast("Arquivo de backup inválido.", true);
    }
  };
  leitor.readAsText(arquivo);
};

$("data").value = hoje();
configurarOrdenacao();
configurarListaGastos();
configurarCardMeses();
configurarCardPix();
configurarCardFrequentes();
configurarInstalacao();
renderizar();

function configurarInstalacao() {
  const botao = $("btn-instalar");
  if (!botao) return;
  let promptInstalacao = null;

  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    promptInstalacao = evento;
    botao.classList.remove("hidden");
  });

  botao.onclick = async () => {
    if (!promptInstalacao) return;
    promptInstalacao.prompt();
    const escolha = await promptInstalacao.userChoice;
    promptInstalacao = null;
    botao.classList.add("hidden");
    if (escolha.outcome === "accepted") mostrarToast("App instalado neste aparelho.");
  };

  window.addEventListener("appinstalled", () => {
    promptInstalacao = null;
    botao.classList.add("hidden");
  });

  if (location.protocol !== "file:" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}
