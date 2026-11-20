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

  // Trail game
  'trail.hardFallback': {
    pt: 'Nível Difícil indisponível na {continent}: jogando no Normal',
    en: 'Hard level not available in {continent}: playing on Normal',
  },
  'trail.placeholder': { pt: 'Digite um lugar…', en: 'Type a place…' },
  'trail.placeholder.states': { pt: 'Digite um estado…', en: 'Type a state…' },
  'trail.goal': { pt: 'Chegue de {a} a {b}', en: 'Get from {a} to {b}' },
  'trail.goalHard': {
    pt: '{a} → {b}, sem passar por {x}',
    en: '{a} → {b}, without crossing {x}',
  },
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
    pt: '{name} é o lugar proibido! Chute gasto.',
    en: '{name} is the forbidden place! Guess spent.',
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
  'trail.hint.map': { pt: 'Revelar mapa', en: 'Reveal map' },
  'trail.hint.map.title': {
    pt: 'Dica: mostra os contornos e as fronteiras do mundo todo até o fim da partida',
    en: 'Hint: shows the outlines and borders of the whole world until the game ends',
  },
  'trail.guesses': { pt: 'Seus chutes', en: 'Your guesses' },
  'trail.none': {
    pt: 'Nenhum chute ainda. Digite um lugar e aperte Enter.',
    en: 'No guesses yet. Type a place and press Enter.',
  },
  'trail.color.near': { pt: 'num caminho mínimo', en: 'on a shortest path' },
  'trail.color.detour': { pt: 'desvio possível', en: 'possible detour' },
  'trail.color.far': { pt: 'não fecha a trilha', en: 'cannot close the trail' },
  'trail.best': { pt: 'Um caminho mínimo:', en: 'A shortest path:' },
  'trail.yours': { pt: 'Seu caminho:', en: 'Your trail:' },
  'trail.legend.yours': { pt: 'Seu caminho (preenchido)', en: 'Your trail (filled)' },
  'trail.legend.best': {
    pt: 'Um caminho mínimo (contorno tracejado)',
    en: 'A shortest path (dashed outline)',
  },
  'trail.legend.ends': { pt: 'Origem e destino', en: 'Origin and destination' },
  'trail.legend.forbidden': { pt: 'Lugar proibido', en: 'Forbidden place' },

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
  'proximity.result': {
    pt: '{name}: {distance} · siga para {dir}',
    en: '{name}: {distance} · head {dir}',
  },
  'proximity.repeat': {
    pt: 'Você já chutou {name}: {distance}.',
    en: 'You already guessed {name}: {distance}.',
  },
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
  'frame.end.trail.guesses': { pt: 'Acabaram os chutes', en: 'Out of guesses' },
  'frame.end.trail.gaveup': { pt: 'Partida encerrada', en: 'Game over' },
  'frame.guess1': { pt: '1 chute', en: '1 guess' },
  'frame.guessesN': { pt: '{n} chutes', en: '{n} guesses' },
  'frame.yourRecordGuesses': {
    pt: 'Seu recorde: {guesses} em {time}',
    en: 'Your record: {guesses} in {time}',
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
  'frame.list': { pt: 'Lista', en: 'List' },
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
  'frame.newRecord': { pt: '★ Novo recorde!', en: '★ New record!' },
  'frame.yourRecord': {
    pt: 'Seu recorde: {found}/{total} em {time}',
    en: 'Your record: {found}/{total} in {time}',
  },
  'frame.yourRecordErrors': {
    pt: 'Seu recorde: {found}/{total}, {errors}, em {time}',
    en: 'Your record: {found}/{total}, {errors}, in {time}',
  },
  'frame.accuracy': {
    pt: 'Precisão: {pct}% ({found} de {attempts} cliques)',
    en: 'Accuracy: {pct}% ({found} of {attempts} clicks)',
  },
  'frame.playAgain': { pt: 'Jogar de novo', en: 'Play again' },
  'frame.menu': { pt: 'Menu', en: 'Menu' },
  'frame.seeMap': { pt: 'Ver mapa', en: 'See map' },
  'frame.seeList': { pt: 'Ver lista', en: 'See list' },

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
  'settings.level': { pt: 'Dificuldade', en: 'Difficulty' },
  'settings.level.hint': {
    pt: 'Ajusta várias opções de uma vez.',
    en: 'Adjusts several options at once.',
  },
  'settings.easy': { pt: 'Fácil', en: 'Easy' },
  'settings.normal': { pt: 'Normal', en: 'Normal' },
  'settings.hard': { pt: 'Difícil', en: 'Hard' },
  'settings.custom': { pt: 'Personalizar', en: 'Customize' },
  'settings.options': { pt: 'Opções', en: 'Options' },
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
    pt: 'Opções marcadas com "próxima partida" mudam as regras e valem a partir da próxima partida; as demais valem na hora.',
    en: 'Options marked "next game" change the rules and apply from the next game; the others apply at once.',
  },
  'settings.hover': { pt: 'Destaque ao passar o mouse', en: 'Highlight on hover' },
  'settings.trailLevel': { pt: 'Nível da Trilha', en: 'Trail level' },
  'settings.trailLevel.hint': {
    pt: 'Fácil: mapa visível. Normal: mapa escondido. Difícil: mapa escondido, um lugar proibido e menos chutes.',
    en: 'Easy: the map is shown. Normal: the map is hidden. Hard: hidden map, a forbidden place and fewer guesses.',
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
    pt: 'Nos jogos de clicar e nas Silhuetas: ao esgotar as tentativas, a resposta é revelada e conta como erro.',
    en: 'In click games and Silhouettes: when the attempts run out, the answer is revealed and counts as a mistake.',
  },
  'settings.timer': { pt: 'Cronômetro', en: 'Timer' },
  'settings.timer.hint': {
    pt: 'Ligado, a partida tem tempo limite; desligado, o tempo apenas conta para cima. Na Trilha e na Proximidade o tempo sempre só conta para cima.',
    en: 'On, the game has a time limit; off, the clock just counts up. In Trail and Proximity the clock always just counts up.',
  },
  'settings.durationWorld': { pt: 'Duração no Mundo (min)', en: 'Time limit, World (min)' },
  'settings.durationContinent': {
    pt: 'Num continente, a duração do Mundo é ajustada em proporção ao número de lugares (mínimo de 2 min).',
    en: 'On a continent, the World time limit is scaled to its number of places (at least 2 min).',
  },
  'settings.durationBrazil': { pt: 'Duração no Brasil (min)', en: 'Time limit, Brazil (min)' },
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
    pt: 'Digitar: escreva o máximo de nomes que lembrar antes do tempo acabar; o que você acerta acende no mapa. Vale português ou inglês, sem se preocupar com acentos. Se um nome for o começo de outro (como Irã e Iraque), aperte Enter para confirmar.',
    en: 'Typing: write as many names as you can before time runs out; what you get right lights up on the map. Portuguese or English both work, accents do not matter. If one name is the beginning of another (like Iran and Iraq), press Enter to confirm.',
  },
  'about.how.3': {
    pt: 'Clicar: a pista (nome, capital ou bandeira) fica na barra superior e você clica no lugar certo. Use "Pular" se não souber. Cada pergunta tem um número de tentativas (nas Configurações); ao esgotá-las, a resposta é revelada no mapa e conta como erro.',
    en: 'Clicking: the clue (name, capital or flag) is in the top bar and you click the right place. Use "Skip" if you do not know. Each question has a number of attempts (in Settings); when they run out, the answer is revealed on the map and counts as a mistake.',
  },
  'about.how.challenges': {
    pt: 'Nos Desafios você também responde digitando. Digitar um lugar que não vale como resposta (como Groenlândia ou Inglaterra) não custa nada: o jogo explica o porquê.',
    en: 'In the Challenges you also answer by typing. Typing a place that is not a valid answer (like Greenland or England) costs nothing: the game explains why.',
  },
  'about.how.silhouettes': {
    pt: 'Silhuetas: aparece só o contorno de um lugar, fora de escala, e você digita o nome. O contorno é só o território do próprio lugar (a Dinamarca aparece sem a Groenlândia). Ao acertar, ele acende no mapa; ao esgotar as tentativas, a resposta é revelada e conta como erro.',
    en: 'Silhouettes: only the outline of a place is shown, not to scale, and you type its name. The outline is only the place’s own land (Denmark without Greenland). When you get it right, it lights up on the map; when the attempts run out, the answer is revealed and counts as a mistake.',
  },
  'about.how.neighbors': {
    pt: 'Vizinhos: um lugar fica destacado no mapa e você digita todos os vizinhos terrestres dele. "Desistir da rodada" mostra os que faltaram.',
    en: 'Neighbors: a place is highlighted on the map and you type all of its land neighbors. "Give up the round" shows the ones you missed.',
  },
  'about.how.trail': {
    pt: 'Trilha: a origem e o destino já vêm dados. Digite, em qualquer ordem, os lugares que os ligam por fronteiras terrestres; você vence quando seus chutes formam um caminho ligado de um ao outro. Cada lugar novo gasta um chute. A cor de cada chute diz se ele está num caminho mínimo (verde, ✓), se é um desvio que ainda cabe nos chutes da partida (laranja, ~) ou se não ajuda (vermelho, ✗). No Fácil o mapa aparece inteiro; no Normal só aparecem a origem, o destino e seus chutes; o Difícil também tem um lugar proibido e menos chutes. As dicas "Próximo contorno" e "Revelar mapa" não gastam chutes, mas o recorde fica marcado "com dica". O nível fica nas Configurações.',
    en: 'Trail: the origin and the destination are given. Type, in any order, the places that link them by land borders; you win when your guesses form a connected path from one to the other. Each new place spends a guess. The color of each guess tells whether it is on a shortest path (green, ✓), a detour that still fits the game’s guesses (orange, ~) or of no help (red, ✗). On Easy the whole map is shown; on Normal only the origin, the destination and your guesses; Hard also has a forbidden place and fewer guesses. The "Next outline" and "Reveal map" hints spend no guesses, but the record is marked "with hints". The level is in Settings.',
  },
  'about.how.proximity': {
    pt: 'Proximidade: ache o lugar secreto. Cada chute mostra a distância até ele, uma seta na direção dele e uma cor no mapa, de quente (perto) a frio (longe).',
    en: 'Proximity: find the secret place. Each guess shows how far it is, an arrow pointing towards it and a color on the map, from hot (near) to cold (far).',
  },
  'about.how.4': {
    pt: 'Arraste para mover o mapa e use a roda do mouse, a pinça ou o toque duplo para aproximar. Ilhas e países pequenos têm uma área de toque maior.',
    en: 'Drag to move the map and use the mouse wheel, pinching or a double tap to zoom. Small islands and countries have a larger touch area.',
  },
  'about.how.5': {
    pt: 'Em Configurações você escolhe Fácil, Normal ou Difícil, liga os sons, troca o idioma e o tipo de mapa (contínuo ou arredondado). A partida em andamento e os recordes ficam salvos neste navegador.',
    en: 'In Settings you choose Easy, Normal or Hard, turn sounds on and switch the language and the map type (continuous or rounded). The game in progress and your records are saved in this browser.',
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
