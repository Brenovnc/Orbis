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

  // Top bar and frame
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
  'typing.miss': { pt: 'Não encontrei. Tente de novo.', en: 'Not found. Try again.' },
  'click.whereIs': { pt: 'Onde fica', en: 'Where is' },
  'click.capitalOf': { pt: 'De qual país é a capital', en: 'Which country has the capital' },
  'click.whichFlag': { pt: 'De qual país é esta bandeira?', en: 'Which country has this flag?' },
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
    pt: 'Ao errar um clique, mostra o nome e os dados do lugar clicado.',
    en: 'After a wrong click, shows the name and facts of the place you clicked.',
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
  'settings.names': { pt: 'Nomes dos acertados no mapa', en: 'Names of found places on the map' },
  'settings.names.hint': {
    pt: 'Escreve o nome sobre o lugar acertado (mais nomes aparecem ao aproximar).',
    en: 'Writes the name over each found place (more names appear as you zoom in).',
  },
  'settings.reveal': {
    pt: 'Revelar a resposta após erros',
    en: 'Reveal the answer after mistakes',
  },
  'settings.reveal.hint': {
    pt: 'Nos jogos de clicar: quantos cliques errados na mesma pergunta antes de mostrar a resposta.',
    en: 'In click games: how many wrong clicks on one question before the answer is shown.',
  },
  'settings.never': { pt: 'Nunca', en: 'Never' },
  'settings.timer': { pt: 'Cronômetro', en: 'Timer' },
  'settings.timer.hint': {
    pt: 'Ligado, a partida tem tempo limite; desligado, o tempo apenas conta para cima.',
    en: 'On, the game has a time limit; off, the clock just counts up.',
  },
  'settings.durationWorld': { pt: 'Duração no Mundo (min)', en: 'Time limit, World (min)' },
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
    pt: 'Escolha o mapa (Mundo ou Brasil) e um dos cinco jogos no menu.',
    en: 'Pick the map (World or Brazil) and one of the five games in the menu.',
  },
  'about.how.2': {
    pt: 'Digitar: escreva o máximo de nomes que lembrar antes do tempo acabar; o que você acerta acende no mapa. Vale português ou inglês, sem se preocupar com acentos. Se um nome for o começo de outro (como Irã e Iraque), aperte Enter para confirmar.',
    en: 'Typing: write as many names as you can before time runs out; what you get right lights up on the map. Portuguese or English both work, accents do not matter. If one name is the beginning of another (like Iran and Iraq), press Enter to confirm.',
  },
  'about.how.3': {
    pt: 'Clicar: a pista (nome, capital ou bandeira) fica na barra superior e você clica no lugar certo. Use "Pular" se não souber.',
    en: 'Clicking: the clue (name, capital or flag) is in the top bar and you click the right place. Use "Skip" if you do not know.',
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
