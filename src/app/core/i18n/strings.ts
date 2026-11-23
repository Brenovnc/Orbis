// Every text of the interface in both languages. Place names, capitals and states come from the
// generated data (already in pt and en); only the interface text lives here.
// Placeholders look like {n} and are filled by I18nService.t().

export const STRINGS = {
  // Menu
  'home.tagline': {
    pt: 'Aprenda geografia jogando no mapa.',
    en: 'Learn geography by playing on the map.',
  },
  'home.menu': { pt: 'Menu principal', en: 'Main menu' },
  'home.map': { pt: 'Mapa', en: 'Map' },
  'home.world': { pt: 'Mundo', en: 'World' },
  'home.brazil': { pt: 'Brasil', en: 'Brazil' },
  'home.continent': { pt: 'Região do mapa', en: 'Part of the map' },
  'home.continentAll': { pt: 'Mundo todo', en: 'Whole world' },
  'home.groups': { pt: 'Tipo de jogo', en: 'Kind of game' },
  'home.group.map': { pt: 'Mapa', en: 'Map' },
  'home.group.challenges': { pt: 'Desafios', en: 'Challenges' },
  'game.silhuetas.title': { pt: 'Silhuetas', en: 'Silhouettes' },
  'game.silhuetas.desc': {
    pt: 'Descubra o lugar só pelo contorno.',
    en: 'Name the place from its outline alone.',
  },
  'game.vizinhos.title': { pt: 'Vizinhos', en: 'Neighbors' },
  'game.vizinhos.desc': {
    pt: 'Digite todos os vizinhos de um lugar.',
    en: 'Type every neighbor of a place.',
  },
  'game.trilha.title': { pt: 'Trilha', en: 'Trail' },
  'game.trilha.desc': {
    pt: 'Chegue de um lugar a outro por fronteiras.',
    en: 'Get from one place to another across borders.',
  },
  'game.proximidade.title': { pt: 'Proximidade', en: 'Proximity' },
  'game.proximidade.desc': {
    pt: 'Ache o lugar secreto pela distância.',
    en: 'Find the secret place by distance.',
  },
  'home.inProgress': { pt: '● Partida em andamento', en: '● Game in progress' },
  'home.record': { pt: 'Recorde: {record}', en: 'Record: {record}' },
  'home.settings': { pt: 'Configurações', en: 'Settings' },
  'home.about': { pt: 'Sobre', en: 'About' },
  'game.digitar-paises.title': { pt: 'Digitar países', en: 'Type countries' },
  'game.digitar-paises.desc': {
    pt: 'Escreva todos os países que lembrar.',
    en: 'Type every country you can remember.',
  },
  'game.digitar-capitais.title': { pt: 'Digitar capitais', en: 'Type capitals' },
  'game.digitar-capitais.desc': {
    pt: 'Escreva capitais; o país acende no mapa.',
    en: 'Type capitals; the country lights up.',
  },
  'game.clicar-nome.title': { pt: 'Clicar pelo nome', en: 'Click by name' },
  'game.clicar-nome.desc': {
    pt: 'Ache no mapa o país pedido.',
    en: 'Find the country on the map.',
  },
  'game.clicar-capital.title': { pt: 'Clicar pela capital', en: 'Click by capital' },
  'game.clicar-capital.desc': {
    pt: 'Ache o país a partir da capital.',
    en: 'Find the country from its capital.',
  },
  'game.clicar-bandeira.title': { pt: 'Clicar pela bandeira', en: 'Click by flag' },
  'game.clicar-bandeira.desc': {
    pt: 'Ache o país a partir da bandeira.',
    en: 'Find the country from its flag.',
  },
  // Same games on the Brazil map
  'game.br.digitar-paises.title': { pt: 'Digitar estados', en: 'Type states' },
  'game.br.digitar-paises.desc': {
    pt: 'Escreva todos os estados que lembrar.',
    en: 'Type every state you can remember.',
  },
  'game.br.digitar-capitais.title': { pt: 'Digitar capitais', en: 'Type capitals' },
  'game.br.digitar-capitais.desc': {
    pt: 'Escreva capitais; o estado acende no mapa.',
    en: 'Type capitals; the state lights up.',
  },
  'game.br.clicar-nome.title': { pt: 'Clicar pelo nome', en: 'Click by name' },
  'game.br.clicar-nome.desc': {
    pt: 'Ache no mapa o estado pedido.',
    en: 'Find the state on the map.',
  },
  'game.br.clicar-capital.title': { pt: 'Clicar pela capital', en: 'Click by capital' },
  'game.br.clicar-capital.desc': {
    pt: 'Ache o estado a partir da capital.',
    en: 'Find the state from its capital.',
  },
  'game.br.clicar-bandeira.title': { pt: 'Clicar pela bandeira', en: 'Click by flag' },
  'game.br.clicar-bandeira.desc': {
    pt: 'Ache o estado a partir da bandeira.',
    en: 'Find the state from its flag.',
  },

  'game.br.silhuetas.title': { pt: 'Silhuetas', en: 'Silhouettes' },
  'game.br.silhuetas.desc': {
    pt: 'Descubra o estado só pelo contorno.',
    en: 'Name the state from its outline alone.',
  },
  'game.br.trilha.title': { pt: 'Trilha', en: 'Trail' },
  'game.br.trilha.desc': {
    pt: 'Chegue de um estado a outro por fronteiras.',
    en: 'Get from one state to another across borders.',
  },
  'game.br.proximidade.title': { pt: 'Proximidade', en: 'Proximity' },
  'game.br.proximidade.desc': {
    pt: 'Ache o estado secreto pela distância.',
    en: 'Find the secret state by distance.',
  },
  'game.br.vizinhos.title': { pt: 'Vizinhos', en: 'Neighbors' },
  'game.br.vizinhos.desc': {
    pt: 'Digite todos os estados vizinhos de um estado.',
    en: 'Type every state that borders a state.',
  },

  // Neighbors game
  'neighbors.placeholder': { pt: 'Digite um vizinho…', en: 'Type a neighbor…' },
  'neighbors.placeholder.states': {
    pt: 'Digite um estado vizinho…',
    en: 'Type a neighboring state…',
  },
  'neighbors.round': { pt: 'Rodada {n}/{total}', en: 'Round {n}/{total}' },
  'neighbors.of': { pt: 'Vizinhos de', en: 'Neighbors of' },
  'neighbors.giveUpRound': { pt: 'Desistir da rodada', en: 'Give up the round' },
  'neighbors.next': { pt: 'Próxima rodada ▸', en: 'Next round ▸' },
  'neighbors.finish': { pt: 'Ver resultado ▸', en: 'See result ▸' },
  'neighbors.missed': {
    pt: 'Faltaram {n}: estão em terracota no mapa.',
    en: '{n} missed: they are terracotta on the map.',
  },
  'neighbors.notNeighbor': {
    pt: '{name} não faz fronteira com {subject}.',
    en: '{name} does not border {subject}.',
  },
  'neighbors.isSubject': {
    pt: '{name} é o lugar da rodada: digite os vizinhos dele.',
    en: '{name} is the place of this round: type its neighbors.',
  },
  'neighbors.via': {
    pt: '{b}: {a} e {b} fazem fronteira por meio do território {territory}.',
    en: '{b}: {a} and {b} share a border through the territory {territory}.',
  },

  'home.fewBorders': {
    pt: 'Poucas fronteiras terrestres na {continent}',
    en: 'Few land borders in {continent}',
  },

  // Difficulty dialog
  'play.levels': { pt: 'Dificuldade', en: 'Difficulty' },
  'play.close': { pt: 'Fechar', en: 'Close' },
  'play.start': { pt: 'Começar', en: 'Start' },
  'play.continue': { pt: 'Continuar partida', en: 'Resume game' },
  'play.startNew': { pt: 'Começar nova partida', en: 'Start a new game' },
  'play.discardNote': {
    pt: 'A partida salva será descartada.',
    en: 'The saved game will be discarded.',
  },
  'play.discard.title': { pt: 'Descartar a partida salva?', en: 'Discard the saved game?' },
  'play.discard.message': {
    pt: 'Começar uma nova partida apaga a que está em andamento.',
    en: 'Starting a new game deletes the one in progress.',
  },
  'play.discard.ok': { pt: 'Descartar e começar', en: 'Discard and start' },
  'play.custom.desc': {
    pt: 'Ajuste cada opção deste jogo',
    en: 'Adjust each option of this game',
  },
  'play.back': { pt: 'Voltar', en: 'Back' },
  'play.needsCrossings': {
    pt: 'Há poucas fronteiras terrestres na {continent}: ligue as travessias para jogar.',
    en: 'There are few land borders in {continent}: turn on the sea crossings to play.',
  },
  'play.trailFallback': {
    pt: 'Na {continent} nenhum país pode ser proibido: a partida roda sem proibidos.',
    en: 'No country can be forbidden in {continent}: the game runs without any.',
  },
  // Items of a level: a few words each, next to an icon.
  'level.noTime': { pt: 'Sem limite de tempo', en: 'No time limit' },
  'level.time': { pt: '{n} min', en: '{n} min' },
  'level.attempt1': { pt: '1 tentativa', en: '1 attempt' },
  'level.attemptsN': { pt: '{n} tentativas', en: '{n} attempts' },
  'level.spareGuesses': { pt: '{n} chutes extras', en: '{n} extra guesses' },
  'level.typo.0': { pt: 'Digitação exata', en: 'Exact spelling' },
  'level.typo.1': { pt: 'Tolera erros leves', en: 'Forgives small typos' },
  'level.typo.2': { pt: 'Tolera erros', en: 'Forgives typos' },
  'level.choices': { pt: '4 alternativas', en: '4 choices' },
  'level.names': { pt: 'Nomes no mapa', en: 'Names on the map' },
  'level.noNames': { pt: 'Sem nomes', en: 'No names' },
  'level.learn': { pt: 'Modo aprender', en: 'Learn mode' },
  'level.noLearn': { pt: 'Sem modo aprender', en: 'No learn mode' },
  'level.surroundings': { pt: 'Arredores', en: 'Surroundings' },
  'level.hints': { pt: 'Continente e dicas', en: 'Continent and hints' },
  'level.hints.states': { pt: 'Região e dicas', en: 'Region and hints' },
  'level.noHints': { pt: 'Sem dicas', en: 'No hints' },
  'level.forbidden.none': { pt: 'Sem proibidos', en: 'None forbidden' },
  'level.forbidden.sometimes': { pt: 'Às vezes 1 proibido', en: 'Sometimes 1 forbidden' },
  'level.forbidden.always': { pt: '1 a 3 proibidos', en: '1 to 3 forbidden' },
  'level.clues.distance-direction': { pt: 'Distância e direção', en: 'Distance and direction' },
  'level.clues.distance': { pt: 'Só distância', en: 'Distance only' },
  'level.clues.color': { pt: 'Só cor', en: 'Color only' },
  'level.borders.all': { pt: 'Com fronteiras', en: 'With borders' },
  'level.borders.coast': { pt: 'Sem fronteiras', en: 'No borders' },
  'level.mapShown': { pt: 'Mapa visível', en: 'Map shown' },
  'level.mapHidden': { pt: 'Mapa escondido', en: 'Map hidden' },

  // Trail game
  'trail.noForbidden': {
    pt: 'Na {continent}, a partida roda sem proibidos',
    en: 'In {continent}, the game has no forbidden places',
  },
  'trail.placeholder': { pt: 'Digite um lugar…', en: 'Type a place…' },
  'trail.placeholder.states': { pt: 'Digite um estado…', en: 'Type a state…' },
  'trail.goal': { pt: 'Chegue de {a} a {b}', en: 'Get from {a} to {b}' },
  'trail.without': { pt: 'Sem passar por {x}', en: 'Without crossing {x}' },
  'trail.minSteps': { pt: 'Caminho mínimo: {n} passos', en: 'Shortest path: {n} steps' },
  'trail.near': { pt: '{name}: num caminho mínimo', en: '{name}: on a shortest path' },
  'trail.detour': {
    pt: '{name}: dá para passar por ele, mas é desvio',
    en: '{name}: you can go through it, but it is a detour',
  },
  'trail.far': {
    pt: '{name}: por ele a trilha não fecha com os chutes da partida',
    en: '{name}: the trail cannot close through it with this game’s guesses',
  },
  'trail.island': {
    pt: '{name} não tem fronteira terrestre. Chute gasto.',
    en: '{name} has no land border. Guess spent.',
  },
  'trail.forbidden': {
    pt: '{name} é um lugar proibido! Chute gasto.',
    en: '{name} is a forbidden place! Guess spent.',
  },
  'trail.repeat': { pt: 'Você já chutou {name}.', en: 'You already guessed {name}.' },
  'trail.isOrigin': {
    pt: '{name} é a origem: já está na trilha.',
    en: '{name} is the origin: it is already on the trail.',
  },
  'trail.isDestination': {
    pt: '{name} é o destino: já está na trilha.',
    en: '{name} is the destination: it is already on the trail.',
  },
  'trail.via': {
    pt: ' (fronteira com {a} pelo território {territory})',
    en: ' (it borders {a} through the territory {territory})',
  },
  'trail.hint.outline': { pt: 'Próximo contorno', en: 'Next outline' },
  'trail.hint.outline.title': {
    pt: 'Dica: mostra o contorno (sem nome) de um lugar que falta num caminho mínimo',
    en: 'Hint: shows the outline (no name) of a place still missing on a shortest path',
  },
  'trail.hint.outline.none': {
    pt: 'Nenhum contorno a mostrar',
    en: 'No outline left to show',
  },
  'trail.hint.outline.shown': {
    pt: 'Contorno revelado no mapa.',
    en: 'Outline shown on the map.',
  },
  'trail.hint.outline.sea': {
    pt: 'Contorno revelado: travessia com {a}.',
    en: 'Outline shown: sea crossing to {a}.',
  },
  'trail.hint.map': { pt: 'Revelar mapa', en: 'Reveal map' },
  'trail.hint.map.title': {
    pt: 'Dica: mostra os contornos e as fronteiras do mundo todo até o fim da partida',
    en: 'Hint: shows the outlines and borders of the whole world until the game ends',
  },
  'trail.guesses': { pt: 'Seus chutes', en: 'Your guesses' },
  'trail.guessesN': { pt: 'Seus chutes ({n})', en: 'Your guesses ({n})' },
  'trail.help': {
    pt: 'O que significam as cores e os símbolos',
    en: 'What the colors and symbols mean',
  },
  'trail.none': {
    pt: 'Nenhum chute ainda. Digite um lugar e aperte Enter.',
    en: 'No guesses yet. Type a place and press Enter.',
  },
  'trail.color.near': { pt: 'num caminho mínimo', en: 'on a shortest path' },
  'trail.color.detour': { pt: 'desvio possível', en: 'possible detour' },
  'trail.color.far': { pt: 'não fecha a trilha', en: 'cannot close the trail' },
  'trail.solution': { pt: 'Uma solução possível', en: 'A possible solution' },
  'trail.seeBest': { pt: 'Ver um caminho mínimo', en: 'See a shortest path' },
  'trail.stepsCompared': {
    pt: 'O mínimo tinha {n} passos; você usou {m}.',
    en: 'The shortest had {n} steps; you used {m}.',
  },
  'trail.bySea': { pt: 'por mar', en: 'by sea' },
  'trail.yours': { pt: 'Seu caminho', en: 'Your trail' },
  'trail.madeShortest': { pt: 'Você fez um caminho mínimo', en: 'You made a shortest path' },
  'trail.legend.yours': { pt: 'Seu caminho (preenchido)', en: 'Your trail (filled)' },
  'trail.legend.timeline': {
    pt: 'Linha do tempo: da origem (em cima) ao destino. Toque num lugar para vê-lo no mapa.',
    en: 'Timeline: from the origin (top) to the destination. Tap a place to see it on the map.',
  },
  'trail.legend.wave': { pt: 'Trecho por mar', en: 'Stretch by sea' },
  'trail.legend.numbers': {
    pt: 'Números: a ordem do caminho (1 = origem)',
    en: 'Numbers: the order of the trail (1 = origin)',
  },
  'trail.legend.faded': {
    pt: 'Apagado: só no seu caminho, enquanto o caminho mínimo está aberto',
    en: 'Faded: only in your trail, while the shortest path is open',
  },
  'trail.legend.ends': { pt: 'Origem e destino', en: 'Origin and destination' },
  'trail.end.origin': { pt: 'origem', en: 'origin' },
  'trail.end.destination': { pt: 'destino', en: 'destination' },
  'trail.legend.sea': { pt: 'travessia marítima', en: 'sea crossing' },
  'trail.legend.forbidden': { pt: 'Lugar proibido', en: 'Forbidden place' },
  'trail.legend.forbiddenMany': { pt: 'Lugares proibidos', en: 'Forbidden places' },

  // Silhouettes game
  'silhouette.which': { pt: 'Que lugar é este?', en: 'Which place is this?' },
  'silhouette.which.states': { pt: 'Que estado é este?', en: 'Which state is this?' },
  'silhouette.placeholder': { pt: 'Digite o país…', en: 'Type the country…' },
  'silhouette.placeholder.states': { pt: 'Digite o estado…', en: 'Type the state…' },
  'silhouette.aria': {
    pt: 'Contorno do lugar a identificar',
    en: 'Outline of the place to identify',
  },
  'silhouette.scale': { pt: 'Fora de escala', en: 'Not to scale' },
  'silhouette.surroundings': { pt: 'Com os arredores', en: 'With its surroundings' },
  'silhouette.surroundings.aria': {
    pt: 'Contorno do lugar a identificar, com os contornos dos lugares ao redor',
    en: 'Outline of the place to identify, with the outlines of the places around it',
  },
  'silhouette.in': { pt: 'Na {place}', en: 'In {place}' },
  'silhouette.in.region': { pt: 'Na região {place}', en: 'In the {place}' },
  'silhouette.choices': { pt: 'Alternativas', en: 'Choices' },
  'silhouette.wrongChoice': { pt: 'Errada:', en: 'Wrong:' },
  'silhouette.hint': { pt: 'Dica', en: 'Hint' },
  'silhouette.hints': { pt: 'Dicas desta pergunta', en: 'Hints for this question' },
  'silhouette.hint.next.surroundings': {
    pt: 'Próxima dica: os arredores',
    en: 'Next hint: the surroundings',
  },
  'silhouette.hint.next.neighbors': {
    pt: 'Próxima dica: os vizinhos',
    en: 'Next hint: the neighbors',
  },
  'silhouette.hint.next.letters': {
    pt: 'Próxima dica: a primeira letra e o número de letras',
    en: 'Next hint: the first letter and the number of letters',
  },
  'silhouette.hint.none': {
    pt: 'Todas as dicas desta pergunta já foram usadas',
    en: 'Every hint for this question has been used',
  },
  'silhouette.hint.surroundings': { pt: 'Arredores', en: 'Surroundings' },
  'silhouette.hint.borders': { pt: 'Faz fronteira com', en: 'It borders' },
  'silhouette.hint.nearest': {
    pt: 'Sem fronteira terrestre · mais perto de',
    en: 'No land border · closest to',
  },
  'silhouette.hint.letters': { pt: 'Primeira letra', en: 'First letter' },
  'silhouette.hint.lettersValue': {
    pt: 'Letra {letter}, {n} letras',
    en: 'Letter {letter}, {n} letters',
  },
  'silhouette.hints.title': { pt: 'Dicas', en: 'Hints' },
  'frame.accuracyTyped': {
    pt: 'Precisão: {pct}% ({found} de {attempts} respostas)',
    en: 'Accuracy: {pct}% ({found} of {attempts} answers)',
  },

  // Proximity game
  'proximity.goal': { pt: 'Ache o lugar secreto', en: 'Find the secret place' },
  'proximity.goal.states': { pt: 'Ache o estado secreto', en: 'Find the secret state' },
  'proximity.placeholder': { pt: 'Digite um lugar…', en: 'Type a place…' },
  'proximity.placeholder.states': { pt: 'Digite um estado…', en: 'Type a state…' },
  'proximity.closest': {
    pt: 'mais perto: {name} ({distance})',
    en: 'closest: {name} ({distance})',
  },
  // Only the color as a clue: the warmest guess, with no distance.
  'proximity.hottest': { pt: 'mais quente: {name}', en: 'hottest: {name}' },
  'proximity.result': {
    pt: '{name}: {distance} · siga para {dir}',
    en: '{name}: {distance} · head {dir}',
  },
  // {clue}: the distance, or how hot it is in words.
  'proximity.result.clue': { pt: '{name}: {clue}', en: '{name}: {clue}' },
  'proximity.repeat': {
    pt: 'Você já chutou {name}: {clue}.',
    en: 'You already guessed {name}: {clue}.',
  },
  // The heat scale in words, from neighbor (0) to far away (5).
  'proximity.heat.0': { pt: 'fervendo', en: 'boiling' },
  'proximity.heat.1': { pt: 'muito quente', en: 'very hot' },
  'proximity.heat.2': { pt: 'quente', en: 'hot' },
  'proximity.heat.3': { pt: 'morno', en: 'warm' },
  'proximity.heat.4': { pt: 'frio', en: 'cold' },
  'proximity.heat.5': { pt: 'gelado', en: 'freezing' },
  'proximity.found': { pt: 'Achou! {name}', en: 'Found it! {name}' },
  'proximity.neighbor': { pt: 'vizinho', en: 'neighbor' },
  'proximity.km': { pt: '≈ {km} km', en: '≈ {km} km' },
  'proximity.direction': { pt: 'direção {dir}', en: 'direction {dir}' },
  // 16 compass points, clockwise from north, separated by spaces.
  'proximity.compass': {
    pt: 'N NNE NE ENE L ESE SE SSE S SSO SO OSO O ONO NO NNO',
    en: 'N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW',
  },
  'proximity.guesses': { pt: 'Seus chutes', en: 'Your guesses' },
  'proximity.none': {
    pt: 'Nenhum chute ainda. Digite um lugar e aperte Enter.',
    en: 'No guesses yet. Type a place and press Enter.',
  },
  'proximity.secret': { pt: 'Lugar secreto:', en: 'Secret place:' },
  'proximity.secret.states': { pt: 'Estado secreto:', en: 'Secret state:' },
  'proximity.legend': { pt: 'longe → perto', en: 'far → near' },
  'proximity.nearest': { pt: 'mais perto', en: 'closest' },
  'proximity.warmest': { pt: 'mais quente', en: 'hottest' },
  'proximity.help': { pt: 'Sobre as distâncias', en: 'About the distances' },
  'proximity.note': {
    pt: 'Distâncias aproximadas, entre as fronteiras mais próximas.',
    en: 'Approximate distances, between the nearest borders.',
  },
  'frame.end.proximity.complete': {
    pt: 'Você achou o lugar secreto!',
    en: 'You found the secret place!',
  },
  'frame.end.proximity.gaveup': { pt: 'Partida encerrada', en: 'Game over' },

  // Top bar and frame
  'bar.guesses': { pt: 'Chutes', en: 'Guesses' },
  'frame.end.trail.complete': { pt: 'Você chegou ao destino!', en: 'You reached the destination!' },
  'frame.end.trail.guesses': { pt: 'Seus chutes acabaram', en: 'You ran out of guesses' },
  'frame.end.trail.gaveup': { pt: 'Você desistiu', en: 'You gave up' },
  'frame.guess1': { pt: '1 chute', en: '1 guess' },
  'frame.guessesN': { pt: '{n} chutes', en: '{n} guesses' },
  'frame.yourRecordGuesses': {
    pt: 'Seu recorde no nível {level}: {guesses} em {time}',
    en: 'Your {level} record: {guesses} in {time}',
  },
  'frame.hinted': { pt: 'com dica', en: 'with hints' },
  'bar.back': { pt: 'Voltar ao menu', en: 'Back to menu' },
  'bar.time': { pt: 'Tempo', en: 'Time' },
  'bar.hits': { pt: 'Acertos', en: 'Correct' },
  'bar.errors': { pt: 'Erros', en: 'Errors' },
  'bar.settings': { pt: 'Configurações', en: 'Settings' },
  'bar.more': { pt: 'Mais ações', en: 'More actions' },
  'frame.pause': { pt: 'Pausar', en: 'Pause' },
  'frame.resume': { pt: 'Continuar', en: 'Resume' },
  'frame.listCountries': { pt: 'Países', en: 'Countries' },
  'frame.listCapitals': { pt: 'Capitais', en: 'Capitals' },
  'frame.listStates': { pt: 'Estados', en: 'States' },
  'frame.skip': { pt: 'Pular', en: 'Skip' },
  'frame.restart': { pt: 'Reiniciar', en: 'Restart' },
  'frame.giveUp': { pt: 'Desistir', en: 'Give up' },
  'frame.paused': { pt: 'Partida pausada', en: 'Game paused' },
  'frame.clockStopped': { pt: 'O tempo está parado.', en: 'The clock is stopped.' },
  'frame.result': { pt: 'Resultado da partida', en: 'Game result' },
  'frame.end.complete': { pt: 'Você acertou todos!', en: 'You got them all!' },
  'frame.end.timeout': { pt: 'Tempo esgotado', en: "Time's up" },
  'frame.end.gaveup': { pt: 'Partida encerrada', en: 'Game over' },
  'frame.in': { pt: 'em', en: 'in' },
  'frame.error1': { pt: '1 erro', en: '1 error' },
  'frame.errorsN': { pt: '{n} erros', en: '{n} errors' },
  'frame.newRecord': {
    pt: '★ Novo recorde no nível {level}!',
    en: '★ New {level} record!',
  },
  'frame.yourRecord': {
    pt: 'Seu recorde no nível {level}: {found}/{total} em {time}',
    en: 'Your {level} record: {found}/{total} in {time}',
  },
  'frame.yourRecordErrors': {
    pt: 'Seu recorde no nível {level}: {found}/{total}, {errors}, em {time}',
    en: 'Your {level} record: {found}/{total}, {errors}, in {time}',
  },
  'frame.accuracy': {
    pt: 'Precisão: {pct}% ({found} de {attempts} cliques)',
    en: 'Accuracy: {pct}% ({found} of {attempts} clicks)',
  },
  'frame.playAgain': { pt: 'Jogar de novo', en: 'Play again' },
  'frame.menu': { pt: 'Menu', en: 'Menu' },
  'frame.seeResult': { pt: 'Ver resultado', en: 'See result' },
  'frame.closeResult': { pt: 'Fechar resultado', en: 'Close result' },

  // Games
  'typing.placeholder.countries': { pt: 'Digite um país…', en: 'Type a country…' },
  'typing.placeholder.capitals': { pt: 'Digite uma capital…', en: 'Type a capital…' },
  'typing.listCountries': { pt: 'Lista de países', en: 'List of countries' },
  'typing.listCapitals': { pt: 'Lista de capitais', en: 'List of capitals' },
  'typing.placeholder.states': { pt: 'Digite um estado…', en: 'Type a state…' },
  'typing.listStates': { pt: 'Lista de estados', en: 'List of states' },
  'typing.confirm': { pt: 'Enter para confirmar: {name}', en: 'Press Enter to confirm: {name}' },
  'typing.dup': { pt: 'Você já acertou: {name}', en: 'Already found: {name}' },
  'typing.explain.territory': {
    pt: '{name} é um território {country}',
    en: '{name} is a territory of {country}',
  },
  'typing.explain.part': {
    pt: '{name} faz parte {country}',
    en: '{name} is part of {country}',
  },
  'typing.explain.unlisted': {
    pt: '{name} não está entre os 195 países deste jogo',
    en: '{name} is not among the 195 countries in this game',
  },
  'typing.explain.try': { pt: 'Tente {name}.', en: 'Try {name}.' },
  'typing.miss': { pt: 'Não encontrei. Tente de novo.', en: 'Not found. Try again.' },
  'click.whereIs': { pt: 'Onde fica', en: 'Where is' },
  'click.capitalOf': { pt: 'De qual país é a capital', en: 'Which country has the capital' },
  'click.whichFlag': { pt: 'De qual país é esta bandeira?', en: 'Which country has this flag?' },
  'flag.enlarge': { pt: 'Toque para ampliar', en: 'Tap to enlarge' },
  'flag.close': { pt: 'Fechar a bandeira', en: 'Close the flag' },
  'flag.enlargeClick': { pt: 'Clique para ampliar', en: 'Click to enlarge' },
  'click.flagAlt': { pt: 'Bandeira a identificar', en: 'Flag to identify' },
  'click.capitalOfState': { pt: 'De qual estado é a capital', en: 'Which state has the capital' },
  'click.whichFlagState': {
    pt: 'De qual estado é esta bandeira?',
    en: 'Which state has this flag?',
  },
  'click.noMore': { pt: 'Fim das perguntas', en: 'No more questions' },
  'click.correct': { pt: 'Correto! {name}', en: 'Correct! {name}' },
  'click.thatIs': { pt: 'Esse é: {name}', en: "That's: {name}" },
  'click.thatIsTerritory': {
    pt: 'Esse é: {territory}, território {country}',
    en: "That's: {territory}, a territory of {country}",
  },
  'click.correctTerritory': {
    pt: 'Correto! {name}. {territory} é um território {country}',
    en: 'Correct! {name}. {territory} is a territory of {country}',
  },
  'click.notThat': { pt: 'Não é esse. Tente de novo.', en: "That's not it. Try again." },
  'click.itWas': { pt: 'Era: {name}', en: 'It was: {name}' },
  'list.close': { pt: 'Fechar lista', en: 'Close list' },
  'list.toggleGroup': { pt: 'Mostrar ou esconder o grupo', en: 'Show or hide the group' },
  'list.foldAll': { pt: 'Recolher tudo', en: 'Collapse all' },
  'list.unfoldAll': { pt: 'Expandir tudo', en: 'Expand all' },
  'list.found': { pt: 'Acertou:', en: 'Found:' },
  'list.missed': { pt: 'Faltou:', en: 'Missed:' },
  'list.countOf': { pt: '{found} de {total}', en: '{found} of {total}' },

  // Confirmations
  'confirm.restart.title': { pt: 'Reiniciar a partida?', en: 'Restart the game?' },
  'confirm.restart.message': {
    pt: 'Você perde o progresso desta partida e começa do zero.',
    en: 'You lose the progress of this game and start from scratch.',
  },
  'confirm.restart.ok': { pt: 'Reiniciar', en: 'Restart' },
  'confirm.giveUp.title': { pt: 'Desistir da partida?', en: 'Give up?' },
  'confirm.giveUp.message': {
    pt: 'A partida termina agora e os lugares que faltam serão mostrados no mapa.',
    en: 'The game ends now and the places you missed are shown on the map.',
  },
  'confirm.giveUp.ok': { pt: 'Desistir', en: 'Give up' },
  'game.rulesKept': {
    pt: 'Esta partida continua com as regras de quando começou.',
    en: 'This game continues with the rules it started with.',
  },
  'confirm.keepPlaying': { pt: 'Continuar jogando', en: 'Keep playing' },

  // Areas out of play (land that is no target)
  'outOfPlay.legend': { pt: 'Fora do jogo', en: 'Out of play' },
  'outOfPlay.territories': {
    pt: '{name}: não está entre os 195 países do jogo · entra com a opção Territórios',
    en: '{name}: not among the 195 countries of the game · included with the Territories option',
  },
  'outOfPlay.unlisted': {
    pt: '{name}: não está entre os 195 países do jogo',
    en: '{name}: not among the 195 countries of the game',
  },
  'outOfPlay.never': {
    pt: '{name}: não faz parte de nenhum modo do jogo',
    en: '{name}: not part of any game mode',
  },

  // Info card
  'info.about': { pt: 'Informações sobre {name}', en: 'Information about {name}' },
  'info.flag': { pt: 'Bandeira: {name}', en: 'Flag: {name}' },
  'info.close': { pt: 'Fechar', en: 'Close' },
  'info.administeredBy': { pt: 'País administrador', en: 'Administered by' },
  'info.capital': { pt: 'Capital', en: 'Capital' },
  'info.capitals': { pt: 'Capitais', en: 'Capitals' },
  'info.continent': { pt: 'Continente', en: 'Continent' },
  'info.area': { pt: 'Área', en: 'Area' },
  'info.region': { pt: 'Região', en: 'Region' },
  'info.abbr': { pt: 'Sigla', en: 'Abbreviation' },
  'info.notAsked': { pt: 'Não é perguntado neste jogo', en: 'Not asked in this game' },
  'info.notAsked.why': {
    pt: 'Não é perguntado neste jogo: {why}',
    en: 'Not asked in this game: {why}',
  },
  'info.notAsked.noCapital': { pt: 'sem capital', en: 'no capital' },
  'info.notAsked.outline': {
    pt: 'contorno pequeno demais para as Silhuetas',
    en: 'outline too small for Silhouettes',
  },
  'info.claimedBy': { pt: 'Reivindicado por', en: 'Claimed by' },
  'continent.africa': { pt: 'África', en: 'Africa' },
  'continent.antarctica': { pt: 'Antártida', en: 'Antarctica' },
  'continent.asia': { pt: 'Ásia', en: 'Asia' },
  'continent.europe': { pt: 'Europa', en: 'Europe' },
  'continent.north-america': { pt: 'América do Norte', en: 'North America' },
  'continent.oceania': { pt: 'Oceania', en: 'Oceania' },
  'continent.south-america': { pt: 'América do Sul', en: 'South America' },

  // Map
  'map.aria': { pt: 'Mapa do mundo', en: 'World map' },
  'map.loading': { pt: 'Carregando o mapa…', en: 'Loading the map…' },
  'map.error': {
    pt: 'Não foi possível carregar o mapa. Verifique a conexão e recarregue a página.',
    en: 'The map could not be loaded. Check your connection and reload the page.',
  },
  'map.zoomIn': { pt: 'Aproximar', en: 'Zoom in' },
  'map.zoomOut': { pt: 'Afastar', en: 'Zoom out' },
  'map.reset': { pt: 'Ver o mundo inteiro', en: 'See the whole world' },
  'map.resetContinent': { pt: 'Ver o continente inteiro', en: 'See the whole continent' },

  // Settings
  'settings.title': { pt: 'Configurações', en: 'Settings' },
  'settings.close': { pt: 'Fechar configurações', en: 'Close settings' },
  'settings.easy': { pt: 'Fácil', en: 'Easy' },
  'settings.normal': { pt: 'Médio', en: 'Medium' },
  'settings.hard': { pt: 'Difícil', en: 'Hard' },
  'settings.custom': { pt: 'Personalizar', en: 'Customize' },
  // The level named in the record phrases ("Seu recorde no nível Personalizado").
  'settings.customLevel': { pt: 'Personalizado', en: 'Custom' },
  'settings.infoBox': {
    pt: 'Cartão de informações',
    en: 'Information card',
  },
  'settings.infoBox.hint': {
    pt: 'Mostra capital, bandeira e mais ao acertar.',
    en: 'Shows capital, flag and more after a correct answer.',
  },
  'settings.learn': { pt: 'Modo aprender', en: 'Learn mode' },
  'settings.learn.hint': {
    pt: 'Ao errar um clique ou uma resposta, mostra o nome e os dados do lugar escolhido.',
    en: 'After a wrong click or answer, shows the name and facts of the place you chose.',
  },
  'settings.hover.hint': {
    pt: 'Realça o lugar sob o cursor.',
    en: 'Highlights the place under the cursor.',
  },
  'settings.nextGame': {
    pt: 'próxima partida',
    en: 'next game',
  },
  'settings.nextGame.note': {
    pt: 'A opção marcada com "próxima partida" muda as regras e vale a partir da próxima partida; as demais valem na hora.',
    en: 'The option marked "next game" changes the rules and applies from the next game; the others apply at once.',
  },
  'settings.hover': { pt: 'Destaque ao passar o mouse', en: 'Highlight on hover' },
  'settings.trailLevel': { pt: 'Nível da Trilha', en: 'Trail level' },
  'settings.trailLevel.hint': {
    pt: 'Fácil: mapa visível. Médio: mapa escondido. Difícil: mapa escondido e menos chutes.',
    en: 'Easy: the map is shown. Medium: the map is hidden. Hard: hidden map and fewer guesses.',
  },
  'settings.trailForbidden': { pt: 'Proibidos na Trilha', en: 'Forbidden places in the Trail' },
  'settings.trailForbidden.hint': {
    pt: 'Lugares por onde a trilha não pode passar. Às vezes: 1, em cerca de um terço das partidas. Sempre: de 1 a 3.',
    en: 'Places the trail may not cross. Sometimes: 1, in about a third of the games. Always: 1 to 3.',
  },
  'settings.trailForbidden.none': { pt: 'Nenhum', en: 'None' },
  'settings.trailForbidden.sometimes': { pt: 'Às vezes', en: 'Sometimes' },
  'settings.trailForbidden.always': { pt: 'Sempre', en: 'Always' },
  'settings.trailCrossings': { pt: 'Travessias entre ilhas', en: 'Sea crossings' },
  'settings.trailCrossings.hint': {
    pt: 'A Trilha também pode passar por mar entre ilhas e o continente.',
    en: 'The Trail can also cross the sea between islands and the continent.',
  },
  'settings.silhouetteMode': { pt: 'Modo das Silhuetas', en: 'Silhouettes mode' },
  'settings.silhouetteMode.hint': {
    pt: 'Alternativas: escolha entre 4 nomes, com os arredores à vista. Com dicas: digite o nome, com o continente (ou a região) à vista e até 3 dicas. Sem dicas: digite só pelo contorno.',
    en: 'Choices: pick one of 4 names, with the surroundings shown. With hints: type the name, with the continent (or region) shown and up to 3 hints. No hints: type from the outline alone.',
  },
  'settings.silhouetteMode.choices': { pt: 'Alternativas', en: 'Choices' },
  'settings.silhouetteMode.hints': { pt: 'Com dicas', en: 'With hints' },
  'settings.silhouetteMode.typing': { pt: 'Sem dicas', en: 'No hints' },
  'settings.mapBorders': { pt: 'Fronteiras no mapa', en: 'Borders on the map' },
  'settings.mapBorders.hint': {
    pt: 'Só o litoral: a terra aparece inteira, sem fronteiras; cada acerto aparece no lugar certo.',
    en: 'Coast only: the land is shown in one piece, with no borders; each answer lights up in its place.',
  },
  'settings.mapBorders.all': { pt: 'Todas', en: 'All' },
  'settings.mapBorders.coast': { pt: 'Só o litoral', en: 'Coast only' },
  'settings.proximityClues': { pt: 'Pistas', en: 'Clues' },
  'settings.proximityClues.hint': {
    pt: 'O que cada chute mostra. A cor no mapa aparece sempre; em "Só cor", a lista diz em palavras se está quente ou frio.',
    en: 'What each guess shows. The color on the map is always there; with "Color only", the list says in words how hot or cold it is.',
  },
  'settings.names': { pt: 'Nomes dos acertados no mapa', en: 'Names of found places on the map' },
  'settings.names.hint': {
    pt: 'Escreve o nome sobre o lugar acertado (mais nomes aparecem ao aproximar).',
    en: 'Writes the name over each found place (more names appear as you zoom in).',
  },
  'settings.reveal': {
    pt: 'Tentativas por pergunta',
    en: 'Attempts per question',
  },
  'settings.reveal.hint': {
    pt: 'Ao esgotar as tentativas, a resposta é revelada e conta como erro.',
    en: 'When the attempts run out, the answer is revealed and counts as a mistake.',
  },
  'settings.timer': { pt: 'Cronômetro', en: 'Timer' },
  'settings.timer.hint': {
    pt: 'Ligado, a partida tem tempo limite; desligado, o tempo apenas conta para cima.',
    en: 'On, the game has a time limit; off, the clock just counts up.',
  },
  'settings.duration': { pt: 'Duração (min)', en: 'Time limit (min)' },
  'settings.durationContinent': {
    pt: 'Vale para o mundo todo; num continente, é ajustada em proporção ao número de lugares (mínimo de 2 min).',
    en: 'For the whole world; on a continent it is scaled to its number of places (at least 2 min).',
  },
  'settings.territories': { pt: 'Incluir territórios', en: 'Include territories' },
  'settings.territories.hint': {
    pt: 'Desligado, só os 195 países valem e cada território conta como parte do país que o administra. Ligado, Groenlândia, Guiana Francesa, Antártida e outros viram alvos próprios.',
    en: 'When off, only the 195 countries count and each territory counts as part of the country that administers it. When on, Greenland, French Guiana, Antarctica and others become targets of their own.',
  },
  'settings.territories.brazil': {
    pt: 'Indisponível no mapa do Brasil: os alvos são só os estados e o Distrito Federal.',
    en: 'Not available on the Brazil map: the targets are only the states and the Federal District.',
  },
  'settings.typo': { pt: 'Tolerância de grafia', en: 'Typo tolerance' },
  'settings.typo.hint': {
    pt: 'Erros leves de digitação aceitos ao apertar Enter.',
    en: 'Small typos accepted when you press Enter.',
  },
  'settings.typo.0': { pt: 'Nenhuma', en: 'None' },
  'settings.typo.1': { pt: 'Normal', en: 'Normal' },
  'settings.typo.2': { pt: 'Alta', en: 'High' },
  'settings.sounds': { pt: 'Sons', en: 'Sounds' },
  'settings.sounds.hint': {
    pt: 'Sons curtos de acerto, erro e fim de partida.',
    en: 'Short sounds for correct answers, mistakes and the end of a game.',
  },
  'settings.language': { pt: 'Idioma', en: 'Language' },
  'settings.projection': { pt: 'Mapa', en: 'Map' },
  'settings.projection.hint': {
    pt: 'O contínuo (projeção Patterson) se repete na horizontal, sem cortar o Pacífico; o arredondado (projeção Natural Earth) é o mapa-múndi clássico.',
    en: 'Continuous (Patterson projection) repeats sideways without cutting the Pacific; rounded (Natural Earth projection) is the classic world map.',
  },
  'settings.camera': { pt: 'Câmera', en: 'Camera' },
  'settings.camera.hint': {
    pt: 'O que o mapa faz sozinho ao mostrar um lugar. Clicar num item da lista sempre leva até ele.',
    en: 'What the map does on its own when it shows a place. Clicking a list item always takes you there.',
  },
  'settings.camera.zoom': { pt: 'Aproximar', en: 'Zoom in' },
  'settings.camera.center': { pt: 'Só centralizar', en: 'Center only' },
  'settings.camera.off': { pt: 'Desligada', en: 'Off' },
  'settings.continuous': { pt: 'Contínuo', en: 'Continuous' },
  'settings.naturalEarth': {
    pt: 'Arredondado',
    en: 'Rounded',
  },
  // About
  'about.title': { pt: 'Sobre o Orbis', en: 'About Orbis' },
  'about.back': { pt: 'Voltar ao menu', en: 'Back to menu' },
  'about.what.title': { pt: 'O que é', en: 'What it is' },
  'about.what.text': {
    pt: 'O Orbis é um conjunto de minigames de geografia para aprender e se desafiar: países, capitais, bandeiras, territórios e os estados e capitais do Brasil. O mapa é o protagonista, e a cada acerto você aprende de passagem outras informações do lugar. Funciona inteiramente no seu navegador: sem contas e sem enviar seus dados a nenhum servidor.',
    en: 'Orbis is a set of geography minigames to learn and challenge yourself: countries, capitals, flags, territories, and the states and capitals of Brazil. The map is the star, and each right answer teaches you something else about the place. It works entirely in your browser: no accounts and no data sent to any server.',
  },
  'about.how.title': { pt: 'Como jogar', en: 'How to play' },
  'about.how.1': {
    pt: 'Escolha o mapa (Mundo ou Brasil) e, no Mundo, a região (o mundo todo ou um continente). Depois escolha um jogo do grupo Mapa ou dos Desafios.',
    en: 'Pick the map (World or Brazil) and, for the World, the region (the whole world or one continent). Then pick a game from the Map group or the Challenges.',
  },
  'about.how.2': {
    pt: 'Digitar: escreva o máximo de nomes que lembrar antes do tempo acabar; o que você acerta acende no mapa. Vale português ou inglês, sem se preocupar com acentos. Se um nome for o começo de outro (como Irã e Iraque), aperte Enter para confirmar. No Difícil, o mapa não mostra as fronteiras: só o litoral e o que você já acertou.',
    en: 'Typing: write as many names as you can before time runs out; what you get right lights up on the map. Portuguese or English both work, accents do not matter. If one name is the beginning of another (like Iran and Iraq), press Enter to confirm. On Hard, the map shows no borders: only the coast and what you already got right.',
  },
  'about.how.3': {
    pt: 'Clicar: a pista (nome, capital ou bandeira) fica na barra superior e você clica no lugar certo. Use "Pular" se não souber. Cada pergunta tem um número de tentativas (conforme a dificuldade); ao esgotá-las, a resposta é revelada no mapa e conta como erro.',
    en: 'Clicking: the clue (name, capital or flag) is in the top bar and you click the right place. Use "Skip" if you do not know. Each question has a number of attempts (set by the difficulty); when they run out, the answer is revealed on the map and counts as a mistake.',
  },
  'about.how.challenges': {
    pt: 'Nos Desafios você também responde digitando (menos nas Silhuetas no Fácil, com alternativas). Digitar um lugar que não vale como resposta (como Groenlândia ou Inglaterra) não custa nada: o jogo explica o porquê.',
    en: 'In the Challenges you also answer by typing (except in Silhouettes on Easy, with choices). Typing a place that is not a valid answer (like Greenland or England) costs nothing: the game explains why.',
  },
  'about.how.silhouettes': {
    pt: 'Silhuetas: descubra o lugar pelo contorno. No Fácil, você escolhe entre 4 alternativas e o contorno já vem com os arredores. No Médio, digita o nome com o continente (ou a região do Brasil) à vista e tem até 3 dicas por pergunta: arredores, vizinhos e primeira letra; no recorde, com os mesmos acertos, vence a partida com dica em menos perguntas. No Difícil, só o contorno, fora de escala e sem dicas. O mapa mostra só o litoral, sem fronteiras. O contorno é só o território do próprio lugar (a Dinamarca aparece sem a Groenlândia). Ao acertar, ele acende no mapa; ao esgotar as tentativas, a resposta é revelada e conta como erro.',
    en: 'Silhouettes: name the place from its outline. On Easy, you pick one of 4 choices and the outline comes with its surroundings. On Medium, you type the name with the continent (or region of Brazil) shown and have up to 3 hints per question: surroundings, neighbors and first letter; in the record, with the same score, the game with hints in fewer questions wins. On Hard, only the outline, not to scale and with no hints. The map shows only the coast, with no borders. The outline is only the place’s own land (Denmark without Greenland). When you get it right, it lights up on the map; when the attempts run out, the answer is revealed and counts as a mistake.',
  },
  'about.how.neighbors': {
    pt: 'Vizinhos: um lugar fica destacado no mapa e você digita todos os vizinhos terrestres dele. "Desistir da rodada" mostra os que faltaram. No Difícil, o mapa não mostra as fronteiras.',
    en: 'Neighbors: a place is highlighted on the map and you type all of its land neighbors. "Give up the round" shows the ones you missed. On Hard, the map shows no borders.',
  },
  'about.how.trail': {
    pt: 'Trilha: a origem e o destino já vêm dados. Digite, em qualquer ordem, os lugares que os ligam por fronteiras terrestres; você vence quando seus chutes formam um caminho ligado de um ao outro. Cada lugar novo gasta um chute. A cor de cada chute diz se ele está num caminho mínimo (verde, ✓), se é um desvio que ainda cabe nos chutes da partida (laranja, ~) ou se não ajuda (vermelho, ✗). No Fácil o mapa aparece inteiro; no Médio e no Difícil só aparecem a origem, o destino e seus chutes, e o Difícil dá menos chutes. Pode haver lugares proibidos, marcados com ✗: às vezes 1 no Médio, de 1 a 3 no Difícil. Com a opção "Travessias entre ilhas" (na janela de início da Trilha), a trilha também passa por mar. As dicas "Próximo contorno" e "Revelar mapa" não gastam chutes, mas o recorde fica marcado "com dica". O nível é escolhido ao começar a partida.',
    en: 'Trail: the origin and the destination are given. Type, in any order, the places that link them by land borders; you win when your guesses form a connected path from one to the other. Each new place spends a guess. The color of each guess tells whether it is on a shortest path (green, ✓), a detour that still fits the game’s guesses (orange, ~) or of no help (red, ✗). On Easy the whole map is shown; on Medium and Hard only the origin, the destination and your guesses, and Hard gives fewer guesses. Some places may be forbidden, marked with ✗: sometimes 1 on Medium, 1 to 3 on Hard. With the "Sea crossings" option (in the Trail’s start window), the trail also crosses the sea. The "Next outline" and "Reveal map" hints spend no guesses, but the record is marked "with hints". The level is chosen when you start the game.',
  },
  'about.how.proximity': {
    pt: 'Proximidade: ache o lugar secreto. Cada chute ganha uma cor no mapa, de quente (perto) a frio (longe). No Fácil, também aparecem a distância até ele e uma seta na direção dele; no Médio, só a distância; no Difícil, só a cor, escrita em palavras na lista (de "fervendo" a "gelado").',
    en: 'Proximity: find the secret place. Each guess gets a color on the map, from hot (near) to cold (far). On Easy, you also see how far it is and an arrow pointing towards it; on Medium, only the distance; on Hard, only the color, put into words in the list (from "boiling" to "freezing").',
  },
  'about.how.4': {
    pt: 'Arraste para mover o mapa e use a roda do mouse, a pinça ou o toque duplo para aproximar. Ilhas e países pequenos têm uma área de toque maior.',
    en: 'Drag to move the map and use the mouse wheel, pinching or a double tap to zoom. Small islands and countries have a larger touch area.',
  },
  'about.how.5': {
    pt: 'Ao começar um jogo você escolhe Fácil, Médio, Difícil ou Personalizar (cada opção daquele jogo). Nas Configurações ficam o idioma, o tipo de mapa (contínuo ou arredondado), a câmera, os territórios e os sons. A partida em andamento e os recordes ficam salvos neste navegador.',
    en: 'When you start a game you choose Easy, Medium, Hard or Customize (each option of that game). Settings has the language, the map type (continuous or rounded), the camera, the territories and the sounds. The game in progress and your records are saved in this browser.',
  },
  'about.criteria.title': { pt: 'Países e territórios', en: 'Countries and territories' },
  'about.criteria.1': {
    pt: 'Países: os 193 membros da ONU mais Vaticano e Palestina (observadores), 195 no total.',
    en: 'Countries: the 193 UN members plus the Vatican and Palestine (observers), 195 in total.',
  },
  'about.criteria.2': {
    pt: 'Territórios e regiões (Groenlândia, Guiana Francesa, Malvinas, Antártida...): com a opção desligada, contam como parte do país que os administra e a Antártida só aparece no mapa. Ligada, viram alvos próprios e o total passa de 195.',
    en: 'Territories and regions (Greenland, French Guiana, Falkland Islands, Antarctica...): with the option off they count as part of the country that administers them and Antarctica is only shown on the map. With it on they become targets of their own and the total goes above 195.',
  },
  'about.criteria.3': {
    pt: 'Áreas disputadas ficam com o país que as administra hoje, e o cartão de informações menciona a disputa. Kosovo, Somalilândia, Chipre do Norte e Taiwan se governam de forma independente, mas têm reconhecimento contestado; o Saara Ocidental tem status ainda indefinido na ONU. Por isso nenhum deles conta como parte de outro país: com a opção de territórios desligada, não são alvo; ligada, viram alvos próprios.',
    en: 'Disputed areas go to the country that administers them today, and the info card mentions the dispute. Kosovo, Somaliland, Northern Cyprus and Taiwan govern themselves independently but have contested recognition; Western Sahara has a status still undefined at the UN. For that reason none of them counts as part of another country: with the territories option off they are not targets; with it on they become targets of their own.',
  },
  'about.criteria.4': {
    pt: 'Brasil: 26 estados e o Distrito Federal, agrupados nas cinco regiões do IBGE.',
    en: 'Brazil: 26 states and the Federal District, grouped in the five IBGE regions.',
  },
  'about.borders.title': { pt: 'Vizinhança e distâncias', en: 'Neighbors and distances' },
  'about.borders.1': {
    pt: 'Vizinhos são lugares com fronteira terrestre: as formas compartilham um trecho de borda no mapa (encostar num ponto só não conta). Um lugar dentro de outro conta, como o Vaticano e a Itália. Algumas fronteiras reais que o mapa simplificado perde foram repostas à mão, como Espanha e Marrocos (Ceuta e Melilla).',
    en: 'Neighbors are places with a land border: their shapes share a stretch of border on the map (touching at a single point does not count). A place inside another counts, like the Vatican and Italy. A few real borders that the simplified map loses were added back by hand, like Spain and Morocco (Ceuta and Melilla).',
  },
  'about.borders.2': {
    pt: 'Com territórios desligados, um território vale como o país que o administra: a França faz fronteira com o Brasil pela Guiana Francesa, e o jogo explica isso. Na Trilha, essa fronteira só vale se o território estiver no mesmo continente do país (Gibraltar vale; a Guiana Francesa não).',
    en: 'With territories off, a territory counts as the country that administers it: France borders Brazil through French Guiana, and the game explains it. In the Trail, such a border only counts if the territory is on the same continent as the country (Gibraltar does; French Guiana does not).',
  },
  'about.borders.3': {
    pt: 'Na Proximidade, a distância é a menor entre as bordas dos dois lugares, medida sobre o globo com as fronteiras simplificadas do mapa. É aproximada (erro de algumas dezenas de km), por isso aparece arredondada para dezenas de km, e vizinhos aparecem como "vizinho".',
    en: 'In Proximity, the distance is the shortest one between the borders of the two places, measured on the globe with the map’s simplified borders. It is approximate (off by a few tens of km), so it is rounded to tens of km, and neighbors are shown as "neighbor".',
  },
  'about.borders.4': {
    pt: 'Travessias da Trilha (opção): uma ilha se liga aos lugares a até 300 km de litoral a litoral; as que não têm nenhum, ao mais próximo. Duas massas continentais nunca se ligam por mar.',
    en: 'Trail sea crossings (option): an island is linked to the places within 300 km, coast to coast; those with none, to the nearest one. Two continental masses are never linked by sea.',
  },
  'about.maps.title': { pt: 'Projeção do mapa', en: 'Map projection' },
  'about.maps.text': {
    pt: 'No mundo, o Orbis usa projeções de compromisso (Patterson no mapa contínuo e Natural Earth no arredondado), que distorcem bem menos as áreas do que a Mercator. No Brasil, usa uma projeção cônica de áreas iguais. A Mercator não é usada porque infla as regiões perto dos polos e ensinaria tamanhos errados.',
    en: 'For the world, Orbis uses compromise projections (Patterson on the continuous map and Natural Earth on the rounded one), which distort areas far less than Mercator. For Brazil, it uses an equal-area conic projection. Mercator is not used because it inflates regions near the poles and would teach wrong sizes.',
  },
  'about.sources.title': { pt: 'Fontes dos dados', en: 'Data sources' },
  'about.sources.text': {
    pt: 'Os dados geográficos são gerados por um script a partir de bases abertas. As decisões editoriais (grafias corrigidas, apelidos bloqueados e notas sobre áreas disputadas) estão documentadas no repositório.',
    en: 'The geographic data is generated by a script from open datasets. The editorial decisions (corrected spellings, blocked aliases and notes on disputed areas) are documented in the repository.',
  },
  'about.sources.borders': { pt: 'Fronteiras e continentes', en: 'Borders and continents' },
  'about.sources.facts': {
    pt: 'Nomes, capitais, áreas e códigos',
    en: 'Names, capitals, areas and codes',
  },
  'about.sources.states': {
    pt: 'Malha, nomes, siglas e regiões dos estados',
    en: 'State boundaries, names, abbreviations and regions',
  },
  'about.sources.flags': { pt: 'Bandeiras dos países', en: 'Country flags' },
  'about.sources.stateFlags': { pt: 'Bandeiras dos estados', en: 'State flags' },
  'about.sources.licensePD': { pt: 'domínio público', en: 'public domain' },
  'about.sources.licenseIbge': {
    pt: 'dados públicos, fonte: IBGE',
    en: 'public data, source: IBGE',
  },
  'about.sources.licenseFlags': {
    pt: 'domínio público (verificada arquivo a arquivo)',
    en: 'public domain (checked file by file)',
  },
  'about.sources.more': {
    pt: 'Detalhes, versões e o autor de cada bandeira: DATA_SOURCES.md, no repositório do projeto.',
    en: 'Details, versions and the author of each flag: DATA_SOURCES.md, in the project repository.',
  },
  'about.bncc.title': { pt: 'Habilidades da BNCC', en: 'BNCC skills' },
  'about.bncc.intro': {
    pt: 'Habilidades de Geografia da Base Nacional Comum Curricular com as quais o Orbis se relaciona. Códigos e textos copiados do documento oficial do MEC (versão de 2018); a ligação de cada uma com os jogos é uma leitura do projeto.',
    en: 'Geography skills of the Brazilian national curriculum (BNCC) that Orbis relates to. Codes and texts are copied, in Portuguese, from the official MEC document (2018 version); how each one connects to the games is the project’s own reading.',
  },
  'about.bncc.EF04GE05': {
    pt: 'Os jogos do Brasil pedem para localizar e nomear as Unidades da Federação e agrupá-las nas grandes regiões.',
    en: 'The Brazil games ask you to locate and name the states (Unidades da Federação) and group them into the large regions.',
  },
  'about.bncc.EF09GE15': {
    pt: 'O Orbis cobre só a parte das diferentes projeções cartográficas: o mapa mostra na prática como a escolha da projeção muda a aparência das regiões do mundo. Não trabalha com mapas temáticos nem com informações populacionais, econômicas ou socioambientais.',
    en: 'Orbis covers only the part about different cartographic projections: the map shows in practice how the choice of projection changes how world regions look. It does not work with thematic maps or with population, economic or socio-environmental data.',
  },
  'settings.minutes': { pt: 'min', en: 'min' },
} as const;

export type StringKey = keyof typeof STRINGS;
