import { TestBed } from '@angular/core/testing';
import countriesJson from '../../../../public/data/countries.json';
import territoriesJson from '../../../../public/data/territories.json';
import { Country, Territory } from '../../core/data/geo-data.models';
import { InfoBoxComponent } from './info-box.component';

const place = (id: string) =>
  [...(countriesJson as unknown as Country[]), ...(territoriesJson as unknown as Territory[])].find(
    (p) => p.id === id,
  ) as Country | Territory;

function card(id: string, note = ''): string {
  const fixture = TestBed.createComponent(InfoBoxComponent);
  fixture.componentRef.setInput('place', place(id));
  fixture.componentRef.setInput('note', note);
  fixture.detectChanges();
  return fixture.nativeElement.textContent as string;
}

describe('info card notes', () => {
  it('keeps the note about being a target when the card does not say it is not asked', () => {
    const text = card('ATA');
    expect(text).toContain('Não é administrada por nenhum país.');
    expect(text).toContain('só é alvo com territórios ligados');
  });

  it('the line "not asked in this game" replaces the note about being a target, not the status', () => {
    const text = card('ATA', 'Não é perguntado neste jogo: sem capital');
    expect(text).toContain('Não é perguntado neste jogo: sem capital');
    expect(text).toContain('Não é administrada por nenhum país.');
    expect(text).not.toContain('só é alvo com territórios ligados');
  });

  it('notes about other subjects stay', () => {
    expect(card('TWN', 'Não é perguntado neste jogo')).toContain(
      'reconhecimento como país é contestado',
    );
    expect(card('ISR', 'Não é perguntado neste jogo')).toContain('Jerusalém');
  });
});
