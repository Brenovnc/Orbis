// Generates every static data file in public/data from open sources.
// Usage: npm run data            (uses the download cache in scripts/.cache)
//        npm run data -- --refresh (downloads everything again)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBrazil } from './brazil.mjs';
import { buildProximity } from './proximity.mjs';
import { buildSilhouetteExclusions } from './silhouettes.mjs';
import { buildWorld } from './world.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'data');
const decisions = JSON.parse(readFileSync(join(root, 'scripts', 'decisions.json'), 'utf8'));

const report = {
  continentFallbacks: [],
  missingFlags: [],
  ptFromEnglish: [],
  nameChoices: [],
  disambiguated: [],
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'flags', 'world'), { recursive: true });
mkdirSync(join(outDir, 'flags', 'br'), { recursive: true });

const world = await buildWorld({ outDir, decisions, report });
const brazil = await buildBrazil({ outDir, report });

const writeJson = (name, data) =>
  writeFileSync(join(outDir, name), JSON.stringify(data, null, 1) + '\n');
writeJson('countries.json', world.countries);
writeJson('territories.json', world.territories);
writeJson('non-targets.json', world.nonTargets);
writeJson('states.json', brazil.states);
writeJson('regions-br.json', brazil.regions);
writeJson('flags/attributions.json', [...world.flagAttributions, ...brazil.flagAttributions]);
writeJson('meta.json', { generatedAt: new Date().toISOString().slice(0, 10) });

const proximity = buildProximity(outDir, decisions);
const silhouettes = buildSilhouetteExclusions(outDir);
writeFileSync(
  join(root, 'scripts', 'data-report.md'),
  renderReport(world, brazil, proximity.closePairs, silhouettes),
);
console.log(
  `Pronto: ${world.countries.length} países, ${world.territories.length} territórios, ${brazil.states.length} UFs.`,
);
console.log('Relatório em scripts/data-report.md');

function renderReport(world, brazil, closePairs, silhouettes) {
  const list = (items) => (items.length ? items.map((i) => `- ${i}`).join('\n') : '- (nenhum)');
  const names = new Map(
    [...world.countries, ...world.territories, ...brazil.states].map((x) => [x.id, x.name.pt]),
  );
  const noSilhouette = [...silhouettes.world, ...silhouettes.brazil].map((s) => {
    const why = [
      s.reasons.includes('area') &&
        `área de ${s.areaKm2} km² (menos de ${silhouettes.minAreaKm2} km²)`,
      s.reasons.includes('points') &&
        `${s.points} pontos no contorno (menos de ${silhouettes.minPoints})`,
    ].filter(Boolean);
    return `${s.id} ${names.get(s.id) ?? '(sem alvo)'}: ${why.join('; ')}`;
  });
  const multiCapital = [...world.countries, ...world.territories, ...brazil.states]
    .filter((x) => x.capitals.length > 1)
    .map((x) => `${x.id}: ${x.capitals.map((c) => c.name.pt).join(', ')}`);
  const noCapital = [...world.countries, ...world.territories]
    .filter((x) => x.capitals.length === 0)
    .map((x) => x.id);
  const noArea = [...world.countries, ...world.territories]
    .filter((x) => x.areaKm2 === null)
    .map((x) => x.id);
  const claimed = [...world.countries, ...world.territories]
    .filter((x) => x.claimedBy.length)
    .map(
      (x) =>
        `${x.id} (${x.name.pt}): reivindicado por ${x.claimedBy.map((c) => c.country ?? c.name.pt).join(', ')}`,
    );
  const territories = world.territories.map(
    (t) =>
      `${t.id} ${t.name.pt} / ${t.name.en} — administrado por ${t.administeredBy ?? 'ninguém (nunca alvo com territórios desligados)'}`,
  );
  const amb = report.ambiguous;
  return `# Relatório da geração de dados (gerado automaticamente)

Gerado em ${new Date().toISOString().slice(0, 10)} por \`npm run data\`.

## Contagens
- Membros da ONU encontrados: ${report.unMembers}
- Países (ONU + observadores): ${world.countries.length}
- Territórios: ${world.territories.length}
- Feições no mapa do mundo: ${report.world.features} (${Math.round(report.world.topoBytes / 1024)} KB)
- UFs do Brasil: ${brazil.states.length} (mapa: ${Math.round(report.brazil.topoBytes / 1024)} KB)

## Mais de uma capital
${list(multiCapital)}

## Sem capital
${list(noCapital)}

## Sem área
${list(noArea)}

## Sem bandeira
${list(report.missingFlags)}

## Grafias em português escolhidas em decisions.json
${list(report.nameChoices)}

## Sem nome em português no Wikidata (usado o nome em inglês)
${list(report.ptFromEnglish)}

## Continente pela região da ONU (Natural Earth: "Seven seas")
${list(report.continentFallbacks)}

## Áreas sem dono no mapa (nunca são alvo)
${list(report.world.neutral)}

## Reivindicações (Wikidata P1336)
${list(claimed)}

## Territórios
${list(territories)}

## Nomes de países repetidos (deve ficar vazio depois da desambiguação)
${list(amb.placeNames.primaryCollisions.map(([k, ids]) => `"${k}": ${ids.join(', ')}`))}

## Capitais com o mesmo nome
${list(amb.capitalCollisions.map(([k, ids]) => `"${k}": ${ids.join(', ')} (no jogo de digitar, marca todos)`))}

## Nomes desambiguados com o país administrador
${list(report.disambiguated)}

## Apelidos de países removidos por ambiguidade
${list([...amb.placeNames.removed, ...report.brazilAmbiguous.ambiguousNames.removed])}

## Fora das Silhuetas (contorno degenerado na resolução do mapa; não são sorteados)
${list(noSilhouette)}

## Pares a menos de 10 km que não são vizinhos (candidatos a extraNeighbors em decisions.json)
${list(closePairs)}
`;
}
