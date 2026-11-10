const limitar = (valor, min, max) => Math.max(min, Math.min(max, valor));
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

class Mundo {
  constructor(jogo, canvas) {
    this.jogo = jogo;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.texturas = new Map();
    this.teclas = new Set();
    this.camera = { x: 0, y: 0 };
    this.jogador = { x: 0, y: 0, direcao: 3, passo: 0, dash: 0, folego: 0, invulneravel: 0 };
    this.tempo = 0;
    this.faiscas = [];
    this.alvo = null;
  }

  async carregar() {
    const arquivos = [
      ...Object.keys(mapas).map((id) => ["rooms", id]),
      ...Object.keys(objetos).map((id) => ["rooms", id]), ["rooms", "drone"],
      ...["protagonista", "iris", "lia", "teo"].map((id) => ["people", id])
    ];
    await Promise.all(arquivos.map(async ([pasta, id]) => {
      const imagem = new Image();
      imagem.src = `assets/${pasta}/${id}.png`;
      await imagem.decode();
      this.texturas.set(id, imagem);
    }));
  }

  entrar(id, anterior) {
    this.id = id;
    this.mapa = mapas[id];
    this.objetos = this.mapa.objetos.map((item) => {
      const [w, h] = objetos[item.arte];
      return { ...item, w, h, ponto: { x: item.x + w / 2, y: item.y + h - 2 } };
    });
    this.interacoes = [
      ...this.objetos.filter((item) => item.acao),
      ...this.mapa.npcs.map((npc) => ({ ...npc, ponto: npc }))
    ];
    const retorno = { estufa: [123, 97], embrio: [485, 97], contencao: [304, 98] };
    const [x, y] = id === "central" && retorno[anterior] ? retorno[anterior] : this.mapa.entrada;
    Object.assign(this.jogador, { x, y, direcao: id === "central" && anterior ? 0 : 3, passo: 0, dash: 0, folego: 0, invulneravel: 0 });
    this.teclas.clear();
    this.faiscas = [];
    this.tempo = 0;
    this.alvo = null;
    this.jogo.mostrarInteracao(null);
    this.ajustarCamera(1);
  }

  ajustarCamera(velocidade) {
    const x = limitar(this.jogador.x - this.canvas.width / 2, 0, 608 - this.canvas.width);
    const y = limitar(this.jogador.y - this.canvas.height / 2, 0, 352 - this.canvas.height);
    this.camera.x += (x - this.camera.x) * velocidade;
    this.camera.y += (y - this.camera.y) * velocidade;
  }

  vetores() {
    const x = Number(this.teclas.has("right")) - Number(this.teclas.has("left"));
    const y = Number(this.teclas.has("down")) - Number(this.teclas.has("up"));
    const norma = Math.hypot(x, y) || 1;
    return [x / norma, y / norma];
  }

  esquivar() {
    if (!this.jogo.emCampo() || this.jogador.folego > 0) return;
    const p = this.jogador;
    const [x, y] = this.vetores();
    const [fx, fy] = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.direcao];
    p.vx = x || y ? x : fx;
    p.vy = x || y ? y : fy;
    p.dash = .15;
    p.folego = .72;
    this.efeito(p.x, p.y, "#eed292", 6);
    this.jogo.som("esquiva");
  }

  livre(x, y) {
    if (x < 24 || x > 584 || y < 79 || y > 327) return false;
    return !this.objetos.some((item) => item.solido &&
      x + 5 > item.x + 3 && x - 5 < item.x + item.w - 3 &&
      y + 3 > item.y + item.h * .48 && y - 3 < item.y + item.h - 4);
  }

  atualizar(dt) {
    this.tempo += dt;
    const p = this.jogador;
    p.folego = Math.max(0, p.folego - dt);
    p.invulneravel = Math.max(0, p.invulneravel - dt);
    let [dx, dy] = this.vetores();
    const esquivando = p.dash > 0;
    if (esquivando) {
      p.dash = Math.max(0, p.dash - dt);
      dx = p.vx;
      dy = p.vy;
    }
    if (dx || dy) {
      const velocidade = (esquivando ? 254 : 112) * dt;
      const x = p.x + dx * velocidade;
      const y = p.y + dy * velocidade;
      const andando = (dx && this.livre(x, p.y)) || (dy && this.livre(p.x, y));
      if (this.livre(x, p.y)) p.x = x;
      if (this.livre(p.x, y)) p.y = y;
      p.direcao = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      p.passo = andando ? p.passo + dt : 0;
    } else {
      p.passo = 0;
    }
    if (this.emDesafio() && !esquivando && !p.invulneravel &&
        this.drones().some((drone) => distancia(p, drone) < 17)) {
      const [x, y] = this.mapa.entrada;
      this.efeito(p.x, p.y, "#f5b08e", 16);
      Object.assign(p, { x, y, invulneravel: 1.5 });
      this.jogo.avisar("Drone no caminho. Use Espaço para passar. Sensores calibrados foram mantidos.");
      this.jogo.som("erro");
    }
    this.ajustarCamera(Math.min(1, dt * 10));
    let alvo = null;
    let menor = 35;
    for (const item of this.interacoes) {
      const d = distancia(p, item.ponto);
      if (d < menor) {
        alvo = item;
        menor = d;
      }
    }
    if (alvo !== this.alvo) {
      this.alvo = alvo;
      this.jogo.mostrarInteracao(alvo);
    }
    for (const part of this.faiscas) {
      part.vida -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
    }
    this.faiscas = this.faiscas.filter((part) => part.vida > 0);
  }

  emDesafio() {
    return this.id === "contencao" && this.jogo.save.sensores.length < 3;
  }

  drones() {
    if (!this.emDesafio()) return [];
    const t = this.tempo;
    return [
      { x: 304 + Math.sin(t * 1.3) * 216, y: 164 + Math.sin(t * 2.2) * 10 },
      { x: 304 + Math.sin(t * 1.06 + 1.8) * 242, y: 247 + Math.cos(t * 2.1) * 16 },
      { x: 395 + Math.cos(t * 1.51 + 1.3) * 148, y: 99 + Math.sin(t * 1.8) * 13 }
    ];
  }

  efeito(x, y, cor, total = 16) {
    for (let i = 0; i < total; i++) {
      const a = i * Math.PI * 2 / total;
      const v = 24 + Math.random() * 35;
      this.faiscas.push({ x, y, cor, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: .35 + Math.random() * .35 });
    }
  }

  personagem(arte, x, y, direcao, passo) {
    const quadro = passo > 0 ? [1, 2, 3, 2][Math.floor(passo * 9) % 4] : 0;
    this.ctx.drawImage(this.texturas.get(arte), quadro * 24, direcao * 24, 24, 24,
      Math.round(x - 12), Math.round(y - 21), 24, 24);
  }

  desenhar() {
    const g = this.ctx;
    const p = this.jogador;
    g.save();
    g.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
    g.drawImage(this.texturas.get(this.id), 0, 0);
    // Faixas de luz e pequenas partículas dão movimento aos ambientes.
    for (let i = 0; i < 17; i++) {
      g.fillStyle = i % 2 ? "#f8e9ab40" : "#c5ecbb60";
      g.fillRect(29 + (i * 59 + Math.floor(this.tempo * 6)) % 541,
        86 + (i * 67 + Math.floor(this.tempo * 3)) % 225, 1, 1);
    }
    const atores = [
      ...this.objetos.map((item) => ({
        y: item.y + item.h - 4,
        desenhar: () => g.drawImage(this.texturas.get(item.arte), item.x, item.y)
      })),
      ...this.mapa.npcs.map((npc) => ({
        y: npc.y, desenhar: () => this.personagem(npc.arte, npc.x, npc.y, 0, 0)
      })),
      ...this.drones().map((drone) => ({
        y: drone.y,
        desenhar: () => {
          g.fillStyle = "#df918052";
          g.beginPath();
          g.ellipse(drone.x, drone.y + 1, 17, 8, 0, 0, 7);
          g.fill();
          g.drawImage(this.texturas.get("drone"), Math.round(drone.x) - 12, Math.round(drone.y) - 16);
        }
      })),
      { y: p.y, desenhar: () => {
        g.globalAlpha = p.invulneravel > 0 && Math.floor(this.tempo * 16) % 2 ? .45 : 1;
        this.personagem("protagonista", p.x, p.y, p.direcao, p.passo);
        g.globalAlpha = 1;
      } }
    ];
    atores.sort((a, b) => a.y - b.y).forEach((item) => item.desenhar());
    this.marcas();
    for (const part of this.faiscas) {
      g.fillStyle = part.cor;
      g.fillRect(Math.round(part.x), Math.round(part.y), 2, 2);
    }
    g.restore();
  }

  marcas() {
    const g = this.ctx;
    const objetivo = this.jogo.alvoDaMissao();
    for (const item of this.interacoes) {
      const atual = item.acao === objetivo;
      const perto = item === this.alvo;
      const concluido = item.acao.startsWith("sensor:") &&
        this.jogo.save.sensores.includes(Number(item.acao.split(":")[1]));
      const x = Math.round(item.ponto.x);
      const y = item.h ? item.y - 6 : item.y - 27;
      const yMarca = atual ? y + Math.round(Math.sin(this.tempo * 5) * 2) : y;
      g.fillStyle = atual || perto ? "#f2cb79" : concluido ? "#a0d69e" : "#b9c9a9";
      if (item.acao.startsWith("ir:")) {
        const marca = { estufa: "V", embrio: "A", contencao: "!", central: "↩" }[item.acao.split(":")[1]];
        g.fillStyle = "#243d3b";
        g.fillRect(x - 6, y - 4, 13, 12);
        g.fillStyle = atual ? "#ffda8c" : "#dce7c1";
        g.font = "bold 9px Consolas, monospace";
        g.textAlign = "center";
        g.fillText(marca, x, y + 5);
      } else if (atual || perto) {
        g.fillRect(x - 4, yMarca - 6, 9, 8);
        g.fillRect(x - 1, yMarca + 2, 3, 2);
        g.fillStyle = "#283f3a";
        g.fillRect(x, yMarca - 4, 1, 3);
        g.fillRect(x, yMarca, 1, 1);
      } else {
        g.fillRect(x - 2, yMarca, 5, 4);
      }
    }
    const fora = this.interacoes.find((item) => item.acao === objetivo);
    if (!fora) return;
    const x = fora.ponto.x - this.camera.x;
    const y = fora.ponto.y - this.camera.y;
    if (x < 14 || x > this.canvas.width - 14 || y < 14 || y > this.canvas.height - 14) {
      g.save();
      g.translate(this.camera.x + limitar(x, 14, this.canvas.width - 14),
        this.camera.y + limitar(y, 15, this.canvas.height - 15));
      g.rotate(Math.atan2(y - this.canvas.height / 2, x - this.canvas.width / 2));
      g.fillStyle = "#f4cc7c";
      g.beginPath();
      g.moveTo(7, 0);
      g.lineTo(-5, -5);
      g.lineTo(-5, 5);
      g.fill();
      g.restore();
    }
  }
}
