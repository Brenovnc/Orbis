import { StringKey } from '../../core/i18n/strings';

/**
 * Geography skills of the BNCC (Base Nacional Comum Curricular) that the games exercise.
 * Codes and texts copied word for word from the official MEC document (BNCC, Educação Infantil
 * e Ensino Fundamental, versão final de 2018), so they stay in Portuguese in both languages.
 * Which part of each skill the games touch is the project's own reading, in `relation`.
 */
export interface BnccSkill {
  code: string;
  text: string;
  /** Interface text explaining how Orbis relates to the skill. */
  relation: StringKey;
}

export const BNCC_SKILLS: readonly BnccSkill[] = [
  {
    code: 'EF04GE05',
    text: 'Distinguir unidades político-administrativas oficiais nacionais (Distrito, Município, Unidade da Federação e grande região), suas fronteiras e sua hierarquia, localizando seus lugares de vivência.',
    relation: 'about.bncc.EF04GE05',
  },
  {
    code: 'EF09GE15',
    text: 'Comparar e classificar diferentes regiões do mundo com base em informações populacionais, econômicas e socioambientais representadas em mapas temáticos e com diferentes projeções cartográficas.',
    relation: 'about.bncc.EF09GE15',
  },
];
