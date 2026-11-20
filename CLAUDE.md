# Regras de trabalho

- O dono do projeto é iniciante no Claude Code.
- NUNCA execute comandos git (init, add, commit, tag, branch, checkout, reset, push etc.) nem nada no GitHub. O controle de versão é do dono. Você pode e deve criar e editar arquivos como o .gitignore.
- Tudo é LOCAL. Não configure publicação nem hospedagem.
- Faça só o que foi pedido e pare. Não adicione funcionalidades fora do escopo. Se faltar uma decisão que mude comportamento ou visual, pergunte.
- Código simples, legível e bem formatado, sem abstrações desnecessárias; comentários só onde o "porquê" não for óbvio.
- Ao fim de cada tarefa: confirme que build, lint e testes passam e dê um relatório CURTO (o que mudou, como verificar, pendências). Sem tutoriais.

# O projeto

Orbis: site estático de minigames didáticos de geografia (países, capitais, bandeiras, territórios, estados e capitais do Brasil), em dois mapas (Mundo e Brasil) e nove jogos. O mapa é o protagonista e o jogador aprende de passagem informações de outros lugares. Visual e jogabilidade inspirados em blind-map.eu (apenas inspiração: não copiar código, imagens nem dados).

# Convenções

- **Stack:** Angular (standalone, signals, controle de fluxo novo, rotas lazy, TypeScript estrito), Tailwind CSS v4, D3 (`d3-geo`, `d3-geo-projection`) + TopoJSON em SVG, ESLint + Prettier, testes com o runner padrão do Angular. Sem backend, banco ou contas.
- **Mapas:** nunca Mercator. Mundo em Patterson (contínuo) ou Natural Earth; Brasil em cônica de áreas iguais, com enquadramento calculado da geometria dos estados.
- **Dados:** NUNCA escrever dado geográfico de memória. Tudo em `public/data/` vem de `npm run data` (bases abertas). Registrar fonte e licença de cada dado em `DATA_SOURCES.md`. Decisões editoriais ficam em `scripts/decisions.json`, com justificativa.
- **Países e territórios:** 195 países (193 ONU + Vaticano + Palestina). Territórios só viram alvo com a opção ligada (só no Mundo). Disputas: vale o país que administra hoje. Critério completo no README.
- **Idiomas:** português (padrão) e inglês, tradução em tempo de execução (`src/app/core/i18n/strings.ts`); não usar a i18n nativa do Angular. Todo texto novo precisa dos dois idiomas. Dados e digitação aceitam os dois.
- **Salvamento:** só `localStorage` (configurações, partida em andamento, recordes).
- **Interface:** mapa em tela cheia sempre; o menu é um painel flutuante sobre o mapa (no celular, abas "Mapa" e "Desafios", um grupo por vez). Mesmas cores, fontes e animações em todos os jogos (tokens em `src/styles.css`). Feedback nunca só por cor (usar também contorno, ícone ou animação). Celular é prioridade. Teclado e leitores de tela onde fizer sentido.
- **Jogos:** um jogo = camada de mapa + tipo de pista + tipo de resposta, sobre componentes compartilhados (mapa, moldura de jogo, cartão, configurações). Novos jogos devem reaproveitá-los. Os nove jogos, nos dois grupos do menu (todos funcionam também no mapa do Brasil, com os estados):
  - **Mapa:** digitar países, digitar capitais, clicar pelo nome, clicar pela capital, clicar pela bandeira.
  - **Desafios** (resposta digitada): Silhuetas, Vizinhos, Trilha e Proximidade. Linhas de texto da barra superior usam `bar-line` (largura total no celular) e botões próprios do jogo vão no slot `gameAction` da moldura (no celular, os que não cabem vão para o menu "⋯" pela entrada `moreActions`).
- **Trilha:** uma entrada no menu; o nível (Fácil, Normal, Difícil) é a configuração `trailLevel`, ajustada pelos atalhos e marcada "próxima partida". Origem e destino dados; chutes em qualquer ordem; vence quando os chutes ligam origem e destino pelo grafo da Trilha. Cores pelo total de chutes (`trailColor` em `trail-graph.ts`: verde = caminho mínimo, laranja = caminho simples passando pelo lugar que cabe no total, vermelho = resto; no Difícil, tudo evitando o proibido). Normal e Difícil escondem o mapa. No Difícil, numa região sem lugar que possa ser proibido (América do Norte), a partida roda no Normal com aviso (`playableTrailLevel` em `availability.ts`) e grava recorde Normal. Nomes: origem e destino sempre; os demais pela regra por área de `mapLabel`. Dicas "Próximo contorno" e "Revelar mapa" marcam a partida "com dica", que sempre perde no recorde para uma sem dica. Recordes por nível (`trailRecordId`; Normal e Difícil reaproveitam as chaves antigas `trilha` e `trilha-dificil`); a rota antiga `jogo/trilha-dificil` redireciona.
- **Por continente:** no Mundo, o usuário escolhe "Mundo todo" ou um continente (América Central e Caribe contam como América do Norte). Vale para todos os jogos do mundo; recordes e partidas salvas são separados por continente, e o tempo limite é proporcional ao número de lugares. O Brasil não tem filtro. Vizinhos e Trilha ficam desabilitados numa região com poucas fronteiras terrestres (`core/game/availability.ts`).
- **Câmera:** `MapStateService.flyTo(ids)` leva o mapa a um lugar (enquadra só as partes principais, respeita o movimento reduzido e painéis marcados com `data-map-cover`). Os jogos usam `focusOn`/`pick` (`pages/game-page.ts`) só ao revelar resposta, começar rodada do Vizinhos ou partida da Trilha (origem e destino), mostrar o fim da Trilha ou clicar em item de lista; nunca a cada acerto do jogo de digitar.
- **Aparência do mapa:** nunca usar hachura (`pattern`) nem tracejado em muitos elementos: deixam o zoom lento. Não respondido = creme, acertado = verde-azulado, faltante/revelado = terracota sólido (`--color-missed`, claridade entre os dois) com contorno contínuo; o país proibido da Trilha é o mesmo terracota com um ✗. Preenchimento sempre pela forma (`shape.d`); o contorno sem emenda (`withoutSeams`) é linha aberta e só serve para traço; o que está fora da região fica no tom `--color-land-outside`; a Proximidade usa a escala `--color-heat-*` (uma cor, ponta clara escurecida para se separar da terra) com contorno em todo lugar chutado, só na parte principal (`mainParts` no mapa, a mesma regra da câmera); a Trilha usa `--color-trail-*` (verde, laranja e vermelho distintos também na claridade, conferidos com simulação de protanopia/deuteranopia; origem e destino em azul), um path de contorno por cor com padrão próprio (contínuo, tracejado, pontilhado) e o mapa escondido (`MapStateService.hidden`: só a água e o que o jogo pinta). Ícones: Lucide, em `shared/ui/game-icon.component.ts`, um por jogo (os nove são distintos) e engrenagem/"info" no cabeçalho do menu (Configurações e Sobre são botões de ícone ao lado do nome Orbis).
- **Vizinhança e distância:** vizinhos são só fronteiras terrestres, calculadas da topologia do mapa, respeitando a regra de territórios (`extraNeighbors` e `trailExcludedBorders` em `decisions.json`). Distâncias geodésicas entre bordas, direções e o grafo da Trilha são gerados por `scripts/proximity.mjs` (parte do `npm run data`, ou sozinho com `npm run data:proximity`) em `public/data/` (`neighbors.json`, `proximity-*.json`); na tela, distâncias aproximadas em dezenas de km. Lugares com contorno degenerado ficam fora das Silhuetas (`scripts/silhouettes.mjs`, `silhouette-excluded.json`).
- **BNCC:** usar só códigos e textos oficiais; o que não puder ser confirmado fica marcado "a revisar".
- **Testes:** os que sorteiam usam `seededRandom` (`core/game/test-targets.ts`), nunca `Math.random`. Só onde valem a pena (normalização de respostas, pontuação e progresso, regra de territórios, validação dos dados gerados, vizinhança e distâncias, contornos das Silhuetas).
- **Fora do escopo:** exploração por camadas, contas, questões de vestibular, música.

# Estrutura

- `src/app/core/`: serviços e lógica compartilhada (`data/`, `game/`, `i18n/`, configurações, sons)
- `src/app/shared/`: componentes reutilizáveis (mapa, moldura de jogo, cartão, configurações, barra superior, `ui/`)
- `src/app/pages/`: páginas lazy (menu, jogos de digitar e de clicar, Silhuetas, Vizinhos, Trilha, Proximidade, Sobre)
- `public/data/`: dados gerados (não editar à mão)
- `scripts/`: gerador dos dados (`build-data.mjs`, `proximity.mjs`, `silhouettes.mjs`) e `decisions.json`

# Comandos

- `npm start`: desenvolvimento em http://localhost:4200
- `npm run build`: build de produção
- `npm run lint`
- `npm test -- --watch=false`
- `npm run format` / `npm run format:check`
- `npm run data` (cache em `scripts/.cache`) / `npm run data -- --refresh`
- `npm run data:proximity` (só vizinhos e distâncias, sem baixar nada)
- Node: `^22.22.3`, `^24.15.0` ou `>=26.0.0`
