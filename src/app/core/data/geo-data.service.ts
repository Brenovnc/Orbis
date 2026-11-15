import { Injectable, computed, signal } from '@angular/core';
import type { GeometryCollection, Topology } from 'topojson-specification';
import {
  BrazilRegion,
  BrazilState,
  Country,
  NonTargetsData,
  Place,
  Territory,
  WorldUnitProperties,
} from './geo-data.models';

export type BrazilTopology = Topology<{ states: GeometryCollection<{ id: string }> }>;

export type WorldTopology = Topology<{
  units: GeometryCollection<WorldUnitProperties>;
  lakes: GeometryCollection;
}>;

/** Loads the static world data once and shares it with the whole app. */
@Injectable({ providedIn: 'root' })
export class GeoDataService {
  readonly world = signal<WorldTopology | null>(null);
  readonly countries = signal<Country[]>([]);
  readonly territories = signal<Territory[]>([]);
  readonly nonTargets = signal<NonTargetsData | null>(null);
  readonly error = signal(false);

  // Brazil's files are only downloaded when the Brazil map is used.
  readonly brazil = signal<BrazilTopology | null>(null);
  readonly states = signal<BrazilState[]>([]);
  readonly regions = signal<BrazilRegion[]>([]);

  private readonly placesById = computed(
    () =>
      new Map<string, Country | Territory>(
        [...this.countries(), ...this.territories()].map((p) => [p.id, p]),
      ),
  );

  private loading?: Promise<void>;

  loadWorld(): Promise<void> {
    this.loading ??= Promise.all([
      getJson<WorldTopology>('data/world.topo.json'),
      getJson<Country[]>('data/countries.json'),
      getJson<Territory[]>('data/territories.json'),
      getJson<NonTargetsData>('data/non-targets.json'),
    ])
      .then(([world, countries, territories, nonTargets]) => {
        this.nonTargets.set(nonTargets);
        this.world.set(world);
        this.countries.set(countries);
        this.territories.set(territories);
      })
      .catch(() => {
        this.error.set(true);
        this.loading = undefined;
      });
    return this.loading;
  }

  private loadingBrazil?: Promise<void>;

  loadBrazil(): Promise<void> {
    this.loadingBrazil ??= Promise.all([
      getJson<BrazilTopology>('data/brazil.topo.json'),
      getJson<BrazilState[]>('data/states.json'),
      getJson<BrazilRegion[]>('data/regions-br.json'),
    ])
      .then(([brazil, states, regions]) => {
        this.brazil.set(brazil);
        this.states.set(states);
        this.regions.set(regions);
      })
      .catch(() => {
        this.error.set(true);
        this.loadingBrazil = undefined;
      });
    return this.loadingBrazil;
  }

  place(id: string): Country | Territory | undefined {
    return this.placesById().get(id);
  }

  region(id: string): BrazilRegion | undefined {
    return this.regions().find((region) => region.id === id);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return (await response.json()) as T;
}

export function isTerritory(place: Place): place is Territory {
  return 'administeredBy' in place;
}

export function isState(place: Place): place is BrazilState {
  return 'ibgeCode' in place;
}
