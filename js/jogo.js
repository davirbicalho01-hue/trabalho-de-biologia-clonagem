const el = (id) => document.getElementById(id);
const CHAVE = "estacao-ipe.caderno.v1";
const VERSAO = 1;
const ROTAS = Object.keys(missoes);
const movimentos = {
  KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right"
};
const novoSave = () => ({
  v: VERSAO, sala: "central", etapas: { estufa: 0, embrio: 0 }, precisao: 100,
  sensores: [], liberado: false, contido: false, final: false, ferramentas: []
});

function lerSave() {
  try {
    const valor = JSON.parse(localStorage.getItem(CHAVE));
    if (valor?.v !== VERSAO) return null;
    const save = novoSave();
    save.sala = Object.hasOwn(mapas, valor.sala) ? valor.sala : "central";
    for (const rota of ROTAS) {
      if (Number.isInteger(valor.etapas?.[rota])) {
        save.etapas[rota] = limitar(valor.etapas[rota], 0, missoes[rota].fases.length);
      }
    }
    if (Number.isFinite(valor.precisao)) save.precisao = limitar(valor.precisao, 0, 100);
    save.sensores = Array.isArray(valor.sensores) ? [...new Set(valor.sensores.filter((n) => [0, 1, 2].includes(n)))] : [];
    save.contido = valor.contido === true && save.sensores.length === 3;
    save.liberado = valor.liberado === true || save.contido || save.precisao <= 70;
    save.ferramentas = Array.isArray(valor.ferramentas) ?
      [...new Set(valor.ferramentas.filter((item) => Object.hasOwn(ferramenta, item)))] : [];
    save.final = valor.final === true && save.contido && ROTAS.every((id) => save.etapas[id] === missoes[id].fases.length);
    if (save.sala === "contencao" && !save.liberado && !ROTAS.every((id) => save.etapas[id] === missoes[id].fases.length)) save.sala = "central";
    return save;
  } catch {
    return null;
  }
}

class Jogo {
  constructor() {
    const anterior = lerSave();
    this.save = anterior || novoSave();
    this.somLigado = this.preferenciaSom();
    this.mundo = new Mundo(this, el("mundo"));
    this.janela = el("janela");
    this.corpo = el("janela-corpo");
    this.jogando = false;
    this.trocando = false;
    this.sincronizarSom();
    if (anterior) {
      el("jogar").firstChild.textContent = "Continuar expedição ";
      el("aviso-save").textContent = "● PROGRESSO ENCONTRADO NESTE NAVEGADOR";
    }
    this.eventos();
    this.pronto = this.mundo.carregar().then(() => true).catch(() => {
      el("aviso-save").textContent = "Um cenário não carregou. Confira se a pasta assets está junto do index.html.";
      el("jogar").disabled = true;
      return false;
    });
    let ultimo = performance.now();
    const quadro = (agora) => {
      const dt = Math.min((agora - ultimo) / 1000, 1 / 30);
      ultimo = agora;
      if (this.jogando) {
        if (this.emCampo()) this.mundo.atualizar(dt);
        this.mundo.desenhar();
      }
      requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  }

  eventos() {
    el("jogar").onclick = () => this.iniciar();
    el("ajuda-capa").onclick = () => this.instrucoes();
    el("menu").onclick = () => this.menu();
    el("inventario").onclick = () => this.inventario();
    el("interagir").onclick = () => this.interagir();
    el("som").onclick = () => {
      this.somLigado = !this.somLigado;
      this.sincronizarSom();
      try { localStorage.setItem(CHAVE + ".som", this.somLigado ? "1" : "0"); } catch {}
      this.som("passo");
    };
    document.addEventListener("keydown", (event) => {
      if (!this.jogando || this.janela.open || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code in movimentos) {
        event.preventDefault();
        if (this.emCampo()) this.mundo.teclas.add(movimentos[event.code]);
      } else if (event.code === "KeyE" && !event.repeat) {
        event.preventDefault();
        this.interagir();
      } else if (event.code === "Space" && !event.repeat && event.target.tagName !== "BUTTON") {
        event.preventDefault();
        this.mundo.esquivar();
      } else if (event.code === "Escape" && !this.trocando) {
        this.menu();
      }
    });
    document.addEventListener("keyup", (event) => {
      if (event.code in movimentos) this.mundo.teclas.delete(movimentos[event.code]);
    });
    window.addEventListener("blur", () => this.mundo.teclas.clear());
    for (const botao of document.querySelectorAll("[data-mover]")) {
      const acao = botao.dataset.mover;
      botao.onpointerdown = (event) => {
        if (!this.emCampo()) return;
        event.preventDefault();
        botao.setPointerCapture(event.pointerId);
        this.mundo.teclas.add(acao);
      };
      const parar = () => this.mundo.teclas.delete(acao);
      botao.onpointerup = parar;
      botao.onpointercancel = parar;
      botao.onlostpointercapture = parar;
    }
    el("toque-esquiva").onclick = () => this.mundo.esquivar();
    this.janela.addEventListener("close", () => {
      if (this.jogando) {
        if (document.activeElement?.tagName === "BUTTON") document.activeElement.blur();
        this.mundo.teclas.clear();
      }
    });
  }

  preferenciaSom() {
    try { return localStorage.getItem(CHAVE + ".som") !== "0"; } catch { return true; }
  }

  sincronizarSom() {
    el("som").setAttribute("aria-pressed", String(this.somLigado));
    el("som").textContent = this.somLigado ? "Som ligado" : "Som desligado";
  }

  som(tipo) {
    if (!this.somLigado || !window.AudioContext) return;
    try {
      this.audio ||= new AudioContext();
      const audio = this.audio;
      if (audio.state === "suspended") void audio.resume().catch(() => {});
      const notas = {
        passo: [523], erro: [330, 247], acerto: [523, 659, 784], esquiva: [260, 520],
        porta: [392, 523], fim: [392, 523, 659, 784, 1047]
      }[tipo];
      notas.forEach((frequencia, i) => {
        const t = audio.currentTime + i * .079;
        const onda = audio.createOscillator();
        const volume = audio.createGain();
        onda.type = tipo === "erro" ? "triangle" : "sine";
        onda.frequency.value = frequencia;
        volume.gain.setValueAtTime(.001, t);
        volume.gain.linearRampToValueAtTime(.07, t + .013);
        volume.gain.exponentialRampToValueAtTime(.001, t + .12);
        onda.connect(volume).connect(audio.destination);
        onda.start(t);
        onda.stop(t + .13);
      });
    } catch { /* A simulação continua se o navegador bloquear áudio. */ }
  }

  async iniciar() {
    if (this.jogando || !(await this.pronto)) return;
    this.jogando = true;
    el("capa").hidden = true;
    el("experiencia").hidden = false;
    el("jogar").blur();
    this.mundo.entrar(this.save.sala);
    this.atualizarPainel();
    this.gravar();
    this.som("porta");
  }

  emCampo() {
    return this.jogando && !this.trocando && !this.janela.open;
  }

  gravar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(this.save));
      el("autosave").textContent = "● Progresso salvo neste navegador";
    } catch {
      el("autosave").textContent = "O navegador bloqueou o salvamento local.";
    }
  }

  painel(etiqueta, titulo, html) {
    this.mundo.teclas.clear();
    this.corpo.innerHTML = `<div class="janela-topo"><p class="meta">${etiqueta}</p>
      <button class="fechar" type="button" aria-label="Fechar janela">×</button></div>
      <section class="miolo"><h2 id="janela-titulo" tabindex="-1">${titulo}</h2>${html}</section>`;
    this.corpo.querySelector(".fechar").onclick = () => this.fecharPainel();
    if (!this.janela.open) this.janela.showModal();
    el("janela-titulo").focus();
    return this.corpo.querySelector(".miolo");
  }

  fecharPainel() {
    this.janela.close();
  }

  instrucoes() {
    this.painel("Estação Ipê / instruções", "Seu primeiro dia na estação",
      `<p>Use <kbd>WASD</kbd> ou as <kbd>setas</kbd> para explorar. Aproxime-se de uma porta, de um pesquisador ou de uma bancada e pressione <kbd>E</kbd>.</p>
       <p>O diário indica a próxima estação de cada missão. Siga as fichas da bancada para escolher, transferir e ordenar as amostras.</p>
       <p>Erros reduzem a precisão. No corredor de contenção, use <kbd>Espaço</kbd> para esquivar dos drones e <kbd>E</kbd> para calibrar os sensores.</p>
       <aside class="nota">As duas missões são representações para aprender Biologia. O desafio com drones faz parte da história da Estação Ipê.</aside>`);
  }

  menu() {
    const painel = this.painel("Estação Ipê / pausa", "Expedição em pausa",
      `<p>O progresso é guardado depois de cada procedimento e troca de ambiente.</p>
       <div class="rodape-modal">
       <button class="botao principal" data-menu="retomar" type="button">Retomar</button>
       <button class="botao" data-menu="ajuda" type="button">Como jogar</button>
       <button class="botao" data-menu="reiniciar" type="button">Recomeçar expedição</button>
       </div>`);
    painel.querySelector('[data-menu="retomar"]').onclick = () => this.fecharPainel();
    painel.querySelector('[data-menu="ajuda"]').onclick = () => this.instrucoes();
    painel.querySelector('[data-menu="reiniciar"]').onclick = () => this.confirmarReinicio();
  }

  confirmarReinicio() {
    const painel = this.painel("Estação Ipê / novo registro", "Recomeçar do início?",
      `<p>As etapas, as ferramentas e a precisão desta expedição serão reiniciadas.</p>
       <div class="rodape-modal"><button id="confirmar-reinicio" class="botao principal" type="button">Recomeçar</button>
       <button id="cancelar-reinicio" class="botao" type="button">Voltar</button></div>`);
    painel.querySelector("#cancelar-reinicio").onclick = () => this.menu();
    painel.querySelector("#confirmar-reinicio").onclick = () => {
      this.save = novoSave();
      this.fecharPainel();
      this.mundo.entrar("central");
      this.atualizarPainel();
      this.gravar();
      this.avisar("Expedição reiniciada.");
    };
  }

  inventario() {
    const itens = this.save.ferramentas.map((id) => {
      const [nome, arte] = ferramenta[id];
      return `<div class="ficha">${imagemAmostra(arte)}<b>${nome}</b></div>`;
    }).join("");
    this.painel("Estação Ipê / inventário", "Estojo de campo",
      itens ? `<p>Materiais registrados nas bancadas. Use cada ferramenta na etapa indicada pelo diário.</p><div class="estojo-grid">${itens}</div>`
        : "<p>O estojo está vazio. Você vai receber ferramentas ao avançar nas missões.</p>");
  }

  mostrarInteracao(alvo) {
    const botao = el("interagir");
    botao.hidden = !alvo;
    botao.querySelector("span").textContent = alvo?.nome || "";
  }

  interagir() {
    if (!this.emCampo() || !this.mundo.alvo) return;
    const [acao, argumento] = this.mundo.alvo.acao.split(":");
    if (acao === "ir") this.viajar(argumento);
    if (acao === "fala") {
      const [nome, fala] = falas[argumento];
      this.painel("Equipe da estação", nome,
        `<div class="fala"><span class="retrato" style="background-image:url('assets/people/${argumento}.png')" aria-hidden="true"></span><p>${fala}</p></div>`);
      this.som("passo");
    }
    if (acao === "etapa") this.abrirEstacao(argumento);
    if (acao === "sensor") this.calibrar(Number(argumento));
    if (acao === "arquivo") this.arquivo();
  }

  async viajar(destino) {
    if (destino === "contencao" && !this.save.liberado && !this.completouRotas()) {
      this.avisar("Corredor em espera. Ele abre com um alerta de treino ou ao concluir as missões.");
      this.som("passo");
      return;
    }
    this.trocando = true;
    this.mundo.teclas.clear();
    el("interagir").hidden = true;
    el("escurecer").classList.add("ativo");
    this.som("porta");
    await new Promise((resolve) => setTimeout(resolve, 180));
    const origem = this.mundo.id;
    this.save.sala = destino;
    if (destino === "contencao") {
      this.save.liberado = true;
      this.adicionar("scanner");
    }
    this.mundo.entrar(destino, origem);
    this.gravar();
    this.atualizarPainel();
    el("escurecer").classList.remove("ativo");
    this.trocando = false;
    if (destino === "contencao" && !this.save.contido) {
      this.painel("Treino / cenário fictício", "Simulado de contenção",
        `<p>Três sensores precisam ser recalibrados. Aproxime-se de cada console e pressione <kbd>E</kbd> para usar o scanner.</p>
         <p>Use <kbd>Espaço</kbd> para esquivar dos drones. Se um drone encostar em você, a estação volta a colocá-lo na entrada e mantém os sensores já calibrados.</p>
         <p>Com os três sensores calibrados, o scanner libera uma comparação de marcadores de DNA nuclear.</p>`);
    }
  }

  avisar(mensagem) {
    const sinal = el("sinal");
    sinal.textContent = mensagem;
    sinal.hidden = false;
    clearTimeout(this.retirarSinal);
    this.retirarSinal = setTimeout(() => { sinal.hidden = true; }, 4400);
  }

  abrirEstacao(estacao) {
    const rota = this.mundo.id;
    const fase = missoes[rota].fases[this.save.etapas[rota]];
    if (!fase) {
      this.resultadoRota(rota);
    } else if (fase.estacao !== estacao) {
      this.avisar(`Próximo procedimento: ${fase.titulo}, em ${this.nomeEstacao(fase.estacao)}.`);
      this.som("passo");
    } else {
      new Bancada(this, rota, estacao).abrir();
      this.som("passo");
    }
  }

  nomeEstacao(estacao) {
    return this.mundo.interacoes.find((alvo) => alvo.acao === `etapa:${estacao}`)?.nome || "sua bancada";
  }

  erroDeProcedimento() {
    this.save.precisao = Math.max(0, this.save.precisao - 10);
    const alerta = this.save.precisao <= 70 && !this.save.liberado;
    if (alerta) this.save.liberado = true;
    this.gravar();
    this.atualizarPainel();
    this.som("erro");
    return alerta;
  }

  adicionar(id) {
    if (!this.save.ferramentas.includes(id)) this.save.ferramentas.push(id);
  }

  registrar(rota, fase) {
    this.save.etapas[rota]++;
    if (fase.ganho) this.adicionar(fase.ganho);
    if (fase.usar) this.save.ferramentas = this.save.ferramentas.filter((item) => item !== fase.usar);
    if (this.completouRotas()) this.save.liberado = true;
    const { x, y } = this.mundo.jogador;
    this.mundo.efeito(x, y - 9, "#f6d57c");
    this.gravar();
    this.atualizarPainel();
    this.som("acerto");
  }

  calibrar(indice) {
    if (this.save.sensores.length === 3 && !this.save.contido) {
      this.compararMarcadores();
      return;
    }
    if (this.save.sensores.includes(indice)) {
      this.avisar("Este sensor já foi calibrado.");
      return;
    }
    this.save.sensores.push(indice);
    const { x, y } = this.mundo.jogador;
    this.mundo.efeito(x, y - 12, "#a9d89a");
    this.gravar();
    this.atualizarPainel();
    this.avisar(`Sensor calibrado. ${this.save.sensores.length}/3 em operação.`);
    this.som("acerto");
    if (this.save.sensores.length === 3) this.compararMarcadores();
  }

  compararMarcadores() {
    const padroes = [[1, 3, 4, 7], [2, 3, 5, 6], [1, 3, 5, 7]];
    const faixas = (padrao) => `<span class="faixas" role="img" aria-label="Faixas nas posições ${padrao.join(", ")}">
      ${Array.from({ length: 7 }, (_, i) => `<i class="${padrao.includes(i + 1) ? "marcada" : ""}"></i>`).join("")}</span>`;
    const painel = this.painel("Scanner de campo / simulação", "Compare as amostras de DNA",
      `<p>O scanner encontrou três amostras. Qual tem o mesmo padrão de faixas da referência?</p>
       <div class="faixa-referencia"><b>REFERÊNCIA</b>${faixas(padroes[2])}</div>
       <div class="cartoes">${padroes.map((padrao, i) =>
        `<button class="cartao" type="button" data-marcador="${i}">${faixas(padrao)}Amostra ${i + 1}</button>`).join("")}</div>
       <aside class="nota"><b>O QUE ACONTECE NA BIOLOGIA</b>As faixas representam marcadores de DNA nuclear. Comparar as posições ajuda a identificar a origem de uma amostra. O padrão deste jogo é simplificado.</aside>
       <p class="retorno" role="status"></p>`);
    for (const botao of painel.querySelectorAll("[data-marcador]")) {
      botao.onclick = () => {
        if (Number(botao.dataset.marcador) !== 2) {
          this.erroDeProcedimento();
          painel.querySelector(".retorno").textContent = "Confira a posição de cada faixa. Todas precisam coincidir.";
          return;
        }
        this.save.contido = true;
        this.gravar();
        this.atualizarPainel();
        this.fecharPainel();
        this.avisar("Padrão confirmado. Volte ao laboratório central.");
        this.som("fim");
      };
    }
  }

  completouRotas() {
    return ROTAS.every((rota) => this.save.etapas[rota] === missoes[rota].fases.length);
  }

  resultadoRota(rota) {
    const missao = missoes[rota];
    this.painel(`${missao.nome} / missão concluída`, missao.epilogo,
      `<div class="ficha">${imagemAmostra(missao.resultado)}<p>${missao.resumo}</p></div>
       <p>Volte pela porta para o laboratório central. O seu registro ficou no diário.</p>`);
    this.som("acerto");
  }

  arquivo() {
    if (!this.completouRotas() || !this.save.contido) {
      this.painel("Estação Ipê / arquivo de campo", "Registros da expedição",
        `<p>${this.completouRotas()
          ? "As duas missões estão registradas. Complete a contenção antes de fechar o caderno."
          : "Complete as duas missões. O arquivo reúne os resultados da estufa e do laboratório."}</p>`);
      return;
    }
    const resultados = ROTAS.map((rota) => {
      const m = missoes[rota];
      return `<article class="ficha">${imagemAmostra(m.resultado)}<h3>${m.epilogo}</h3><p>${m.resumo}</p></article>`;
    }).join("");
    this.save.final = true;
    this.gravar();
    this.atualizarPainel();
    const p = this.mundo.jogador;
    this.mundo.efeito(p.x, p.y, "#f5cb79", 36);
    const painel = this.painel("Estação Ipê / expedição concluída", "Caderno de Clones completo!",
      `<p class="carimbo">✦ &nbsp; ARQUIVO DE CAMPO COMPLETO</p>
       <p>Dois clones registrados e padrão de DNA confirmado. Precisão final <b>${this.save.precisao}%</b>.</p>
       <div class="resultados">${resultados}</div>
       <div class="rodape-modal"><button class="botao principal" id="refazer" type="button">Jogar novamente</button></div>`);
    painel.querySelector("#refazer").onclick = () => this.confirmarReinicio();
    this.som("fim");
  }

  alvoDaMissao() {
    const id = this.mundo.id;
    if (id === "central") {
      if (this.completouRotas()) return this.save.contido ? "arquivo" : "ir:contencao";
      if (this.save.liberado && !this.save.contido) return "ir:contencao";
      return "ir:" + ROTAS.find((rota) => this.save.etapas[rota] < missoes[rota].fases.length);
    }
    if (id === "contencao") {
      const sensor = [0, 1, 2].find((indice) => !this.save.sensores.includes(indice));
      return sensor === undefined ? (this.save.contido ? "ir:central" : "sensor:1") : `sensor:${sensor}`;
    }
    const fase = missoes[id].fases[this.save.etapas[id]];
    return fase ? `etapa:${fase.estacao}` : "ir:central";
  }

  atualizarPainel() {
    const id = this.mundo.id;
    const mapa = mapas[id];
    el("setor").textContent = `${mapa.numero} / ${mapa.nome}`;
    let objetivo, orientacao;
    if (id === "central") {
      if (this.save.final) {
        [objetivo, orientacao] = ["Expedição concluída", "Consulte o arquivo de campo ou recomece pelo menu."];
      } else if (this.completouRotas() && this.save.contido) {
        [objetivo, orientacao] = ["Feche o caderno", "Interaja com o arquivo de campo no centro do laboratório."];
      } else if (this.save.liberado && !this.save.contido) {
        [objetivo, orientacao] = ["Calibre os sensores", "A porta central dá acesso ao corredor de contenção."];
      } else {
        [objetivo, orientacao] = ["Explore a estação", "A estufa (V) fica à esquerda. A embriologia (A), à direita. A Dra. Íris pode ajudar."];
      }
    } else if (id === "contencao") {
      if (this.save.contido) [objetivo, orientacao] = ["Contenção concluída", "Volte pela porta do fundo."];
      else if (this.save.sensores.length === 3) [objetivo, orientacao] = ["Confirme o DNA", "Use um console para comparar as faixas do DNA nuclear."];
      else [objetivo, orientacao] = [`Sensores ${this.save.sensores.length}/3`, "Use o scanner com E nos consoles. Desvie dos drones com Espaço."];
    } else {
      const fase = missoes[id].fases[this.save.etapas[id]];
      [objetivo, orientacao] = fase ? [fase.titulo, `Procure “${this.nomeEstacao(fase.estacao)}” e pressione E.`]
        : ["Missão concluída", "Volte pela porta do fundo para o laboratório central."];
      if (fase && this.save.liberado && !this.save.contido) orientacao += " O corredor de treino também está aberto.";
    }
    el("objetivo").textContent = objetivo;
    el("orientacao").textContent = orientacao;
    el("progresso-rotas").innerHTML = ROTAS.map((rota) => {
      const { nome, fases } = missoes[rota];
      const feitas = this.save.etapas[rota];
      const barra = fases.map((_, i) => `<span class="${i < feitas ? "feita" : ""}"></span>`).join("");
      return `<div class="linha-rota"><div><b>${nome}</b><output>${feitas}/${fases.length}</output></div>
        <div class="barra-fases" aria-hidden="true">${barra}</div></div>`;
    }).join("");
    el("precisao").value = this.save.precisao;
    el("precisao").parentElement.dataset.alerta = String(this.save.precisao <= 70);
    el("valor-precisao").textContent = `${this.save.precisao}%`;
    el("num-itens").textContent = this.save.ferramentas.length;
  }
}

const jogo = new Jogo();
