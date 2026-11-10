function imagemAmostra(sprite) {
  return `<img src="assets/specimens/${sprite}.png" width="80" height="64" alt="">`;
}

function cartaoAmostra(item, atributos = "", rotulo = "") {
  return `<button type="button" class="cartao" ${atributos}>${rotulo}${imagemAmostra(item.sprite)}<span>${item.nome}</span></button>`;
}

class Bancada {
  constructor(jogo, rota, estacao) {
    this.jogo = jogo;
    this.rota = rota;
    this.estacao = estacao;
    this.missao = missoes[rota];
    this.indice = jogo.save.etapas[rota];
    this.fase = this.missao.fases[this.indice];
    this.sequencia = [];
    this.origemAtiva = false;
    this.concluida = false;
  }

  abrir() {
    const f = this.fase;
    const secao = this.jogo.painel(
      `${this.missao.nome} / ${String(this.indice + 1).padStart(2, "0")} de ${String(this.missao.fases.length).padStart(2, "0")}`,
      f.titulo,
      `<p>${f.tarefa}</p>
       <div id="procedimento">${this.conteudo()}</div>
       <aside class="nota"><b>O QUE ACONTECE NA BIOLOGIA</b>${f.nota}</aside>
       <p id="retorno-bancada" class="retorno" role="status"></p>
       <div id="continuacao" class="rodape-modal" hidden>
         <button class="botao principal" type="button" id="avancar">Continuar →</button>
       </div>`
    );
    this.area = secao.querySelector("#procedimento");
    this.retorno = secao.querySelector("#retorno-bancada");
    this.continuacao = secao.querySelector("#continuacao");
    this.avancar = secao.querySelector("#avancar");
    this.avancar.onclick = () => {
      const proxima = this.missao.fases[this.jogo.save.etapas[this.rota]];
      if (proxima?.estacao === this.estacao) {
        new Bancada(this.jogo, this.rota, this.estacao).abrir();
      } else if (!proxima) {
        this.jogo.resultadoRota(this.rota);
      } else {
        this.jogo.fecharPainel();
      }
    };
    this.area.addEventListener("click", (event) => this.clique(event));
    if (f.tipo === "transferencia") this.ativarArraste();
  }

  conteudo() {
    const f = this.fase;
    if (f.tipo === "ponto") {
      return `<div class="diagrama">${imagemAmostra(f.diagrama)}${f.pontos.map(([x, y, nome], i) =>
        `<button type="button" class="ponto" data-ponto="${i}" style="left:${x}%;top:${y}%" title="${nome}" aria-label="${nome}">${i + 1}</button>`
      ).join("")}</div>`;
    }
    if (f.tipo === "ajuste") {
      return `<div class="ajustes">${f.itens.map(({ nome, opcoes }, i) =>
        `<fieldset><legend>${nome}</legend>${opcoes.map((opcao, j) =>
          `<label><input type="radio" name="ajuste-${i}" value="${j}">${opcao}</label>`
        ).join("")}</fieldset>`
      ).join("")}<button type="button" class="botao" data-ajuste>Aplicar condições</button></div>`;
    }
    const itens = f.itens.map((item, i) => cartaoAmostra(item, `data-item="${i}"`)).join("");
    if (f.tipo === "transferencia") {
      const origem = cartaoAmostra(f.origem, 'data-origem draggable="true" aria-pressed="false"',
        '<small class="arraste-label">ARRASTE OU SELECIONE</small>').replace('class="cartao"', 'class="cartao origem"');
      return origem + `<div class="destinos">${itens}</div>`;
    }
    return `<div class="cartoes">${itens}</div>`;
  }

  clique(event) {
    if (this.concluida) return;
    const botao = event.target.closest("button");
    if (!botao) return;
    if ("origem" in botao.dataset) {
      this.marcarOrigem(!this.origemAtiva);
    } else if ("item" in botao.dataset) {
      this.tentarItem(Number(botao.dataset.item), botao);
    } else if ("ponto" in botao.dataset) {
      if (Number(botao.dataset.ponto) === this.fase.resposta) this.acertou();
      else this.errou(this.fase.erro);
    } else if ("ajuste" in botao.dataset) {
      this.verificarAjustes();
    }
  }

  verificarAjustes() {
    const selecionados = [...this.area.querySelectorAll("input:checked")];
    if (selecionados.length !== this.fase.resposta.length) {
      this.retorno.textContent = "Escolha um valor para cada condição.";
    } else if (selecionados.every((campo, i) => Number(campo.value) === this.fase.resposta[i])) {
      this.acertou();
    } else {
      this.errou(this.fase.erro);
    }
  }

  ativarArraste() {
    const origem = this.area.querySelector("[data-origem]");
    origem.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", this.fase.origem.nome);
      event.dataTransfer.effectAllowed = "move";
      this.marcarOrigem(true);
    });
    for (const destino of this.area.querySelectorAll("[data-item]")) {
      destino.addEventListener("dragover", (event) => {
        if (this.origemAtiva && !this.concluida) event.preventDefault();
      });
      destino.addEventListener("drop", (event) => {
        event.preventDefault();
        if (this.origemAtiva && !this.concluida) this.tentarItem(Number(destino.dataset.item), destino);
      });
    }
  }

  marcarOrigem(ativa) {
    this.origemAtiva = ativa;
    this.area.querySelector("[data-origem]").setAttribute("aria-pressed", String(ativa));
    this.area.querySelectorAll("[data-item]").forEach((el) => el.classList.toggle("ativo", ativa));
    if (ativa) this.retorno.textContent = "Agora escolha o destino.";
  }

  tentarItem(i, botao) {
    const f = this.fase;
    if (f.tipo === "transferencia" && !this.origemAtiva) {
      this.retorno.textContent = "Selecione primeiro o cartão de origem.";
      return;
    }
    if (f.tipo === "ordem") {
      if (this.sequencia.includes(i)) return;
      const passo = this.sequencia.length;
      if (i !== f.resposta[passo]) {
        this.errou(f.pistas[passo]);
        return;
      }
      this.sequencia.push(i);
      botao.setAttribute("aria-disabled", "true");
      botao.insertAdjacentHTML("afterbegin", `<b class="ordem">${passo + 1}º</b>`);
      if (this.sequencia.length < f.resposta.length) {
        this.retorno.textContent = "Registrado. Qual vem depois?";
        this.jogo.som("passo");
        return;
      }
    } else if (i !== f.resposta) {
      this.errou(f.itens[i].pista);
      return;
    }
    this.acertou();
  }

  errou(pista) {
    const alerta = this.jogo.erroDeProcedimento();
    this.retorno.textContent = (pista || "Revise a ficha e tente de novo.") +
      (alerta ? " Alerta de treino: o corredor de contenção foi liberado." : "");
  }

  acertou() {
    this.concluida = true;
    this.jogo.registrar(this.rota, this.fase);
    this.area.querySelectorAll("button, input").forEach((el) => { el.disabled = true; });
    this.retorno.textContent = this.fase.retorno || "Procedimento registrado no caderno.";
    this.retorno.classList.add("acerto");
    this.continuacao.hidden = false;
    this.avancar.focus();
  }
}
