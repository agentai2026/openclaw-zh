import {
  createModelCatalogPresetAppliers,
  type OpenClawConfig,
} from "openclaw/plugin-sdk/provider-onboard";
import { buildShengsuanyunProvider, SHENGSUANYUN_BASE_URL } from "./provider-catalog.js";

export const SHENGSUANYUN_DEFAULT_MODEL_REF = "shengsuanyun/openai/gpt-4.1-nano";

const shengsuanyunPresetAppliers = createModelCatalogPresetAppliers({
  primaryModelRef: SHENGSUANYUN_DEFAULT_MODEL_REF,
  resolveParams: (_cfg: OpenClawConfig) => ({
    providerId: "shengsuanyun",
    api: "openai-completions" as const,
    baseUrl: SHENGSUANYUN_BASE_URL,
    catalogModels: buildShengsuanyunProvider().models,
    aliases: [{ modelRef: SHENGSUANYUN_DEFAULT_MODEL_REF, alias: "胜算云" }],
  }),
});

export function applyShengsuanyunProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  return shengsuanyunPresetAppliers.applyProviderConfig(cfg);
}

export function applyShengsuanyunConfig(cfg: OpenClawConfig): OpenClawConfig {
  return shengsuanyunPresetAppliers.applyConfig(cfg);
}
