# Orbis

Minigames didáticos de geografia para aprender e se desafiar: países, capitais, bandeiras, territórios e os estados e capitais do Brasil. O mapa é o protagonista: ao acertar, você aprende de passagem outras informações do lugar (a capital, a bandeira, o continente, a área).

O site é 100% estático: sem backend, sem banco e sem contas. Tudo o que o jogador salva (configurações, partida em andamento, recordes) fica no `localStorage` do próprio navegador.

<!-- PRINTS: adicionar aqui as imagens (menu no desktop, jogo de digitar, jogo de clicar, Brasil no celular). Sugestão: pasta docs/prints/. -->

## O que tem

- **Mapas:** Mundo (195 países, com a opção de incluir territórios) e Brasil (26 estados + Distrito Federal).
- **Cinco jogos em cada mapa:** digitar países (ou estados), digitar capitais, clicar pelo nome, clicar pela capital e clicar pela bandeira.
- **Português e inglês**, com troca na hora; ao digitar valem os dois idiomas.
- **Celular como prioridade:** zoom por pinça, toque duplo para aproximar e áreas de toque ampliadas para microestados e ilhas.
- **Configurações:** atalhos Fácil / Normal / Difícil, cronômetro, tolerância de grafia, sons (gerados por código) e mais.
- **Aba Sobre** dentro do site, com fontes, critérios e habilidades da BNCC.

## Requisitos

- Node.js `^22.22.3`, `^24.15.0` ou `>=26.0.0` (exigido pelo Angular 22; também declarado em `engines` no `package.json`)
- npm 8 ou superior

## Comandos

```bash
npm install                # instala as dependências
npm start                  # servidor de desenvolvimento em http://localhost:4200
npm run build              # build de produção em dist/orbis
npm run lint               # ESLint
npm test -- --watch=false  # testes, uma execução só (sem o --watch=false ficam em modo observação)
npm run format             # formata tudo com Prettier
npm run format:check       # só verifica a formatação
npm run data               # regenera public/data a partir das fontes abertas (usa o cache em scripts/.cache)
npm run data -- --refresh  # idem, baixando tudo de novo (precisa de internet)
```

Depois de regenerar os dados, confira o relatório `scripts/data-report.md` (contagens e casos duvidosos) e rode os testes, que validam os arquivos gerados.

## Como funciona

- **Angular 22** (componentes standalone, signals, rotas carregadas sob demanda, TypeScript estrito) e **Tailwind CSS v4**.
- **Mapas:** D3 (`d3-geo`, `d3-geo-projection`) e TopoJSON, desenhados em SVG. Nunca Mercator, que distorce as áreas.
  - Mundo **contínuo** (padrão): projeção Patterson, que se repete na horizontal, então dá para arrastar para leste ou oeste sem fim.
  - Mundo **arredondado**: projeção Natural Earth, o mapa-múndi clássico. A escolha fica nas configurações.
  - **Brasil:** projeção cônica de áreas iguais, com o enquadramento calculado a partir da geometria dos estados e os países vizinhos só como contexto. Os arquivos do Brasil só são baixados quando essa camada é usada.
- **Um jogo = camada de mapa + tipo de pista + tipo de resposta.** Mapa, moldura de jogo (tempo, placar, progresso, pausa, desistir, reiniciar, tela final), cartão de informações e painel de configurações são compartilhados pelos cinco jogos.
- **Idiomas:** tradução em tempo de execução (a i18n nativa do Angular gera um build por idioma). Textos da interface em `src/app/core/i18n/strings.ts`; nomes de lugares vêm dos dados, já em português e inglês.
- **Salvamento local:** um F5 retoma a partida de onde parou (pausada) e o melhor resultado de cada modo fica guardado, por mapa.

### Jogos

- **Digitar** (países/estados e capitais): digite o máximo possível antes de o tempo acabar. Acertos acendem no mapa e na lista por continente (ou região do Brasil). Vale português ou inglês, sem se preocupar com acentos, maiúsculas, hífens ou espaços.
  - O nome (ou apelido) inteiro e exato conta na hora. Se ele também é o começo do nome de outro lugar ainda não acertado ("Irã" → "Iraque"), confirme com **Enter**. O Enter também perdoa erros leves de grafia, mas recusa se o erro servir para dois lugares (Gâmbia/Zâmbia).
- **Clicar** (nome, capital ou bandeira): a pergunta fica na barra superior e você clica no lugar certo. Há placar de acertos e erros, botão **Pular**, modo aprender (ao errar mostra o lugar clicado) e revelação da resposta após N erros.
- Pausar, Reiniciar e Desistir ficam sempre na barra superior; sair com progresso pede confirmação.

### Configurações

Menu → **Configurações**. Tudo é salvo só neste navegador; o que muda as regras do jogo vale a partir da próxima partida.

| Opção                       | Fácil     | Normal                      | Difícil                     |
| --------------------------- | --------- | --------------------------- | --------------------------- |
| Cronômetro                  | desligado | 15 min Mundo / 5 min Brasil | 10 min Mundo / 3 min Brasil |
| Tolerância de grafia        | alta      | normal                      | nenhuma                     |
| Cartão de informações       | sim       | sim                         | não                         |
| Modo aprender               | sim       | sim                         | não                         |
| Revelar após erros          | 2         | 3                           | nunca                       |
| Destaque ao passar o mouse  | sim       | sim                         | não                         |
| Nomes dos acertados no mapa | sim       | não                         | não                         |

"Personalizar" mostra cada chave. Idioma, projeção do mapa, **Sons** (desligados por padrão) e **Incluir territórios** (desligado por padrão) são preferências à parte e não mudam com os atalhos. No mapa do Brasil a opção de territórios fica desativada, com uma explicação, porque lá os alvos são só os estados.

## Critérios de países e territórios

- **Países:** os 193 membros da ONU + Vaticano + Palestina (observadores) = 195.
- **Territórios e regiões:** áreas com código ISO 3166-1 próprio que não são um dos 195 (Groenlândia, Guiana Francesa, Malvinas, Antártida...), mais Kosovo, Somalilândia e Chipre do Norte.
  - Opção **desligada** (padrão): só os 195 países são alvos e cada território conta como parte do país que o administra (clicar na Groenlândia = clicar na Dinamarca). A Antártida e as áreas que nenhum país administra aparecem no mapa, mas não são alvo.
  - Opção **ligada**: os territórios viram alvos próprios (inclusive a Antártida) e o total passa de 195.
- **Áreas disputadas:** ficam com o país que as administra hoje, e a cartão de informações menciona a disputa (por exemplo, Malvinas).
- **Exceção:** Kosovo, Somalilândia, Chipre do Norte e Taiwan se governam de forma independente, mas têm reconhecimento contestado; o Saara Ocidental tem status ainda indefinido na ONU. Por isso nenhum deles conta como parte de outro país: com a opção de territórios desligada não são alvo; ligada, viram alvos próprios, e a cartão explica o status de cada um.
- **Mais de uma capital** (Bolívia, África do Sul...): qualquer uma é aceita e todas são mostradas.
- **Nomes repetidos** entre territórios levam o país administrador entre parênteses, por exemplo "São Martinho (França)".
- **Brasil:** 26 estados + Distrito Federal, agrupados nas cinco regiões do IBGE.
- Cada exceção e sua justificativa estão em [scripts/decisions.json](scripts/decisions.json).

## Fontes dos dados

Os dados geográficos em `public/data/` são gerados por `npm run data` a partir de bases abertas (Natural Earth, Wikidata, IBGE, flag-icons e Wikimedia Commons). Fontes, versões e licenças de cada dado estão em [DATA_SOURCES.md](DATA_SOURCES.md).

## Estrutura

- `src/app/core/`: serviços e lógica compartilhada (dados, i18n, configurações, regras dos jogos, salvamento, recordes, sons)
- `src/app/shared/`: componentes reutilizáveis (mapa, moldura de jogo, cartão, configurações, barra superior)
- `src/app/pages/`: páginas, carregadas sob demanda (menu, jogos de digitar e de clicar, Sobre)
- `public/data/`: dados estáticos gerados (não editar à mão)
- `scripts/`: script que gera os dados (`build-data.mjs`) e as decisões editoriais (`decisions.json`)
