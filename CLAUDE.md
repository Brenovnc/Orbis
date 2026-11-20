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
- **Interface:** mapa em tela cheia sempre; o menu é um painel flutuante sobre o mapa. Mesmas cores, fontes e animações em todos os jogos (tokens em `src/styles.css`). Feedback nunca só por cor (usar também contorno, ícone ou animação). Celular é prioridade. Teclado e leitores de tela onde fizer sentido.
- **Jogos:** um jogo = camada de mapa + tipo de pista + tipo de resposta, sobre componentes compartilhados (mapa, moldura de jogo, cartão, configurações). Novos jogos devem reaproveitá-los. Os nove jogos, nos dois grupos do menu (todos funcionam também no mapa do Brasil, com os estados):
  - **Mapa:** digitar países, digitar capitais, clicar pelo nome, clicar pela capital, clicar pela bandeira.
  - **Desafios** (resposta digitada): Silhuetas, Vizinhos, Trilha (níveis Normal e Difícil, duas entradas no menu) e Proximidade. Linhas de texto da barra superior usam `bar-line` (largura total no celular) e botões próprios do jogo vão no slot `gameAction` da moldura.
- **Por continente:** no Mundo, o usuário escolhe "Mundo todo" ou um continente (América Central e Caribe contam como América do Norte). Vale para todos os jogos do mundo; recordes e partidas salvas são separados por continente, e o tempo limite é proporcional ao número de lugares. O Brasil não tem filtro. Vizinhos e Trilha ficam desabilitados numa região com poucas fronteiras terrestres (`core/game/availability.ts`).
- **Vizinhança e distância:** vizinhos são só fronteiras terrestres, calculadas da topologia do mapa, respeitando a regra de territórios (`extraNeighbors` e `trailExcludedBorders` em `decisions.json`). Distâncias geodésicas entre bordas, direções e o grafo da Trilha são gerados por `scripts/proximity.mjs` (parte do `npm run data`, ou sozinho com `npm run data:proximity`) em `public/data/` (`neighbors.json`, `proximity-*.json`); na tela, distâncias aproximadas em dezenas de km. Lugares com contorno degenerado ficam fora das Silhuetas (`scripts/silhouettes.mjs`, `silhouette-excluded.json`).
- **BNCC:** usar só códigos e textos oficiais; o que não puder ser confirmado fica marcado "a revisar".
- **Testes:** só onde valem a pena (normalização de respostas, pontuação e progresso, regra de territórios, validação dos dados gerados, vizinhança e distâncias, contornos das Silhuetas).
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
