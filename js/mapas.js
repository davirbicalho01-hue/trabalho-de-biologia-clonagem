// As coordenadas são em pixels da arte. x e y localizam o canto do objeto.
const objetos = {
  painel: [70, 43], portaV: [58, 46], portaA: [58, 46], portaC: [58, 46], saida: [58, 46],
  bancada: [102, 57], bancadaV: [102, 57], bancadaA: [102, 57], estante: [76, 45],
  vasoSala: [24, 27], ilha: [72, 51], caixa: [39, 30], console: [34, 37]
};
const obj = (arte, x, y, nome, acao, solido = true) => ({ arte, x, y, nome, acao, solido });
const mapas = {
  central: {
    numero: "00", nome: "Laboratório central", entrada: [304, 287],
    objetos: [
      obj("portaV", 94, 33, "Estufa experimental", "ir:estufa", false),
      obj("portaA", 456, 33, "Laboratório de embriologia", "ir:embrio", false),
      obj("portaC", 275, 33, "Corredor de contenção", "ir:contencao", false),
      obj("painel", 269, 188, "Arquivo de campo", "arquivo"),
      obj("bancada", 76, 119), obj("bancadaA", 427, 119),
      obj("estante", 52, 239), obj("ilha", 470, 233),
      obj("vasoSala", 192, 75), obj("vasoSala", 393, 75), obj("vasoSala", 546, 271)
    ],
    npcs: [{ arte: "iris", x: 210, y: 197, nome: "Dra. Íris", acao: "fala:iris" }]
  },
  estufa: {
    numero: "01", nome: "Estufa experimental", entrada: [304, 280],
    objetos: [
      obj("saida", 275, 33, "Voltar ao laboratório central", "ir:central", false),
      obj("bancadaV", 79, 111, "Bancada da matriz", "etapa:matriz"),
      obj("bancada", 419, 111, "Mesa de cultivo", "etapa:cultivo"),
      obj("bancadaV", 253, 209, "Berçário de mudas", "etapa:crescimento"),
      obj("ilha", 73, 245), obj("estante", 448, 240), obj("vasoSala", 50, 84),
      obj("vasoSala", 532, 88), obj("vasoSala", 175, 272), obj("vasoSala", 406, 273)
    ],
    npcs: [{ arte: "lia", x: 303, y: 154, nome: "Lia", acao: "fala:lia" }]
  },
  embrio: {
    numero: "02", nome: "Laboratório de embriologia", entrada: [304, 280],
    objetos: [
      obj("saida", 275, 33, "Voltar ao laboratório central", "ir:central", false),
      obj("bancadaA", 77, 105, "Arquivo de amostras", "etapa:amostras"),
      obj("bancada", 425, 105, "Microscópio", "etapa:microscopio"),
      obj("ilha", 91, 224, "Incubadora", "etapa:incubadora"),
      obj("painel", 445, 223, "Registro de nascimento", "etapa:registro"),
      obj("estante", 266, 220), obj("vasoSala", 52, 86), obj("vasoSala", 541, 87)
    ],
    npcs: [{ arte: "teo", x: 304, y: 148, nome: "Teo", acao: "fala:teo" }]
  },
  contencao: {
    numero: "03", nome: "Corredor de contenção", entrada: [304, 289],
    objetos: [
      obj("saida", 275, 33, "Voltar ao laboratório central", "ir:central", false),
      obj("console", 65, 111, "Sensor A", "sensor:0"),
      obj("console", 285, 115, "Sensor B", "sensor:1"),
      obj("console", 507, 109, "Sensor C", "sensor:2"),
      obj("caixa", 145, 188), obj("caixa", 416, 188), obj("caixa", 284, 224),
      obj("caixa", 91, 260), obj("caixa", 481, 263)
    ],
    npcs: []
  }
};
const falas = {
  iris: ["Dra. Íris", "A estação precisa de dois registros: uma muda e um cordeiro. Você pode começar por qualquer porta. Procure a bancada marcada no mapa e interaja com E."],
  lia: ["Lia · Estufa", "Tem um gerânio saudável na bancada da matriz. Comece por ele. Depois vamos usar a mesa de cultivo e conferir as raízes no berçário."],
  teo: ["Teo · Embriologia", "Neste laboratório, tudo é uma simulação. Veja primeiro as amostras e o papel de cada ovelha. O microscópio vem logo depois."]
};
