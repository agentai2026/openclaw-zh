import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";
import { applyShengsuanyunConfig, SHENGSUANYUN_DEFAULT_MODEL_REF } from "./onboard.js";
import { buildShengsuanyunProvider } from "./provider-catalog.js";

const PROVIDER_ID = "shengsuanyun";

export default defineSingleProviderPluginEntry({
  id: PROVIDER_ID,
  name: "ShengSuanYun Provider",
  description: "胜算云 API 聚合平台 provider plugin",
  provider: {
    label: "胜算云",
    docsPath: "/providers/shengsuanyun",
    auth: [
      {
        methodId: "api-key",
        label: "胜算云 API 密钥",
        hint: "国内 API 聚合平台 - shengsuanyun.com",
        optionKey: "shengsuanyunApiKey",
        flagName: "--shengsuanyun-api-key",
        envVar: "SHENGSUANYUN_API_KEY",
        promptMessage: "输入胜算云 API 密钥",
        defaultModel: SHENGSUANYUN_DEFAULT_MODEL_REF,
        applyConfig: (cfg) => applyShengsuanyunConfig(cfg),
        wizard: {
          groupLabel: "胜算云",
          groupHint: "国内 API 聚合平台 (DeepSeek/GPT/Claude)",
        },
      },
    ],
    catalog: {
      buildProvider: buildShengsuanyunProvider,
    },
  },
});
