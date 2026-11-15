# Regras de trabalho

- O dono do projeto é iniciante no Claude Code.
- NUNCA execute comandos git (init, add, commit, tag, branch, checkout, reset, push etc.) nem nada no GitHub. O controle de versão é do dono. Você pode e deve criar e editar arquivos como o .gitignore.
- Tudo é LOCAL. Não configure publicação nem hospedagem.
- Faça só o que foi pedido e pare. Não adicione funcionalidades fora do escopo. Se faltar uma decisão que mude comportamento ou visual, pergunte.
- Código simples, legível e bem formatado, sem abstrações desnecessárias; comentários só onde o "porquê" não for óbvio.
- Ao fim de cada tarefa: confirme que build, lint e testes passam e dê um relatório CURTO (o que mudou, como verificar, pendências). Sem tutoriais.

# O projeto

Orbis: site estático de minigames didáticos de geografia (países, capitais, bandeiras, territórios, estados e capitais do Brasil). O mapa é o protagonista e o jogador aprende de passagem informações de outros lugares. Visual e jogabilidade inspirados em blind-map.eu (apenas inspiração: não copiar código, imagens nem dados).

# Convenções

- **Stack:** Angular (standalone, signals, controle de fluxo novo, rotas lazy, TypeScript estrito), Tailwind CSS v4, D3 (`d3-geo`, `d3-geo-projection`) + TopoJSON em SVG, ESLint + Prettier, testes com o runner padrão do Angular. Sem backend, banco ou contas.
- **Mapas:** nunca Mercator. Mundo em Patterson (contínuo) ou Natural Earth; Brasil em cônica de áreas iguais, com enquadramento calculado da geometria dos estados.
- **Dados:** NUNCA escrever dado geográfico de memória. Tudo em `public/data/` vem de `npm run data` (bases abertas). Registrar fonte e licença de cada dado em `DATA_SOURCES.md`. Decisões editoriais ficam em `scripts/decisions.json`, com justificativa.
- **Países e territórios:** 195 países (193 ONU + Vaticano + Palestina). Territórios só viram alvo com a opção ligada (só no Mundo). Disputas: vale o país que administra hoje. Critério completo no README.
- **Idiomas:** português (padrão) e inglês, tradução em tempo de execução (`src/app/core/i18n/strings.ts`); não usar a i18n nativa do Angular. Todo texto novo precisa dos dois idiomas. Dados e digitação aceitam os dois.
- **Salvamento:** só `localStorage` (configurações, partida em andamento, recordes).
- **Interface:** mapa em tela cheia sempre; o menu é um painel flutuante sobre o mapa. Mesmas cores, fontes e animações em todos os jogos (tokens em `src/styles.css`). Feedback nunca só por cor (usar também contorno, ícone ou animação). Celular é prioridade. Teclado e leitores de tela onde fizer sentido.
- **Jogos:** um jogo = camada de mapa + tipo de pista + tipo de resposta, sobre componentes compartilhados (mapa, moldura de jogo, cartão, configurações). Novos jogos devem reaproveitá-los.
- **BNCC:** usar só códigos e textos oficiais; o que não puder ser confirmado fica marcado "a revisar".
- **Testes:** só onde valem a pena (normalização de respostas, pontuação e progresso, regra de territórios, validação dos dados gerados).
- **Fora do escopo da v1:** trilha por fronteiras, proximidade em km, exploração por camadas, contas, questões de vestibular, música.

# Estrutura

- `src/app/core/`: serviços e lógica compartilhada (`data/`, `game/`, `i18n/`, configurações, sons)
- `src/app/shared/`: componentes reutilizáveis (mapa, moldura de jogo, cartão, configurações, barra superior, `ui/`)
- `src/app/pages/`: páginas lazy (menu, jogos de digitar e de clicar, Sobre)
- `public/data/`: dados gerados (não editar à mão)
- `scripts/`: gerador dos dados e `decisions.json`

# Comandos

- `npm start`: desenvolvimento em http://localhost:4200
- `npm run build`: build de produção
- `npm run lint`
- `npm test -- --watch=false`
- `npm run format` / `npm run format:check`
- `npm run data` (cache em `scripts/.cache`) / `npm run data -- --refresh`
- Node: `^22.22.3`, `^24.15.0` ou `>=26.0.0`
