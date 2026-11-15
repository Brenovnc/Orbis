# Fontes dos dados

Todos os arquivos em `public/data/` são gerados por `npm run data` (script em `scripts/`). As decisões editoriais (agrupamentos, grafias corrigidas, apelidos bloqueados, notas sobre áreas disputadas, apelidos editoriais, partes do Reino Unido e frases de erro, nota sobre Jerusalém) estão em [scripts/decisions.json](scripts/decisions.json), cada uma com justificativa.

| Dado                                                                                                        | Fonte                                                                                                                                                                                          | Licença                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Fronteiras do mundo, continentes, ligação de cada área com o Wikidata                                       | [Natural Earth](https://www.naturalearthdata.com/) v5.1.2, camadas `admin_0_map_units` (1:10m) e `lakes` (1:110m), via [natural-earth-vector](https://github.com/nvkelso/natural-earth-vector) | Domínio público ([termos](https://www.naturalearthdata.com/about/terms-of-use/))                                                               |
| Lista de membros da ONU, nomes (pt/en), apelidos, capitais, áreas, códigos ISO, reivindicações territoriais | [Wikidata](https://www.wikidata.org/) (SPARQL e API `wbgetentities`)                                                                                                                           | CC0 1.0 ([termos](https://www.wikidata.org/wiki/Wikidata:Licensing))                                                                           |
| Malha das unidades da federação, nomes oficiais, siglas, regiões e áreas dos estados                        | [IBGE: API de serviços de dados](https://servicodados.ibge.gov.br/api/docs) (localidades v1, malhas v3)                                                                                        | Dados públicos, uso livre com citação da fonte "IBGE" (ver nota abaixo)                                                                        |
| Bandeiras dos países e territórios                                                                          | [flag-icons](https://github.com/lipis/flag-icons) v7.6.0                                                                                                                                       | MIT (aviso em `public/data/flags/world/LICENSE-flag-icons.txt`)                                                                                |
| Bandeiras dos estados brasileiros, da Somalilândia e de Chipre do Norte                                     | [Wikimedia Commons](https://commons.wikimedia.org/) (arquivo indicado na propriedade P41 do Wikidata)                                                                                          | Verificada arquivo a arquivo pelo script; todas em domínio público. Autor, licença e link de cada uma em `public/data/flags/attributions.json` |

Ferramentas usadas só na geração (não vão para o site): [mapshaper](https://github.com/mbloch/mapshaper) (MPL-2.0), que simplifica as fronteiras, e [SVGO](https://github.com/svg/svgo) (MIT), que enxuga as bandeiras dos estados.

As bandeiras dos estados são otimizadas pelo script: o SVGO remove metadados e arredonda coordenadas (sem mudar o desenho), e todo arquivo termina com `viewBox`. O tamanho total caiu de 1,3 MB para cerca de 650 KB; as mais pesadas (Alagoas e Rio de Janeiro, com brasão) ficam em torno de 140 KB. Cada bandeira só é baixada quando aparece na tela.

## Notas

- **IBGE:** a documentação da API não traz um texto de licença. A política mais citada, registrada pela comunidade OpenStreetMap a partir de um comunicado do IBGE ([página](https://wiki.openstreetmap.org/Pt-br:Tag:source=IBGE)), é que os dados do IBGE são de domínio público, com a exigência de citar a fonte como "IBGE". A fonte é citada aqui e na aba Sobre do site.
- **Natural Earth:** usa o ponto de vista "padrão" dele (por exemplo, Gaza e Cisjordânia aparecem sob soberania de Israel). O script corrige isso pela lista de países: a Palestina é um dos 195.
- **Wikidata:** o conteúdo muda com o tempo. As respostas baixadas ficam em `scripts/.cache` (fora do controle de versão). `npm run data -- --refresh` baixa tudo de novo; o relatório `scripts/data-report.md` mostra o que mudou de interessante.

## BNCC (aba Sobre)

Códigos e textos das habilidades de Geografia exibidos na aba Sobre foram copiados do documento oficial do MEC: [BNCC, Educação Infantil e Ensino Fundamental, versão final (2018)](https://basenacionalcomum.mec.gov.br/). Documento público do governo brasileiro; o texto aparece em português nos dois idiomas. A relação de cada habilidade com os jogos é leitura do projeto e está marcada "a revisar".

## Ícones

O ícone de engrenagem da barra superior dos jogos é o "settings" do [Lucide](https://lucide.dev/) (licença ISC, © Lucide Contributors; partes © Cole Bemis, MIT, do Feather). Só o SVG desse ícone foi copiado, de `lucide-static` 0.468.0, sem a biblioteca. Licença: <https://github.com/lucide-icons/lucide/blob/main/LICENSE>.

> ISC License. Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022. Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
