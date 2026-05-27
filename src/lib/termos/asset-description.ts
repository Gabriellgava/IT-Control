const TRAILING_ASSET_CODE_REGEX = /\s+[A-Z]{2,}\d{2,}\s*$/

/**
 * Remove códigos de inventário no final da descrição do ativo.
 * Exemplos: "Headset netuno Pichau HE001" -> "Headset netuno Pichau".
 */
export function cleanAssetDescription(input: string): string {
  return input.replace(TRAILING_ASSET_CODE_REGEX, '').trim()
}
