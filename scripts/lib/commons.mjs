import { cachedFetch } from './fetch.mjs';

// Licenses that allow redistribution in this project. Anything else stops the build.
const ALLOWED = /^(public domain|pd|cc0|cc[ -]by(-sa)?[ -]\d(\.\d)?)/i;

const stripHtml = (s) =>
  (s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Downloads a file from Wikimedia Commons after checking its license in the file's metadata.
 * Returns the file contents plus the license info that goes into the attribution file.
 */
export async function downloadCommonsFile(fileName) {
  const api =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=url|extmetadata&titles=' +
    encodeURIComponent('File:' + fileName);
  const json = await cachedFetch(api);
  const page = Object.values(json.query.pages)[0];
  const info = page.imageinfo?.[0];
  if (!info) throw new Error(`Arquivo não encontrado no Commons: ${fileName}`);

  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  if (!ALLOWED.test(license)) {
    throw new Error(`Licença não permitida para ${fileName}: "${license}"`);
  }

  const content = await cachedFetch(info.url, { as: 'buffer' });
  return {
    content,
    attribution: {
      file: fileName,
      source: info.descriptionurl,
      license,
      licenseUrl: stripHtml(meta.LicenseUrl?.value) || undefined,
      author: stripHtml(meta.Artist?.value) || undefined,
    },
  };
}
