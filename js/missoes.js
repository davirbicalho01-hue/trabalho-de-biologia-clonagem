// Dados da simulação. Os índices dos cartões começam em zero.
const ferramenta = {
  tesoura: ["Tesoura", "tesoura"], vaso: ["Vaso de cultivo", "vaso"],
  pipeta: ["Micropipeta", "pipeta"], nucleo: ["Núcleo da doadora", "nucleo"],
  embriao: ["Embrião", "embriao"], scanner: ["Scanner de campo", "scanner"]
};
const amostra = (nome, sprite, pista = "") => ({ nome, sprite, pista });
const fase = (estacao, titulo, tarefa, nota, tipo, resposta, itens, extra = {}) =>
  ({ estacao, titulo, tarefa, nota, tipo, resposta, itens, ...extra });

const missoes = {
  estufa: {
    nome: "Clonagem vegetal",
    resultado: "muda", epilogo: "Uma nova muda de gerânio",
    resumo: "A muda surgiu de um ramo da planta matriz. A estaquia é uma forma de reprodução assexuada.",
    fases: [
      fase("matriz", "Escolha a matriz", "Qual gerânio tem o melhor ramo para começar?",
        "A planta matriz fornece a estaca. Uma planta saudável oferece ramos mais vigorosos para o enraizamento.", "escolha", 1, [
          amostra("Gerânio murcho", "murcho", "Folhas murchas indicam que este ramo perdeu água."),
          amostra("Gerânio saudável", "geranio")
        ], { ganho: "tesoura", retorno: "Matriz registrada. A tesoura entrou no estojo." }),
      fase("matriz", "Encontre o nó", "Marque no ramo onde se forma a folha para indicar a região do corte.",
        "O nó é a região do caule de onde sai uma folha ou broto. No gerânio, a estaca de caule deve ter nós.", "ponto", 1, [], {
          diagrama: "ramo", pontos: [[42, 22, "Ponta"], [51, 49, "Junção da folha"], [55, 82, "Base"]],
          erro: "Procure o encontro entre a folha e o caule.", retorno: "Nó identificado. A estaca foi separada abaixo dele."
        }),
      fase("matriz", "Prepare a estaca", "Escolha quais folhas retirar para deixar a base livre.",
        "As folhas superiores ajudam na fotossíntese. As da base poderiam apodrecer se ficassem enterradas.", "escolha", 0, [
          amostra("Folhas da base", "ramo"), amostra("Folhas do topo", "folha", "Deixe algumas folhas acima do substrato."),
          amostra("Nenhuma folha", "geranio", "As folhas que ficariam enterradas precisam sair.")
        ], { ganho: "vaso" }),
      fase("cultivo", "Plante no substrato", "Leve a estaca para o vaso com substrato leve e úmido.",
        "A base com um nó fica no substrato. Um material poroso retém umidade e deixa passar ar.", "transferencia", 0, [
          amostra("Substrato úmido", "vaso"), amostra("Vaso encharcado", "encharcado", "O excesso de água reduz o ar disponível no substrato.")
        ], { origem: amostra("Estaca preparada", "estaca") }),
      fase("cultivo", "Ajuste a estufa", "Configure a luz e a umidade para a estaca criar raízes.",
        "A estaca precisa de luz para a fotossíntese e de umidade enquanto suas raízes ainda estão se formando.", "ajuste", [1, 1], [
          { nome: "Luz", opcoes: ["Escuro", "Indireta", "Sol forte"] },
          { nome: "Substrato", opcoes: ["Seco", "Úmido", "Encharcado"] }
        ], { erro: "Escolha luz indireta e umidade sem encharcar o vaso." }),
      fase("crescimento", "Acompanhe as raízes", "Registre o crescimento do primeiro ao último estágio.",
        "Primeiro a estaca está sem raízes. Depois elas crescem e passam a absorver água e sais minerais, sustentando os novos brotos.", "ordem", [1, 2, 0], [
          amostra("Muda estabelecida", "muda"), amostra("Estaca plantada", "plantada"), amostra("Primeiras raízes", "raizes")
        ], { pistas: ["Comece com a estaca recém-plantada.", "Busque as primeiras raízes.", "Agora registre a muda já estabelecida."] }),
      fase("crescimento", "Identifique a origem da muda", "Qual planta forneceu o material genético da nova muda?",
        "A muda e a matriz têm o mesmo material genético de origem. Luz, água e outras condições podem mudar a aparência da planta.", "escolha", 2, [
          amostra("Uma planta de semente", "semente", "Esta muda cresceu por propagação vegetativa."),
          amostra("Outro gerânio", "murcho", "Pense em qual planta cedeu o ramo."),
          amostra("A planta matriz", "geranio")
        ], { retorno: "Clone vegetal registrado no caderno de campo." })
    ]
  },
  embrio: {
    nome: "Clonagem animal",
    resultado: "cordeiro", epilogo: "Um cordeiro no registro",
    resumo: "O DNA nuclear do cordeiro veio da célula somática. A doadora do óvulo e a gestante tiveram outros papéis.",
    fases: [
      fase("amostras", "Identifique a doadora", "O registro separa a ovelha de etiqueta azul como doadora da célula.",
        "Três ovelhas participam da simulação. A primeira fornece o DNA nuclear do futuro clone.", "escolha", 1, [
          amostra("Etiqueta ocre", "ovelhaOcre", "Esta ovelha fornece o óvulo."),
          amostra("Etiqueta azul", "ovelhaAzul"),
          amostra("Etiqueta rosa", "ovelhaRosa", "Esta ovelha recebe o embrião mais adiante.")
        ]),
      fase("amostras", "Isole uma célula somática", "Identifique a amostra da pele que será usada.",
        "Uma célula somática é uma célula do corpo. O núcleo da célula da pele guarda o DNA nuclear que será transferido.", "escolha", 2, [
          amostra("Placa vazia", "placa", "A placa ainda não tem uma amostra."),
          amostra("Óvulo", "ovulo", "O óvulo será a célula receptora."),
          amostra("Célula da pele", "somatica")
        ], { ganho: "nucleo" }),
      fase("amostras", "Identifique o óvulo", "Separe o óvulo não fertilizado da doadora de etiqueta ocre.",
        "O citoplasma do óvulo contém componentes que ajudam a reprogramar o núcleo transferido para o início do desenvolvimento.", "escolha", 0, [
          amostra("Óvulo não fertilizado", "ovulo"),
          amostra("Embrião", "duas", "As duas células indicam que esta amostra já começou a se dividir."),
          amostra("Célula da pele", "somatica", "Esta é a fonte do núcleo, não o óvulo receptor.")
        ], { ganho: "pipeta" }),
      fase("microscopio", "Remova o material nuclear", "No esquema, marque a região rosa que contém os cromossomos do óvulo.",
        "A retirada dos cromossomos do óvulo é chamada enucleação. Ela prepara a célula para receber o DNA nuclear da doadora.", "ponto", 1, [], {
          diagrama: "ovulo", pontos: [[29, 41, "Citoplasma"], [53, 48, "Região rosa"], [75, 65, "Membrana"]],
          erro: "A região rosa representa o material genético que deve ser retirado.", retorno: "Óvulo enucleado. O citoplasma foi preservado."
        }),
      fase("microscopio", "Transfira o núcleo somático", "Mova o núcleo azul para o óvulo receptor preparado.",
        "O óvulo reconstruído passa a carregar o DNA nuclear da ovelha que doou a célula da pele.", "transferencia", 1, [
          amostra("Óvulo intacto", "ovulo", "Este óvulo ainda contém o material nuclear original."),
          amostra("Óvulo enucleado", "vazio")
        ], { origem: amostra("Núcleo da doadora", "nucleo"), usar: "nucleo" }),
      fase("incubadora", "Ative a célula reconstruída", "Escolha o sinal de ativação desta simulação.",
        "A ativação pode iniciar o desenvolvimento do embrião. Nesta simulação, o sinal é representado por um pulso elétrico controlado.", "escolha", 1, [
          amostra("Esperar", "tempo", "O procedimento ainda precisa de um sinal de ativação."),
          amostra("Pulso de ativação", "pulso")
        ]),
      fase("incubadora", "Observe as divisões", "Ordene o óvulo reconstruído e os estágios do embrião.",
        "Após a ativação, as primeiras divisões aumentam o número de células. A equipe acompanha o desenvolvimento antes da transferência.", "ordem", [2, 0, 1], [
          amostra("Duas células", "duas"), amostra("Várias células", "embriao"), amostra("Óvulo reconstruído", "reconstruido")
        ], { ganho: "embriao", pistas: ["Comece com a célula reconstruída.", "Procure o estágio com duas células.", "Termine com o estágio de várias células."] }),
      fase("incubadora", "Transfira o embrião", "Leve o embrião até a receptora de etiqueta rosa.",
        "O embrião é transferido ao útero da receptora, onde pode se implantar e se desenvolver durante a gestação.", "transferencia", 1, [
          amostra("Doadora da célula", "ovelhaAzul", "A ovelha azul já forneceu a célula somática."),
          amostra("Fêmea receptora", "ovelhaRosa")
        ], { origem: amostra("Embrião inicial", "embriao"), usar: "embriao" }),
      fase("registro", "Registre o nascimento", "O cordeiro nasceu na simulação. De onde veio o seu DNA nuclear?",
        "O núcleo veio da doadora da célula. O óvulo forneceu citoplasma e mitocôndrias, e a receptora abrigou o embrião. Muitas tentativas reais falham.", "escolha", 0, [
          amostra("Doadora da célula", "ovelhaAzul"),
          amostra("Doadora do óvulo", "ovelhaOcre", "Lembre qual ovelha forneceu o núcleo azul."),
          amostra("Fêmea receptora", "ovelhaRosa", "A receptora gestou o embrião.")
        ], { retorno: "Clone animal registrado no caderno de campo." })
    ]
  }
};
